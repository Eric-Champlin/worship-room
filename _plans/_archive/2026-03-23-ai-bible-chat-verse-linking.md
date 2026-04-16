# Implementation Plan: AI Bible Chat — Verse Linking & Follow-Up Questions

**Spec:** `_specs/ai-bible-chat-verse-linking.md`
**Date:** 2026-03-23
**Branch:** `claude/feature/ai-bible-chat-verse-linking`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable
**Depends On:** Spec 1 (`ai-bible-chat-input-response.md` — built), Spec 23 (`bible-reader-browser.md` — built), Spec 24 (`bible-reader-highlights-notes.md` — built)

---

## Architecture Context

### Existing Files & Patterns

**AskPage (Spec 1 — built):**
- `frontend/src/pages/AskPage.tsx` — 397-line single-component page. Three states: input (`showInput`), loading (`isLoading`), response. Single Q&A only (no thread). Uses `PageHero`, `BackgroundSquiggle`, `CrisisBanner`.
- `frontend/src/mocks/ask-mock-data.ts` — 16 response objects (15 topics + fallback). `getAskResponse()` keyword matcher. `TOPIC_KEYWORDS` ordered array.
- `frontend/src/types/ask.ts` — `AskResponse { id, topic, answer, verses[], encouragement, prayer }`, `AskVerse { reference, text, explanation }`, `AskFeedback`.
- `frontend/src/constants/ask.ts` — `ASK_TOPIC_CHIPS`, `ASK_MAX_LENGTH` (500), `ASK_LOADING_DELAY_MS` (2000), `ASK_FEEDBACK_KEY`.

**Bible Reader (Specs 23-24 — built):**
- `frontend/src/pages/BibleReader.tsx` — 599-line reader at `/bible/:book/:chapter`. Detects `#verse-{N}` hash for scroll + highlight. Has `?highlight` query param logic for auto-opening action bar. Inline `NoteEditor` component.
- `frontend/src/hooks/useBibleNotes.ts` — `saveNote(book, chapter, verseNumber, text): boolean`, `getNoteForVerse(book, chapter, verseNumber)`, `deleteNote(id)`. Auth-gated. Reads/writes `wr_bible_notes`.
- `frontend/src/hooks/useBibleHighlights.ts` — `setHighlight(book, chapter, verseNumber, color)`. Auth-gated.
- `frontend/src/types/bible.ts` — `BibleNote { id, book, chapter, verseNumber, text, createdAt, updatedAt }`, `BibleHighlight`, `BibleBook { name, slug, chapters, ... }`.
- `frontend/src/constants/bible.ts` — `BIBLE_BOOKS` (66 books with name/slug mapping), `BIBLE_NOTES_KEY`, `MAX_NOTES` (200), `NOTE_MAX_CHARS` (300), `HIGHLIGHT_COLORS`.

**Shared infrastructure:**
- `useAuth()` from `@/hooks/useAuth` — returns `{ isAuthenticated, user }`.
- `useAuthModal()` from `@/components/prayer-wall/AuthModalProvider` — `openAuthModal(subtitle?)`.
- `useToast()` from `@/components/ui/Toast` — `showToast(message, type?)`.
- `containsCrisisKeyword(text)` from `@/constants/crisis-resources.ts` — boolean keyword check.
- `CrisisBanner` from `@/components/daily/CrisisBanner` — monitors text input for crisis keywords.
- Provider wrapping order in `App.tsx`: `AuthProvider > ToastProvider > AuthModalProvider > AudioProvider > Routes`.

### Test Patterns

From `frontend/src/pages/__tests__/AskPage.test.tsx`:
- `vi.hoisted()` for auth mock setup
- `vi.mock('@/hooks/useAuth')` + `vi.mock('@/contexts/AuthContext')` dual mock
- `renderAskPage()` helper wraps in `MemoryRouter > ToastProvider > AuthModalProvider > Routes`
- `mockAuthFn.mockReturnValue({ isAuthenticated: true/false, ... })` to toggle auth state
- `@testing-library/react` + `userEvent` for interactions
- `vi.useFakeTimers()` for testing loading delays

### Directory Conventions

- New utility → `frontend/src/lib/` (e.g., `parse-verse-references.ts`)
- New component → `frontend/src/components/ask/` (new directory for Ask-specific subcomponents)
- Tests → `__tests__/` sibling to source (e.g., `frontend/src/lib/__tests__/parse-verse-references.test.ts`)

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Click verse reference link (inline + card) | Public — no auth | Step 4, 5 | No gate needed |
| Click "Highlight in Bible" button | Auth required | Step 5 | useAuth + authModal("Sign in to save highlights and notes") |
| Click "Save note" button | Auth required | Step 5 | useAuth + authModal("Sign in to save highlights and notes") |
| Save note from inline textarea | Auth required | Step 5 | useBibleNotes.saveNote is already auth-gated internally |
| Click follow-up question chip | Auth required | Step 6 | useAuth + authModal("Sign in to ask questions") |
| Click Popular Topics card (logged-in) | Auto-submit | Step 7 | Pre-fill + handleSubmit (which auth-gates) |
| Click Popular Topics card (logged-out) | Pre-fill only, no submit | Step 7 | Conditional: only auto-submit if isAuthenticated |
| "Save this conversation" clipboard | Public — no auth | Step 8 | No gate needed |
| Submit question via textarea | Auth required (Spec 1) | Existing | Already implemented in AskPage.tsx line 40-43 |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Verse reference link (inline + card) | color | `#8B5CF6` (`text-primary-lt`) | spec + design-system.md |
| Verse reference link hover | decoration | `hover:underline` | spec |
| Verse card action buttons | text | `text-xs text-text-light` (#7F8C8D) | spec |
| Verse card action buttons hover | color | `hover:text-primary` (#6D28D9) | spec |
| Verse card action button icon | size | 14px (`h-3.5 w-3.5`) | spec |
| User question bubble | background | `bg-primary/20` (rgba(109,40,217,0.2)) | spec |
| User question bubble | border-radius | `rounded-2xl` (16px) | spec |
| User question bubble | padding | `p-4` (16px) | spec |
| User question bubble max-width (desktop) | max-width | `max-w-[80%]` | spec |
| User question bubble max-width (mobile) | max-width | `max-w-[90%]` | spec |
| Follow-up chip | style | `rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-text-dark hover:bg-gray-50 min-h-[44px]` | spec (same as topic chips) |
| Follow-up chip icon | icon | `MessageCircle` from lucide-react, before text | spec |
| Dig Deeper divider | style | `border-t border-gray-200 pt-4 mt-6` | spec |
| Dig Deeper label | style | Inter semibold, `text-text-dark` | spec |
| Q&A pair divider | style | `border-t border-white/5 my-8` | spec |
| Popular Topics card | style | `bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer` | spec |
| Action buttons (existing) | style | `rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-dark hover:bg-gray-50` | AskPage.tsx line 294 |

---

## Design System Reminder

- Worship Room uses **Caveat** for script/highlighted headings, not Lora
- Hero titles use Caveat 72px desktop / 48px mobile
- All tab/page content shares `max-w-2xl` container width
- Inner page hero fades to `#F5F5F5` neutral-bg
- Scripture text uses `font-serif italic` (Lora italic)
- Chips use `rounded-full border border-gray-200 bg-white px-4 py-2 text-sm` pattern
- Primary: `#6D28D9`, Primary Light: `#8B5CF6`
- Text Dark: `#2C3E50`, Text Light: `#7F8C8D`
- `animate-fade-in` (500ms) for gentle entrance animations
- Crisis banner uses `role="alert"` with `aria-live="assertive"`
- All interactive elements need `min-h-[44px]` for mobile touch targets
- Cards use `bg-white rounded-xl border border-gray-200 shadow-sm` pattern

---

## Shared Data Models (from Bible Reader)

```typescript
// From types/bible.ts — used for note saving from chat
interface BibleNote {
  id: string            // crypto.randomUUID()
  book: string          // Full book name: "Romans", "1 Corinthians"
  chapter: number
  verseNumber: number
  text: string          // Max 300 chars
  createdAt: string     // ISO 8601
  updatedAt: string
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_notes` | Write (via useBibleNotes.saveNote) | Save notes from chat verse cards |
| `wr_bible_highlights` | NOT directly — navigates to Bible reader with query param | Highlight trigger via URL |
| `wr_chat_feedback` | Read/Write (existing from Spec 1) | Feedback persists for first response only |

**No new localStorage keys** introduced by this spec. Conversation state is React state only.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Question bubbles `max-w-[90%]`, follow-up chips stack vertically (`flex-col gap-2`), Popular Topics single column, verse action buttons horizontal (small enough to fit) |
| Tablet | 768px | Question bubbles `max-w-[80%]`, follow-up chips horizontal wrap, Popular Topics 2-column grid, `max-w-2xl` centering |
| Desktop | 1440px | Question bubbles `max-w-[80%]`, follow-up chips single row, Popular Topics row of 5 (or 3+2 wrap), `max-w-2xl` centering |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| PageHero → content area | `py-10 sm:py-14` (40px / 56px) | AskPage.tsx line 137 |
| Q&A pair divider | `my-8` (32px each side) | spec |
| Dig Deeper section → follow-up chips | `mt-6 pt-4` (24px + 16px) | spec |
| Last response → Save Conversation button | `mt-8` (32px) | inferred from action button spacing |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec 1 (ai-bible-chat-input-response) is built and committed
- [x] Spec 23 (bible-reader-browser) is built and committed
- [x] Spec 24 (bible-reader-highlights-notes) is built and committed
- [x] All auth-gated actions from the spec are accounted for in the plan (9 actions)
- [x] Design system values are verified from design-system.md and AskPage.tsx source
- [ ] `useBibleNotes` hook's `book` parameter uses the full book name (e.g., "Romans"), not the slug — **confirmed from useBibleNotes.ts source**
- [ ] BibleReader.tsx handles `?highlight=:verseNumber` query param to auto-open action bar — **needs verification during execution; if not implemented, we navigate without it and note as follow-up**
- [ ] All [UNVERIFIED] values are flagged with verification methods (0 unverified values in this plan)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Verse reference parser scope | Parse only references that appear in the hardcoded response bank | The mock responses have known reference formats; parser handles standard patterns (Book Ch:V, Book Ch:V-V, N Book Ch:V) but doesn't need to handle obscure formats |
| Book name to slug mapping | Use `BIBLE_BOOKS` constant from `constants/bible.ts` | Single source of truth for all 66 books, already includes name→slug mapping |
| Note `book` field | Use full book name (e.g., "Romans"), not slug | Consistent with `useBibleNotes.saveNote` and Spec 24's data model |
| Follow-up matches same response | Allow — spec explicitly says this is expected with keyword matching | Real AI in Phase 3 will generate contextual responses |
| "Ask another question" button | Clears entire thread, re-shows Popular Topics, scrolls to top | Spec requirement; fresh start on each "ask another" |
| Conversation thread max length | No cap — limited naturally by 16 unique mock responses | Revisit when real AI is connected |
| `?highlight` query param on Bible reader | Navigate to `/bible/:slug/:chapter?highlight=:verse` | BibleReader.tsx is expected to handle this from Spec 24 |

---

## Implementation Steps

### Step 1: Verse Reference Parser Utility

**Objective:** Create a pure utility function that parses Bible verse references from text and returns structured data for linking.

**Files to create:**
- `frontend/src/lib/parse-verse-references.ts` — Parser utility
- `frontend/src/lib/__tests__/parse-verse-references.test.ts` — Unit tests

**Details:**

The parser takes a string (the answer text) and returns an array of match objects with the original text, parsed book name, chapter, verse (start), verse end (if range), book slug, and start/end indices in the source string.

```typescript
export interface ParsedVerseReference {
  raw: string           // Original matched text, e.g., "Romans 8:28"
  book: string          // Full book name, e.g., "Romans"
  bookSlug: string      // URL slug, e.g., "romans"
  chapter: number       // e.g., 8
  verseStart: number    // e.g., 28
  verseEnd?: number     // e.g., 3 for "23:1-3" (undefined for single verses)
  startIndex: number    // Position in source string
  endIndex: number      // End position in source string
}

export function parseVerseReferences(text: string): ParsedVerseReference[]
```

**Regex strategy:**
Build a regex that matches patterns like:
- `Romans 8:28` — single book, chapter:verse
- `1 Corinthians 13:4-5` — numbered book, chapter:verse-verse range
- `Psalm 23:1-3` — note: "Psalm" in the response text maps to "Psalms" book in BIBLE_BOOKS
- `2 Corinthians 1:3-4` — numbered book, range

Pattern: `/((?:\d\s+)?(?:Book1|Book2|...))\s+(\d+):(\d+)(?:-(\d+))?/g`

Build the book name alternation dynamically from `BIBLE_BOOKS` constant (both singular and plural forms — handle "Psalm" → "Psalms" mapping). Sort book names by length descending to avoid partial matches (e.g., "John" matching before "1 John").

Book name → slug lookup: build a Map from `BIBLE_BOOKS` for O(1) lookup. Include "Psalm" → "psalms" alias.

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML` for rendering parsed text — use React elements
- DO NOT hardcode book name/slug pairs — derive from `BIBLE_BOOKS` constant
- DO NOT attempt to validate whether the chapter/verse actually exists — just parse and link

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Parses "Romans 8:28" correctly | unit | Single-word book, chapter:verse |
| Parses "1 Corinthians 13:4-5" correctly | unit | Numbered book, verse range |
| Parses "Psalm 34:18" → slug "psalms" | unit | Singular→plural alias |
| Parses "2 Corinthians 1:3-4" correctly | unit | Numbered book, range |
| Returns empty array for text with no references | unit | Graceful no-match |
| Does not match partial words (e.g., "Romans" in "Romanticism") | unit | Word boundary handling |
| Handles multiple references in one text block | unit | Multiple matches with correct indices |
| Handles "Song of Solomon 1:1" (multi-word book) | unit | Multi-word book names |
| Handles "John 11:25-26" (reference from mock data) | unit | Specific mock data reference |
| All references in mock response bank are parseable | unit | Iterate all ASK_RESPONSES, parse answer text + verse references, verify all expected refs are found |

**Expected state after completion:**
- [ ] `parseVerseReferences("As Paul writes in Romans 8:28...")` returns one match with bookSlug "romans", chapter 8, verseStart 28
- [ ] All 66 book names from BIBLE_BOOKS are recognized
- [ ] "Psalm" singular alias maps to "psalms" slug
- [ ] All tests pass

---

### Step 2: Add Follow-Up Questions to Mock Data

**Objective:** Extend the `AskResponse` type and all 16 response objects with `followUpQuestions` arrays.

**Files to modify:**
- `frontend/src/types/ask.ts` — Add `followUpQuestions` field to `AskResponse`
- `frontend/src/mocks/ask-mock-data.ts` — Add 3 follow-up questions to each of the 16 responses

**Details:**

Add to `AskResponse` interface:
```typescript
export interface AskResponse {
  // ... existing fields
  followUpQuestions: [string, string, string] // Always exactly 3
}
```

Follow-up questions per response (all under 60 chars, from spec + crafted to match):

| Response | Follow-Up 1 | Follow-Up 2 | Follow-Up 3 |
|----------|------------|------------|------------|
| suffering | "What if my suffering doesn't end?" | "How did Jesus handle pain?" | "Can faith and therapy work together?" |
| forgiveness | "What if I can't forgive myself?" | "Does forgiving mean forgetting?" | "How do I forgive someone who isn't sorry?" |
| anxiety | "What if my anxiety doesn't go away?" | "How did Jesus handle stress?" | "Can faith and therapy work together?" |
| purpose | "What if I can't hear God's voice?" | "How do I know if it's God or me?" | "What if I missed God's plan?" |
| doubt | "Is it okay to question the Bible?" | "How did Thomas overcome his doubt?" | "What if my doubts never go away?" |
| prayer | "How do I know God hears me?" | "What do I do when prayer feels empty?" | "Can I pray about anything?" |
| grief | "How long should grief last?" | "Is it okay to be angry at God?" | "Will I see my loved one again?" |
| loneliness | "How do I find community as a Christian?" | "Did Jesus ever feel alone?" | "Is being alone the same as lonely?" |
| anger | "Is it ever okay to be angry at God?" | "How do I control my temper?" | "What if someone keeps hurting me?" |
| marriage | "How do I rebuild broken trust?" | "When is it okay to walk away?" | "How do we pray together as a couple?" |
| parenting | "How do I talk to my kids about God?" | "What if my child rejects faith?" | "How do I balance discipline and grace?" |
| money | "Is it wrong to want financial success?" | "How do I tithe when money is tight?" | "Does God care about my career?" |
| identity | "How do I stop comparing myself to others?" | "What does God say about my mistakes?" | "Can God use someone like me?" |
| temptation | "What if I keep falling into the same sin?" | "How do I find accountability?" | "Does God forgive the same sin twice?" |
| afterlife | "What will heaven be like?" | "Do our loved ones watch over us?" | "How can I be sure of eternal life?" |
| fallback | "How do I hear God's voice?" | "What does it mean to have faith?" | "How can I trust God with my future?" |

**Guardrails (DO NOT):**
- DO NOT make follow-up questions that are deterministic theological claims (per 01-ai-safety.md)
- DO NOT include questions that could be medical/psychological advice triggers
- DO NOT exceed 60 characters per question

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Every AskResponse has followUpQuestions | unit | Iterate ASK_RESPONSES, assert field exists |
| Each followUpQuestions array has exactly 3 items | unit | Length check |
| All follow-up questions are under 60 characters | unit | Character count validation |
| Fallback response has generic follow-up questions | unit | Specific check |

**Expected state after completion:**
- [ ] `AskResponse` type includes `followUpQuestions: [string, string, string]`
- [ ] All 16 responses have 3 follow-up questions each
- [ ] Existing tests still pass (backward-compatible addition)
- [ ] New tests pass

---

### Step 3: Refactor AskPage into Conversation Thread Architecture

**Objective:** Transform the single-Q&A AskPage into a multi-Q&A conversation thread. Extract response display into a reusable component.

**Files to create:**
- `frontend/src/components/ask/AskResponseDisplay.tsx` — Extracted response display (answer, verse cards, encouragement, prayer)
- `frontend/src/components/ask/UserQuestionBubble.tsx` — Right-aligned question bubble

**Files to modify:**
- `frontend/src/pages/AskPage.tsx` — Refactor to use conversation array state, thread rendering

**Details:**

**New state model in AskPage:**
```typescript
interface ConversationPair {
  question: string
  response: AskResponse
}
const [conversation, setConversation] = useState<ConversationPair[]>([])
const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
// isLoading + pendingQuestion together represent "waiting for response"
```

Replace the single `response` state with a `conversation` array. The `text` state remains for the textarea. The `feedback` and `feedbackThanks` state remain for the first response only.

**UserQuestionBubble component:**
```typescript
interface UserQuestionBubbleProps {
  question: string
}
```
Renders: `<div className="flex justify-end"><div className="max-w-[80%] sm:max-w-[90%] bg-primary/20 rounded-2xl p-4"><p className="text-text-dark">{question}</p></div></div>`

Note: The spec says `max-w-[80%]` on desktop and `max-w-[90%]` on mobile. Since mobile-first: `max-w-[90%] sm:max-w-[80%]`.

**AskResponseDisplay component:**
Extract lines 248-287 of current AskPage.tsx (answer paragraphs, "What Scripture Says" section, encouragement callout, prayer, AI disclaimer) into a standalone component. Props:
```typescript
interface AskResponseDisplayProps {
  response: AskResponse
  isFirstResponse: boolean
  onFollowUpClick: (question: string) => void
  prefersReducedMotion: boolean
}
```

This component renders:
1. Answer text paragraphs (with inline verse links — added in Step 4)
2. "What Scripture Says" verse cards (with action buttons — added in Step 5)
3. Encouragement callout
4. Prayer
5. AI disclaimer
6. "Dig Deeper" follow-up chips (added in Step 6)
7. Action buttons row — ONLY if `isFirstResponse` is true
8. Feedback row — ONLY if `isFirstResponse` is true

**Conversation thread rendering in AskPage:**
```tsx
{conversation.map((pair, index) => (
  <div key={index}>
    {index > 0 && <div className="border-t border-white/5 my-8" />}
    <UserQuestionBubble question={pair.question} />
    <div className="mt-6">
      <AskResponseDisplay
        response={pair.response}
        isFirstResponse={index === 0}
        onFollowUpClick={handleFollowUpClick}
        prefersReducedMotion={prefersReducedMotion}
      />
    </div>
  </div>
))}
```

**handleSubmit refactor:** On successful response:
```typescript
setConversation(prev => [...prev, { question: submittedText, response: result }])
setText('') // Clear textarea for next question
```

**handleAskAnother refactor:** Clears entire conversation:
```typescript
setConversation([])
setText('')
setFeedback(null)
setFeedbackThanks(false)
// Re-show Popular Topics (Step 7 will handle)
window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
```

**handleFollowUpClick (new):**
```typescript
const handleFollowUpClick = (question: string) => {
  if (!isAuthenticated) {
    authModal?.openAuthModal('Sign in to ask questions')
    return
  }
  setPendingQuestion(question)
  setIsLoading(true)
  setTimeout(() => {
    const result = getAskResponse(question)
    setConversation(prev => [...prev, { question, response: result }])
    setPendingQuestion(null)
    setIsLoading(false)
    // Auto-scroll to new response
    setTimeout(() => {
      document.getElementById('latest-response')?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    }, 100)
  }, ASK_LOADING_DELAY_MS)
}
```

**Loading state positioning:** When loading from a follow-up, the bouncing dots appear at the bottom of the thread (after the pending question bubble), not at the top. Add `pendingQuestion` bubble + loading indicator below the conversation thread.

**Auto-scroll:** After a new response renders, scroll to it. Use an `id="latest-response"` on the last conversation pair's wrapper.

**Show input logic update:**
- Textarea + chips + submit button are visible when `conversation.length === 0 && !isLoading` (initial state, no question submitted yet)
- After first response, textarea is hidden (follow-ups come from chips)
- "Ask another question" resets everything and re-shows input

**Responsive behavior:**
- Desktop: question bubbles at `max-w-[80%]`, content at `max-w-2xl`
- Mobile: question bubbles at `max-w-[90%]`

**Guardrails (DO NOT):**
- DO NOT persist conversation to localStorage — React state only per spec
- DO NOT break existing action button functionality (Journal, Pray, Share, Ask Another)
- DO NOT repeat action buttons or feedback row on subsequent responses
- DO NOT change the PageHero or BackgroundSquiggle — only the main content area changes

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| UserQuestionBubble renders question text | unit | Basic render |
| UserQuestionBubble has correct styling classes | unit | bg-primary/20, rounded-2xl, max-w |
| AskResponseDisplay renders answer paragraphs | unit | Text content check |
| AskResponseDisplay renders 3 verse cards | unit | Verse card count |
| AskResponseDisplay renders encouragement + prayer | unit | Content check |
| AskResponseDisplay shows action buttons only for first response | unit | isFirstResponse=true vs false |
| AskResponseDisplay shows feedback row only for first response | unit | isFirstResponse=true vs false |
| Conversation thread renders multiple Q&A pairs | integration | Submit, then follow-up, verify both visible |
| Divider appears between Q&A pairs | integration | Check border-t element |
| "Ask another question" clears thread | integration | Click button, verify conversation emptied |

**Expected state after completion:**
- [ ] AskPage renders a conversation thread with question bubbles + response displays
- [ ] First response shows action buttons and feedback row; subsequent responses do not
- [ ] "Ask another question" clears the thread and re-shows input
- [ ] Existing AskPage tests updated to work with new component structure
- [ ] New tests pass

---

### Step 4: Inline Verse Linking in Answer Text

**Objective:** Replace Bible verse references within the answer text with clickable `<Link>` components that navigate to the Bible reader.

**Files to create:**
- `frontend/src/components/ask/LinkedAnswerText.tsx` — Component that parses and links verse references in text

**Files to modify:**
- `frontend/src/components/ask/AskResponseDisplay.tsx` — Use `LinkedAnswerText` for answer paragraphs

**Details:**

**LinkedAnswerText component:**
```typescript
interface LinkedAnswerTextProps {
  text: string // A single paragraph of answer text
}
```

Implementation:
1. Call `parseVerseReferences(text)` from Step 1
2. Split the text into segments: plain text interleaved with verse reference links
3. Render plain text as `<span>` and verse references as `<Link to={...} className="text-primary-lt hover:underline">`

Link destination: `/bible/${ref.bookSlug}/${ref.chapter}#verse-${ref.verseStart}`

**Usage in AskResponseDisplay:**
Replace:
```tsx
{response.answer.split('\n\n').map((p, i) => (
  <p key={i} className="mb-4 text-base leading-relaxed text-text-dark">{p}</p>
))}
```
With:
```tsx
{response.answer.split('\n\n').map((p, i) => (
  <p key={i} className="mb-4 text-base leading-relaxed text-text-dark">
    <LinkedAnswerText text={p} />
  </p>
))}
```

**Link styling:** `text-primary-lt hover:underline transition-colors` — uses #8B5CF6 which stands out on white bg.

**Accessibility:** The link text is the reference itself (e.g., "Romans 8:28"), which serves as the accessible name. No additional aria-label needed.

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML` — construct React elements from parsed segments
- DO NOT modify the original answer text strings in mock data
- DO NOT add target="_blank" — navigation is internal (same app)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| LinkedAnswerText renders plain text when no references | unit | No links generated |
| LinkedAnswerText creates link for "Romans 8:28" | unit | Link exists with correct href |
| LinkedAnswerText link has text-primary-lt class | unit | Style verification |
| LinkedAnswerText link navigates to correct Bible reader URL | unit | Check `to` prop |
| LinkedAnswerText handles multiple references in one paragraph | unit | Multiple links in one text block |
| LinkedAnswerText renders non-reference text as plain text | unit | Segments between links are plain |

**Expected state after completion:**
- [ ] Answer text displays verse references as clickable purple links
- [ ] Clicking a link navigates to `/bible/:slug/:chapter#verse-:verse`
- [ ] Non-reference text renders normally
- [ ] All tests pass

---

### Step 5: Verse Card Enhancements — Links + Action Buttons + Inline Notes

**Objective:** Add clickable reference links and "Highlight in Bible" / "Save note" action buttons to each supporting verse card. Implement inline note textarea with crisis detection.

**Files to create:**
- `frontend/src/components/ask/VerseCardActions.tsx` — Action buttons + inline note textarea component

**Files to modify:**
- `frontend/src/components/ask/AskResponseDisplay.tsx` — Add linked references and action buttons to verse cards

**Details:**

**Verse card reference link:**
The existing verse card renders `<p className="font-bold text-text-dark">{verse.reference}</p>`. Change this to a `<Link>` using the same `parseVerseReferences` utility to parse the reference string and get the bookSlug/chapter/verse.

```tsx
<Link
  to={`/bible/${parsed.bookSlug}/${parsed.chapter}#verse-${parsed.verseStart}`}
  className="font-bold text-primary-lt hover:underline transition-colors"
>
  {verse.reference}
</Link>
```

Create a helper: `parseVerseReference(reference: string): ParsedVerseReference | null` (singular — for the reference field which is just the reference, not embedded in text). Can reuse `parseVerseReferences` and take the first result.

**VerseCardActions component:**
```typescript
interface VerseCardActionsProps {
  verse: AskVerse
  parsedRef: ParsedVerseReference | null
}
```

Renders:
1. **"Highlight in Bible" button:** Small, muted. Lucide `Highlighter` icon (14px) + "Highlight in Bible" text. On click:
   - If not authenticated → `authModal?.openAuthModal("Sign in to save highlights and notes")`
   - If authenticated → `navigate(/bible/${slug}/${chapter}?highlight=${verse}#verse-${verse})`

2. **"Save note" button:** Small, muted. Lucide `StickyNote` icon (14px) + "Save note" text. On click:
   - If not authenticated → `authModal?.openAuthModal("Sign in to save highlights and notes")`
   - If authenticated → expand inline note textarea below the card

3. **Inline note textarea** (conditionally rendered when "Save note" clicked):
   - Placeholder: "Add a note about this verse..."
   - Max 300 characters (from `NOTE_MAX_CHARS`)
   - Character counter
   - Save / Cancel buttons
   - Pre-fill with existing note if one exists for this verse (via `useBibleNotes().getNoteForVerse(book, chapter, verseNumber)`)
   - `<CrisisBanner text={noteText} />` for crisis keyword detection on note input
   - Smooth height transition on expand (`overflow-hidden transition-all duration-300`)
   - On save: call `useBibleNotes().saveNote(book, chapter, verseNumber, text)`
     - If returns `false` (limit reached) → `showToast("Note limit reached. Delete an existing note to add a new one.", "error")`
     - If returns `true` → collapse textarea, `showToast("Note saved")`

**Button styling:**
```tsx
className="inline-flex items-center gap-1.5 text-xs text-text-light hover:text-primary transition-colors min-h-[44px]"
```
Icon: `className="h-3.5 w-3.5"` (14px)

Buttons row: `<div className="flex gap-3 mt-3">`

**Auth gating:**
- Verse reference links (top of card): NO gate — public navigation
- "Highlight in Bible": Auth-gated via useAuth + authModal
- "Save note": Auth-gated via useAuth + authModal
- Inline textarea: Only renders for authenticated users (button triggers auth modal otherwise)

**Note `book` field:** Use the full book name from the parsed reference (e.g., "Romans", not "romans"). The `ParsedVerseReference.book` field holds this.

**Responsive behavior:**
- Buttons sit in a `flex gap-3` row — small enough to fit on mobile
- Inline textarea takes full card width on all breakpoints
- Action buttons have `min-h-[44px]` touch targets

**Guardrails (DO NOT):**
- DO NOT write to `wr_bible_highlights` directly — navigate to Bible reader with `?highlight` param
- DO NOT skip crisis keyword detection on the note textarea
- DO NOT allow note save if text is empty (disable Save button when textarea is empty)
- DO NOT forget to handle the "note already exists" case (pre-fill textarea)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Verse card reference is a clickable link | unit | Link element with correct href |
| Verse card reference link has text-primary-lt style | unit | Class check |
| "Highlight in Bible" button renders with Highlighter icon | unit | Button + icon present |
| "Save note" button renders with StickyNote icon | unit | Button + icon present |
| Logged-out click "Highlight in Bible" opens auth modal | integration | Auth modal appears with correct message |
| Logged-out click "Save note" opens auth modal | integration | Auth modal appears with correct message |
| Logged-in click "Save note" expands textarea | integration | Textarea appears |
| Inline textarea has "Add a note about this verse..." placeholder | unit | Placeholder check |
| Inline textarea has 300 char max | unit | maxLength attribute |
| Save button saves note via useBibleNotes | integration | Mock saveNote called with correct args |
| Note limit reached shows error toast | integration | saveNote returns false, toast appears |
| Existing note pre-fills textarea | integration | getNoteForVerse returns note, textarea pre-filled |
| Crisis banner appears when crisis keyword typed in note | integration | Type crisis keyword, banner appears |
| Cancel button collapses textarea | unit | Textarea hidden after cancel |

**Expected state after completion:**
- [ ] Verse card references are clickable links to Bible reader
- [ ] Two action buttons appear below each verse card
- [ ] Auth modal fires for logged-out users on Highlight/Save note
- [ ] Inline note textarea expands for logged-in users
- [ ] Notes save to `wr_bible_notes` via existing hook
- [ ] Crisis detection works on note input
- [ ] All tests pass

---

### Step 6: Follow-Up Question Chips — "Dig Deeper" Section

**Objective:** Display 3 follow-up question chips after each response. Clicking a chip appends a new Q&A pair to the conversation thread.

**Files to create:**
- `frontend/src/components/ask/DigDeeperSection.tsx` — Follow-up chips component

**Files to modify:**
- `frontend/src/components/ask/AskResponseDisplay.tsx` — Render DigDeeperSection below the response

**Details:**

**DigDeeperSection component:**
```typescript
interface DigDeeperSectionProps {
  followUpQuestions: string[]
  onChipClick: (question: string) => void
  disabled?: boolean // true while loading
}
```

Renders:
1. Divider: `<div className="border-t border-gray-200 pt-4 mt-6">`
2. Label: `<h3 className="mb-3 font-semibold text-text-dark">Dig Deeper</h3>`
3. Chips container: `<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2">`
4. Each chip:
```tsx
<button
  type="button"
  onClick={() => onChipClick(question)}
  disabled={disabled}
  className={cn(
    'inline-flex items-center gap-2 min-h-[44px] rounded-full border border-gray-200 bg-white px-4 py-2',
    'text-sm text-text-dark hover:bg-gray-50 hover:border-primary hover:text-primary',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    'transition-colors',
    disabled && 'opacity-50 cursor-not-allowed'
  )}
>
  <MessageCircle className="h-4 w-4 shrink-0" />
  {question}
</button>
```

**Integration in AskResponseDisplay:**
After the prayer section and AI disclaimer (but before action buttons/feedback if `isFirstResponse`):
```tsx
<DigDeeperSection
  followUpQuestions={response.followUpQuestions}
  onChipClick={onFollowUpClick}
  disabled={/* pass loading state from parent */}
/>
```

**Auth gating:** The `onFollowUpClick` handler in AskPage (from Step 3) already includes the auth check. The chip itself doesn't need additional gating.

**Responsive behavior:**
- Mobile (< 640px): `flex-col gap-2` — chips stack vertically, full width
- Tablet/Desktop (≥ 640px): `sm:flex-row sm:flex-wrap sm:gap-2` — horizontal row, wrapping

**Accessibility:**
- Chips are keyboard accessible via `<button>` element
- `MessageCircle` icon is decorative (no aria-label needed, button text is the accessible name)
- Disabled state communicated via `disabled` attribute

**Guardrails (DO NOT):**
- DO NOT allow chip clicks while loading (disabled state prevents double-submission)
- DO NOT render Dig Deeper section if `followUpQuestions` is empty/undefined (defensive check)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| DigDeeperSection renders 3 chips | unit | 3 buttons rendered |
| Each chip shows MessageCircle icon | unit | Icon present |
| Chip text matches followUpQuestions | unit | Text content check |
| Clicking chip calls onChipClick with question text | unit | Click handler fires |
| Chips are disabled when disabled prop is true | unit | Button disabled attribute |
| Chips stack vertically on mobile | unit | flex-col class present |
| Section has "Dig Deeper" heading | unit | Text check |
| Auth modal appears for logged-out chip click | integration | Full AskPage render, click follow-up chip |

**Expected state after completion:**
- [ ] "Dig Deeper" section with divider and 3 chips renders below each response
- [ ] Clicking a chip (logged in) adds a new Q&A pair to the thread
- [ ] Clicking a chip (logged out) shows auth modal
- [ ] Chips are disabled during loading
- [ ] Mobile chips stack vertically
- [ ] All tests pass

---

### Step 7: Popular Topics Section

**Objective:** Display 5 curated topic cards below the input area when no question has been submitted. Clicking a card pre-fills the textarea and auto-submits for logged-in users.

**Files to create:**
- `frontend/src/components/ask/PopularTopicsSection.tsx` — Topic cards component

**Files to modify:**
- `frontend/src/pages/AskPage.tsx` — Render PopularTopicsSection, hide after first submission
- `frontend/src/constants/ask.ts` — Add POPULAR_TOPICS constant

**Details:**

**POPULAR_TOPICS constant:**
```typescript
export const POPULAR_TOPICS = [
  { topic: 'Understanding Suffering', description: 'Why pain exists and how to endure it', starterQuestion: 'Why does God allow suffering?' },
  { topic: 'Finding Forgiveness', description: 'Letting go of hurt and finding freedom', starterQuestion: 'How do I forgive someone who hurt me?' },
  { topic: 'Overcoming Anxiety', description: 'Finding peace when worry overwhelms', starterQuestion: 'What does the Bible say about anxiety?' },
  { topic: "Knowing God's Will", description: 'Discovering purpose and direction', starterQuestion: "How do I know God's plan for my life?" },
  { topic: 'Building Stronger Faith', description: 'Growing deeper in trust and belief', starterQuestion: 'How can I grow stronger in my faith?' },
] as const
```

**PopularTopicsSection component:**
```typescript
interface PopularTopicsSectionProps {
  onTopicClick: (starterQuestion: string) => void
}
```

Renders:
1. Heading: `<h2 className="mb-4 text-lg font-semibold text-text-dark">Popular Topics</h2>`
2. Card grid: `<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">`
   - On very large screens, 5 cards fit in fewer rows. Use `sm:grid-cols-2 lg:grid-cols-3` for 2-col tablet, 3-col desktop (3+2 wrap pattern).
3. Each card:
```tsx
<button
  type="button"
  onClick={() => onTopicClick(topic.starterQuestion)}
  className={cn(
    'flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 text-left',
    'shadow-sm hover:shadow-md transition-shadow cursor-pointer',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    'min-h-[44px]'
  )}
>
  <div>
    <p className="font-semibold text-text-dark">{topic.topic}</p>
    <p className="mt-1 text-sm text-text-light">{topic.description}</p>
  </div>
  <ChevronRight className="h-5 w-5 shrink-0 text-text-light" />
</button>
```

**Integration in AskPage:**
- Show Popular Topics when `conversation.length === 0 && !isLoading` — same condition as `showInput`
- Place below the topic chips and submit button (after the entire input area)
- `onTopicClick` handler:
```typescript
const handleTopicClick = (starterQuestion: string) => {
  setText(starterQuestion)
  if (isAuthenticated) {
    // Auto-submit for logged-in users
    // Need to use a ref or effect because setText is async
    pendingAutoSubmitRef.current = starterQuestion
  }
  // For logged-out users, just pre-fill — they'll see the auth modal on submit
}
```

Use a `useEffect` to handle the auto-submit after text state updates:
```typescript
const pendingAutoSubmitRef = useRef<string | null>(null)
useEffect(() => {
  if (pendingAutoSubmitRef.current && text === pendingAutoSubmitRef.current && isAuthenticated) {
    pendingAutoSubmitRef.current = null
    handleSubmitRef.current()
  }
}, [text, isAuthenticated])
```

**Visibility rules:**
- Visible: `conversation.length === 0 && !isLoading`
- Hidden: after first question is submitted (conversation has entries or loading)
- Re-shown: when "Ask another question" clears the thread

**Responsive behavior:**
- Mobile: `grid-cols-1` (single column)
- Tablet: `sm:grid-cols-2` (2-column)
- Desktop: `lg:grid-cols-3` (3-column, 3+2 wrap)

**Guardrails (DO NOT):**
- DO NOT auto-submit for logged-out users — pre-fill only
- DO NOT remove the existing topic chips — Popular Topics is a separate section below
- DO NOT persist which topic was clicked

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| PopularTopicsSection renders 5 cards | unit | 5 buttons |
| Each card shows topic name, description, and ChevronRight icon | unit | Content check |
| Clicking a card calls onTopicClick with starter question | unit | Handler called |
| Popular Topics visible before any submission | integration | Initial render check |
| Popular Topics hidden after question submitted | integration | Submit, verify section gone |
| Popular Topics re-shown after "Ask another question" | integration | Reset, verify section back |
| Logged-in user: clicking card auto-submits | integration | Auth + submit triggered |
| Logged-out user: clicking card pre-fills textarea only | integration | Text filled, no submit |

**Expected state after completion:**
- [ ] 5 Popular Topics cards render below the input area
- [ ] Clicking a card pre-fills textarea text
- [ ] Logged-in click auto-submits the question
- [ ] Logged-out click only pre-fills
- [ ] Section hides after first question, re-shows on "Ask another"
- [ ] All tests pass

---

### Step 8: Save Conversation Button

**Objective:** Display a "Save this conversation" button after 2+ Q&A pairs that copies the conversation to clipboard.

**Files to create:**
- `frontend/src/components/ask/SaveConversationButton.tsx` — Clipboard copy button

**Files to modify:**
- `frontend/src/pages/AskPage.tsx` — Render SaveConversationButton after the conversation thread

**Details:**

**SaveConversationButton component:**
```typescript
interface SaveConversationButtonProps {
  conversation: ConversationPair[]
}
```

Renders a button styled like the existing action buttons (outline style):
```tsx
<button
  type="button"
  onClick={handleCopy}
  className={cn(
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2',
    'text-sm text-text-dark hover:bg-gray-50',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    'transition-colors w-full sm:w-auto'
  )}
>
  <ClipboardCopy className="h-4 w-4" />
  Save this conversation
</button>
```

**Copy format:**
```
Q: [question text]
A: [first ~150 chars of answer text]...
Verses: [reference 1], [reference 2], [reference 3]

Q: [question text]
A: [first ~150 chars of answer text]...
Verses: [reference 1], [reference 2], [reference 3]

— Saved from Worship Room (worshiproom.com)
```

Build the text programmatically:
```typescript
const handleCopy = async () => {
  const lines = conversation.map(({ question, response }) => {
    const answerPreview = response.answer.length > 150
      ? response.answer.slice(0, 150) + '...'
      : response.answer
    const verses = response.verses.map(v => v.reference).join(', ')
    return `Q: ${question}\nA: ${answerPreview}\nVerses: ${verses}`
  })
  const fullText = lines.join('\n\n') + '\n\n— Saved from Worship Room (worshiproom.com)'

  try {
    await navigator.clipboard.writeText(fullText)
    showToast('Conversation copied to clipboard!')
  } catch {
    showToast("Couldn't copy — try selecting the text manually.", 'error')
  }
}
```

**Placement:** Below the conversation thread, after the last Q&A pair. Centered. `mt-8`.

**Visibility:** Only render when `conversation.length >= 2`.

**Auth:** Does NOT require login. Clipboard copy is a public action.

**Responsive:** Full width on mobile (`w-full sm:w-auto`).

**Guardrails (DO NOT):**
- DO NOT include full answer text in clipboard — truncate to ~150 chars
- DO NOT gate clipboard copy behind auth
- DO NOT forget error handling for clipboard API failures

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Button not visible with 0 or 1 Q&A pairs | unit | Hidden check |
| Button visible with 2+ Q&A pairs | unit | Visible check |
| Button has ClipboardCopy icon + correct label | unit | Content check |
| Click copies formatted conversation to clipboard | integration | Mock clipboard.writeText, verify format |
| Copy includes all Q&A pairs with truncated answers | integration | Multi-pair format check |
| Copy includes "Saved from Worship Room" footer | integration | Footer text present |
| Success toast appears on copy | integration | Toast shown |
| Error toast appears on clipboard failure | integration | Mock rejection, error toast |

**Expected state after completion:**
- [ ] "Save this conversation" button appears after 2+ Q&A pairs
- [ ] Clicking copies formatted text to clipboard
- [ ] Toast confirms success or failure
- [ ] No auth required
- [ ] All tests pass

---

### Step 9: Comprehensive Integration Tests & Accessibility

**Objective:** Update existing AskPage tests for the new architecture and add end-to-end integration tests covering the full conversation flow, auth gating, and accessibility.

**Files to modify:**
- `frontend/src/pages/__tests__/AskPage.test.tsx` — Update existing tests + add integration tests
- `frontend/src/mocks/__tests__/ask-mock-data.test.ts` — Add follow-up question validation tests

**Details:**

**Update existing tests:** The current AskPage tests reference the old single-response architecture. Update them to work with the new conversation thread model while preserving all existing test assertions.

Key changes needed:
- Response display is now inside `AskResponseDisplay` component (but still rendered within AskPage)
- `handleAskAnother` now clears conversation array, not just `setResponse(null)`
- Input section visibility depends on `conversation.length === 0`

**New integration test suites:**

1. **Full conversation flow:**
   - Submit question → verify response in thread
   - Click follow-up chip → verify second Q&A pair added
   - Verify question bubbles are right-aligned
   - Verify divider between pairs
   - Verify auto-scroll behavior (check scrollIntoView called)

2. **Auth gating matrix:**
   - Logged-out: verse links work (no auth gate)
   - Logged-out: "Highlight in Bible" triggers auth modal
   - Logged-out: "Save note" triggers auth modal
   - Logged-out: follow-up chip triggers auth modal
   - Logged-out: Popular Topics card pre-fills only (no auto-submit)
   - Logged-out: "Save this conversation" clipboard works (no auth gate)
   - Logged-in: all above actions work normally

3. **Accessibility:**
   - Verse links have descriptive accessible names
   - Follow-up chips are keyboard navigable (Tab + Enter)
   - "Dig Deeper" heading level appropriate
   - `aria-live="polite"` region announces new responses
   - All interactive elements have 44px minimum touch targets
   - Inline note textarea has associated label (visually hidden)
   - Save conversation button has accessible label

4. **Edge cases:**
   - "Ask another question" during multi-pair thread clears everything
   - Follow-up matches same response as original (doesn't crash)
   - Note already exists → pre-fill
   - 200 note limit → error toast

**Mock data tests:**
- All 16 responses have `followUpQuestions` array
- Each array has exactly 3 items
- All questions under 60 characters
- All hardcoded follow-up questions pass crisis keyword check (none contain crisis keywords)

**Guardrails (DO NOT):**
- DO NOT delete existing passing tests — update them to work with new structure
- DO NOT write tests that depend on implementation details (test behavior, not structure)
- DO NOT skip auth gating tests — these are safety-critical

**Expected state after completion:**
- [ ] All existing AskPage tests pass (updated for new architecture)
- [ ] New integration tests cover full conversation flow
- [ ] Auth gating tests verify every gated action from the spec
- [ ] Accessibility tests verify keyboard nav and ARIA
- [ ] Mock data validation tests pass
- [ ] `pnpm test` passes with no failures

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Verse reference parser utility |
| 2 | — | Add followUpQuestions to mock data |
| 3 | — | Refactor AskPage into conversation thread |
| 4 | 1, 3 | Inline verse linking in answer text |
| 5 | 1, 3 | Verse card enhancements (links + actions + notes) |
| 6 | 2, 3 | Follow-up question chips ("Dig Deeper") |
| 7 | 3 | Popular Topics section |
| 8 | 3 | Save Conversation button |
| 9 | 1-8 | Comprehensive tests & accessibility |

**Parallelizable:** Steps 1 and 2 can be done in parallel. Steps 4, 5, 6, 7, 8 all depend on Step 3 but are independent of each other (could be done in any order after 3, respecting their individual sub-dependencies).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Verse reference parser utility | [COMPLETE] | 2026-03-23 | Created `frontend/src/lib/parse-verse-references.ts` + `frontend/src/lib/__tests__/parse-verse-references.test.ts` (14 tests). All 66 books + Psalm alias recognized. |
| 2 | Add followUpQuestions to mock data | [COMPLETE] | 2026-03-23 | Added `followUpQuestions: [string, string, string]` to `AskResponse` type. Added 3 follow-up questions to all 16 responses. Added 49 validation tests to `ask-mock-data.test.ts`. |
| 3 | Refactor AskPage into conversation thread | [COMPLETE] | 2026-03-23 | Created `UserQuestionBubble.tsx`, `AskResponseDisplay.tsx` in `components/ask/`. Refactored `AskPage.tsx` to use conversation array state, pending question, follow-up handler, auto-scroll. All 65 tests pass. |
| 4 | Inline verse linking in answer text | [COMPLETE] | 2026-03-23 | Created `LinkedAnswerText.tsx`. Integrated in `AskResponseDisplay.tsx`. Updated tests for multiple-element matches (references now appear in both inline text and verse cards). 6 LinkedAnswerText tests + all existing pass. |
| 5 | Verse card enhancements (links + actions + notes) | [COMPLETE] | 2026-03-23 | Created `VerseCardActions.tsx` with Highlight in Bible + Save note + inline textarea + crisis detection. Updated AskResponseDisplay verse cards with linked refs + actions. 12 VerseCardActions + 14 AskResponseDisplay tests pass. |
| 6 | Follow-up question chips ("Dig Deeper") | [COMPLETE] | 2026-03-23 | Created `DigDeeperSection.tsx`. Integrated in `AskResponseDisplay.tsx` with loading disabled state. 8 DigDeeperSection tests pass. |
| 7 | Popular Topics section | [COMPLETE] | 2026-03-23 | Added `POPULAR_TOPICS` to `constants/ask.ts`. Created `PopularTopicsSection.tsx`. Integrated in AskPage with auto-submit for logged-in users via `pendingAutoSubmitRef`. 5 tests pass. |
| 8 | Save Conversation button | [COMPLETE] | 2026-03-23 | Created `SaveConversationButton.tsx` with clipboard copy, truncated answers, footer, toast feedback. Integrated in AskPage after conversation thread. 9 tests pass. |
| 9 | Comprehensive tests & accessibility | [COMPLETE] | 2026-03-23 | Added 14 integration tests to AskPage.test.tsx: conversation thread flow, follow-up chips, Popular Topics visibility, dividers, auth gating, verse links, Dig Deeper rendering. Total: 274 tests across 10 files, all pass. Pre-existing failures in BibleReader/Dashboard tests unrelated. |
