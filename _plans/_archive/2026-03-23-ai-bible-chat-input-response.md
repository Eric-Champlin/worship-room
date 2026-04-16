# Implementation Plan: AI Bible Chat — Question Input & Response Display

**Spec:** `_specs/ai-bible-chat-input-response.md`
**Date:** 2026-03-23
**Branch:** `claude/feature/ai-bible-chat-input-response`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable (standalone 2-spec sequence; Spec 2 adds conversation history)

---

## Architecture Context

### Project Structure
- Pages: `frontend/src/pages/` — each page is a top-level component
- Components: `frontend/src/components/` — organized by feature domain (`daily/`, `prayer-wall/`, `audio/`, `dashboard/`, `ui/`, etc.)
- Types: `frontend/src/types/` — TypeScript interfaces
- Constants: `frontend/src/constants/` — static config values
- Mock data: `frontend/src/mocks/` — hardcoded mock data for frontend-first build
- Hooks: `frontend/src/hooks/` — custom React hooks
- Lib: `frontend/src/lib/` — utility functions (`cn()`, query client, etc.)

### Existing Patterns to Follow
- **Route registration:** `App.tsx` (line 107-155) — add `<Route path="/ask" element={<AskPage />} />` at top level
- **Provider nesting order:** QueryClientProvider → BrowserRouter → AuthProvider → ToastProvider → AuthModalProvider → AudioProvider → Routes
- **Navbar links:** `NAV_LINKS` array at `Navbar.tsx:23` — array of `{ label, to, icon? }` objects, auto-rendered in both desktop nav and mobile drawer
- **PageHero component:** `PageHero.tsx` — props: `{ title, subtitle?, showDivider?, children? }`. Gradient inline style. Caveat font for title.
- **Textarea with glow:** `PrayTabContent.tsx:690-711` — `animate-glow-pulse` border, auto-expand via callback, character counter, `aria-label` + `aria-describedby`
- **Crisis banner:** `<CrisisBanner text={userInput} />` — renders conditionally on keyword match, `role="alert"` + `aria-live="assertive"`
- **Auth gating:** `useAuth()` + `useAuthModal()` — pattern: `if (!isAuthenticated) { authModal?.openAuthModal('Sign in to...'); return }`
- **Loading state:** 3 bouncing dots — `PrayTabContent.tsx:390-401` — `h-2 w-2 animate-bounce rounded-full bg-primary` with `[animation-delay]` stagger
- **Toast:** `useToast()` → `showToast('message')` or `showToast('message', 'error')`
- **Chips:** `PrayTabContent.tsx:676-687` — `min-h-[44px] rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-text-dark`
- **Context passing to Daily Hub:** Navigate with `location.state` or query params, not React context — e.g., `navigate('/daily?tab=journal', { state: { ... } })`

### Test Patterns
- **File location:** `__tests__/` subdirectory alongside components, or `pages/__tests__/`
- **Naming:** `ComponentName.test.tsx`
- **Provider wrapping:** MemoryRouter (with `future` flags) + ToastProvider + AuthModalProvider
- **Auth mocking:** `vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ ... }) }))`
- **Assertion style:** `screen.getByRole()`, `screen.getByText()`, `expect(...).toBeInTheDocument()`

### Key Files That Will Be Modified
- `frontend/src/App.tsx` — add route
- `frontend/src/components/Navbar.tsx` — add "Ask" link to NAV_LINKS
- `frontend/src/components/HeroSection.tsx` — change navigation destination from `/daily?tab=pray&q=...` to `/ask?q=...`

### Key Files That Will Be Created
- `frontend/src/pages/AskPage.tsx` — main page component
- `frontend/src/types/ask.ts` — TypeScript interfaces
- `frontend/src/constants/ask.ts` — topic chips + response bank keywords
- `frontend/src/mocks/ask-mock-data.ts` — 15 mock responses + fallback
- `frontend/src/pages/__tests__/AskPage.test.tsx` — page tests
- `frontend/src/mocks/__tests__/ask-mock-data.test.ts` — response engine tests

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Submit question ("Find Answers") | Logged-out → auth modal "Sign in to ask questions" | Step 3 | `useAuth()` + `authModal?.openAuthModal()` |
| Auto-submit via `?q=` query param | Only auto-submits for logged-in users | Step 5 | `isAuthenticated` check before auto-submit |
| Feedback (thumbs up/down) | Only logged-in users write to localStorage | Step 4 | `isAuthenticated` guard on localStorage write |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| PageHero background | background-image | `linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)` | design-system.md / PageHero.tsx:7 |
| Hero H1 | font | Caveat, 72px desktop / 48px mobile, 700 weight, white | design-system.md |
| Hero subtitle | font | Inter, white/85 | PageHero.tsx:43 |
| HeadingDivider | usage | `showDivider` prop on PageHero | PageHero.tsx:29-41 |
| Content container | width | `max-w-2xl mx-auto px-4 sm:px-6` | PrayTabContent.tsx:378 |
| Textarea | border + glow | `border border-glow-cyan/30 bg-white rounded-lg py-3 px-4 animate-glow-pulse` | design-system.md / PrayTabContent.tsx:704 |
| Textarea focus | ring | `focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50` | PrayTabContent.tsx:704 |
| Character counter | position | `absolute bottom-2 right-3 text-xs text-text-light/60` | PrayTabContent.tsx:708 |
| Topic chips | style | `min-h-[44px] rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-text-dark hover:border-primary hover:text-primary` | PrayTabContent.tsx:682-683 |
| Primary CTA button | style | `bg-primary text-white font-semibold py-3 px-8 rounded-lg hover:bg-primary-light` | design-system.md |
| Disabled button | opacity | `opacity-50 cursor-not-allowed` | design-system.md |
| Loading dots | animation | `h-2 w-2 animate-bounce rounded-full bg-primary` with 0ms/150ms/300ms delays | PrayTabContent.tsx:394-396 |
| Verse card (light bg) | style | `bg-white rounded-xl border border-gray-200 shadow-sm p-5` | design-system.md — meditation card pattern |
| Encouragement callout | style | `bg-purple-50 border-l-4 border-primary rounded-r-lg p-4` | Spec §7.3 |
| BackgroundSquiggle | mask | `SQUIGGLE_MASK_STYLE` from BackgroundSquiggle.tsx | PrayTabContent.tsx:381-384 |
| Action buttons (outline) | style | `inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-dark hover:bg-gray-50` | PrayTabContent.tsx:471-473 |
| Feedback thumbs selected (up) | color | `text-primary` (#6D28D9) | Spec §9 |
| Feedback thumbs selected (down) | color | `text-danger` (#E74C3C) | Spec §9 |
| Navbar icon | Sparkles | `import { Sparkles } from 'lucide-react'`, `size={14}` | Navbar.tsx:288-289 |

---

## Design System Reminder

- Worship Room uses **Caveat** (`font-script`) for hero H1s and script-highlighted words, not Lora
- **Lora** (`font-serif`) is for scripture text, journal prompts, and italic quotes
- **Inter** (`font-sans`) is for body text, headings (non-hero), UI elements, buttons
- Squiggle backgrounds use `SQUIGGLE_MASK_STYLE` for fade mask — import from `BackgroundSquiggle`
- All tab content areas share `max-w-2xl` container width
- PageHero gradient is a `linear-gradient(to bottom, ...)` defined as inline style — not a Tailwind class
- Primary CTA button: `bg-primary text-white font-semibold py-3 px-8 rounded-lg` — NOT `rounded-full`
- Focus rings: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`
- All interactive elements must have minimum 44px touch targets on mobile (`min-h-[44px]`)
- Respect `prefers-reduced-motion` for animations (use `useReducedMotion()` hook or `motion-safe:` prefix)

---

## Shared Data Models

### New Types (to create in `types/ask.ts`)

```typescript
export interface AskVerse {
  reference: string   // e.g., "Romans 8:28"
  text: string         // Full WEB translation text
  explanation: string  // 1 sentence on how it applies
}

export interface AskResponse {
  id: string           // e.g., "suffering", "forgiveness", "fallback"
  topic: string        // Display topic name
  answer: string       // 2-3 paragraphs, warm second-person voice
  verses: AskVerse[]   // 3 supporting verses
  encouragement: string // Closing encouragement (1 sentence)
  prayer: string       // Suggested prayer (1 paragraph)
}

export interface AskFeedback {
  questionId: string   // Matched response ID
  helpful: boolean
  timestamp: string    // ISO 8601
}
```

### localStorage keys this spec touches

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_chat_feedback` | Write (logged-in only) | Array of `AskFeedback` objects |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Full-width textarea, chips wrap ~2 per row, action buttons 2x2 grid, hero title 48px |
| Tablet | 768px | Content centered `max-w-2xl`, chips ~3 per row, action buttons single row |
| Desktop | 1440px | Content centered `max-w-2xl`, chips single/2 rows, action buttons single row, hero title 72px |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| PageHero → content area | 0px (content starts after hero padding) | PageHero.tsx: `pb-16 sm:pb-20 lg:pb-24` |
| Content section (textarea) → topic chips | 16px (`mb-4` on textarea wrapper, chips in same flow) | Spec structure |
| Topic chips → submit button | 16px | Layout flow |
| Response sections → action buttons | 24px (`mb-6` pattern from PrayTabContent) | PrayTabContent.tsx:469 |

---

## Assumptions & Pre-Execution Checklist

- [x] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are verified (from design-system.md reference + codebase inspection)
- [x] All [UNVERIFIED] values are flagged with verification methods
- [x] Prior specs in the sequence are complete — this is Spec 1 of 2 (standalone)
- [ ] Confirm the Pray tab currently reads `?q=` from search params — **Finding: It does NOT.** The hero navigates to `/daily?tab=pray&q=...` but PrayTabContent only reads from `location.state.prayWallContext` and `location.state.challengeContext`, not from URL search params. The `?q=` param appears to be unused. This makes the HeroSection change cleaner — we're just redirecting to `/ask?q=...` instead.
- [ ] Confirm `PageHero` renders the subtitle in `font-sans` (Inter) — **Confirmed** at PageHero.tsx:43: `font-sans text-base text-white/85`. The spec asks for Lora italic subtitle — will need custom rendering via `children` prop instead of `subtitle` prop.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Subtitle font | Use `children` prop on PageHero for Lora italic subtitle instead of `subtitle` prop | PageHero `subtitle` renders in `font-sans`. Spec requires Lora italic for "Bring your questions..." |
| Keyword matching | First-match-wins, case-insensitive | Spec: "First match wins. If multiple could match, prioritize by order." |
| Chip click replaces text | Replace any existing textarea text | Spec: "replaces any existing text" — matches prayer starter chip behavior |
| Auto-submit with `?q=` | Only for logged-in users | Spec: "If the user is logged out, pre-fill the textarea only" |
| Feedback localStorage write | Only for logged-in users | Spec: "Only written when a logged-in user provides feedback" + demo mode data policy |
| Action button "Journal about this" | Navigate with question text in state | Follow existing context-passing pattern from Pray → Journal |
| Action button "Pray about this" | Navigate with question text in state | Follow pattern: `navigate('/daily?tab=pray', { state: { prayWallContext: text } })` |
| Share clipboard text | `{question}\n\n{firstVerseReference} — Found on Worship Room` | Spec: "question text + the first verse reference + Found on Worship Room" |
| PageHero `subtitle` vs `children` | Spec says Lora italic subtitle, but PageHero renders subtitle in Inter. Use `children` to render the subtitle manually in Lora italic | Keep PageHero component unchanged; customize via children |

---

## Implementation Steps

### Step 1: Types, Constants, and Mock Response Engine

**Objective:** Create the data layer — TypeScript interfaces, topic chip constants, 15 mock responses + fallback, and the keyword-matching function.

**Files to create:**
- `frontend/src/types/ask.ts` — `AskVerse`, `AskResponse`, `AskFeedback` interfaces
- `frontend/src/constants/ask.ts` — Topic chips array, response topic keywords mapping
- `frontend/src/mocks/ask-mock-data.ts` — 15 hardcoded `AskResponse` objects + fallback + `getAskResponse(question: string): AskResponse` function

**Details:**

**`types/ask.ts`** — Define the three interfaces as shown in Shared Data Models above.

**`constants/ask.ts`** — Export:
```typescript
export const ASK_TOPIC_CHIPS = [
  "Why does God allow suffering?",
  "How do I forgive someone?",
  "What does the Bible say about anxiety?",
  "How do I know God's plan for me?",
  "Is it okay to doubt?",
  "How do I pray better?",
] as const

export const ASK_MAX_LENGTH = 500
export const ASK_CHAR_WARNING = 450
export const ASK_CHAR_DANGER = 490
export const ASK_LOADING_DELAY_MS = 2000
export const ASK_FEEDBACK_KEY = 'wr_chat_feedback'
```

**`mocks/ask-mock-data.ts`** — 15 response objects + 1 fallback. Each response:
- `id`: slug (e.g., `"suffering"`)
- `topic`: display name (e.g., `"Suffering & Pain"`)
- `answer`: 2-3 paragraphs in warm second-person voice, Scripture woven naturally
- `verses`: 3 WEB translation verses with reference, text, explanation
- `encouragement`: 1-sentence closing
- `prayer`: 1-paragraph warm personal prayer

Topics in order (matching spec): suffering, forgiveness, anxiety, purpose, doubt, prayer, grief, loneliness, anger, marriage, parenting, money, identity, temptation, afterlife.

`getAskResponse(question: string): AskResponse` — case-insensitive keyword scan. Topic keywords:
1. Suffering: suffer, pain, hurt, why god, why does god, evil, tragedy
2. Forgiveness: forgive, forgiveness, hurt me, betrayed, resentment
3. Anxiety: anxious, anxiety, worried, worry, fear, afraid, panic, stress
4. Purpose: plan, purpose, calling, direction, future, meant to
5. Doubt: doubt, faith, believe, question, uncertain, struggle to believe
6. Prayer: pray, prayer, how to pray, talk to god
7. Grief: grief, grieve, loss, lost someone, died, death of, miss them
8. Loneliness: lonely, alone, isolated, no friends, abandoned
9. Anger: angry, anger, mad, frustrated, rage, furious
10. Marriage: marriage, spouse, husband, wife, relationship, divorce
11. Parenting: parent, child, children, kid, son, daughter, raising
12. Money: money, financial, debt, afford, job loss, provision
13. Identity: worth, identity, enough, value, self-esteem, who am i
14. Temptation: temptation, tempted, sin, addiction, struggle with
15. Afterlife: heaven, death, afterlife, eternal, what happens when

Fallback: general wisdom with Proverbs 3:5-6, James 1:5, Psalm 32:8.

**All Scripture must use WEB (World English Bible) translation.**

**Guardrails (DO NOT):**
- Do NOT use any copyrighted Bible translation (NIV, ESV, etc.) — WEB only
- Do NOT claim divine authority in response text — use language like "Scripture encourages us..." not "God is telling you..."
- Do NOT provide medical, psychological, or legal advice in response text
- Do NOT make denominational claims

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `getAskResponse` returns suffering response for "Why does God allow suffering?" | unit | Keyword matching — exact chip text |
| `getAskResponse` returns forgiveness response for "how do I forgive my brother" | unit | Keyword matching — partial match |
| `getAskResponse` returns fallback for "what is the meaning of life" | unit | No keyword match → fallback |
| Each of 15 responses has 3 verses | unit | Validates response structure |
| Each response has non-empty answer, encouragement, prayer | unit | Validates completeness |
| Keyword matching is case-insensitive | unit | "SUFFERING" matches suffering response |
| First match wins when multiple could match | unit | Validates priority order |

**Expected state after completion:**
- [ ] `types/ask.ts` exports `AskVerse`, `AskResponse`, `AskFeedback`
- [ ] `constants/ask.ts` exports chip array and config constants
- [ ] `mocks/ask-mock-data.ts` exports `getAskResponse()` and all 16 response objects (15 + fallback)
- [ ] All tests pass

---

### Step 2: Ask Page Component — Input Section

**Objective:** Create the `/ask` page with PageHero, textarea input, topic chips, crisis banner, and submit button. No response display yet.

**Files to create:**
- `frontend/src/pages/AskPage.tsx` — main page component

**Files to modify:**
- `frontend/src/App.tsx` — add route `<Route path="/ask" element={<AskPage />} />`

**Details:**

**Page structure (AskPage.tsx):**
```
<Layout>
  <PageHero title="Ask God's Word" showDivider>
    {/* Custom Lora italic subtitle via children */}
    <p className="mx-auto max-w-xl font-serif italic text-base text-white/85 sm:text-lg">
      Bring your questions. Find wisdom in Scripture.
    </p>
  </PageHero>
  <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
    <div className="relative">
      {/* BackgroundSquiggle with SQUIGGLE_MASK_STYLE */}
      {/* Input section */}
    </div>
  </main>
</Layout>
```

**Textarea implementation:**
- `<label htmlFor="ask-input" className="sr-only">Your question</label>` — visually hidden accessible label
- Textarea with same glow pattern as PrayTabContent: `animate-glow-pulse border-glow-cyan/30 bg-white rounded-lg py-3 px-4 text-text-dark placeholder:text-text-light/60`
- Placeholder: `"What's on your heart? Ask anything..."`
- `maxLength={500}` — enforced at HTML level
- Auto-expand: same `autoExpand` callback as PrayTabContent (reset height to auto, set to scrollHeight)
- Character counter: `<span id="ask-char-count" className="absolute bottom-2 right-3 text-xs ...">127 / 500</span>`
  - Default: `text-text-light/60`
  - 450-489: `text-warning`
  - 490+: `text-danger`
- `aria-describedby="ask-char-count"`

**Topic chips:**
- Rendered below textarea, above submit button
- `<div className="mb-6 flex flex-wrap justify-center gap-2">`
- Each chip: `<button>` with chip styles from design system values table
- Click handler: `setText(chipText)` — replaces any existing text, focuses textarea

**Crisis banner:**
- `<CrisisBanner text={text} />` — same component used by PrayTabContent

**Submit button:**
- "Find Answers" — centered, primary CTA style
- Disabled when `text.trim() === ''`: add `disabled` attribute + `opacity-50 cursor-not-allowed`
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`

**State:**
```typescript
const [text, setText] = useState('')
const [response, setResponse] = useState<AskResponse | null>(null)
const [isLoading, setIsLoading] = useState(false)
```

**Auth gating on submit:**
```typescript
const { isAuthenticated } = useAuth()
const authModal = useAuthModal()

const handleSubmit = () => {
  if (!text.trim()) return
  if (!isAuthenticated) {
    authModal?.openAuthModal('Sign in to ask questions')
    return
  }
  // loading + response flow (Step 3)
}
```

**Route registration in App.tsx:**
- Add `import { AskPage } from './pages/AskPage'` at top
- Add `<Route path="/ask" element={<AskPage />} />` after the `/daily` route (line ~115)

**Responsive behavior:**
- Desktop (1440px): Content centered `max-w-2xl`, comfortable spacing
- Tablet (768px): Same centered layout
- Mobile (375px): Full-width with `px-4` padding, chips wrap into multiple rows

**Guardrails (DO NOT):**
- Do NOT use `dangerouslySetInnerHTML` anywhere
- Do NOT persist any data for logged-out users
- Do NOT skip crisis banner — it's a safety-critical component

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders PageHero with "Ask God's Word" title | unit | Page structure |
| Renders subtitle in Lora italic | unit | Typography check |
| Renders HeadingDivider | unit | `showDivider` prop |
| Textarea renders with correct placeholder | unit | Input presence |
| Character counter updates on input | integration | Type text → counter changes |
| Character counter shows warning color at 450+ | unit | CSS class toggle |
| Character counter shows danger color at 490+ | unit | CSS class toggle |
| Textarea enforces 500 char max | unit | `maxLength` attribute |
| 6 topic chips render with correct text | unit | Chip presence |
| Clicking a chip pre-fills textarea | integration | Click → textarea value |
| Submit button disabled when textarea empty | unit | `disabled` attribute |
| CrisisBanner appears for crisis keywords | integration | Type "kill myself" → banner appears |
| Logged-out user clicking submit sees auth modal | integration | Auth gating |
| Textarea has accessible label | unit | `label[for]` or `aria-label` |

**Expected state after completion:**
- [ ] `/ask` route renders the AskPage component
- [ ] Hero section displays correctly with Caveat title, Lora subtitle, HeadingDivider
- [ ] Textarea, chips, and submit button are functional
- [ ] Crisis banner monitors textarea input
- [ ] Auth modal fires for logged-out users on submit
- [ ] All tests pass

---

### Step 3: Response Display — Loading State, Answer, Verses, Encouragement, Prayer

**Objective:** Implement the loading state and full response display after question submission.

**Files to modify:**
- `frontend/src/pages/AskPage.tsx` — add loading state, response rendering, and mock delay

**Details:**

**Submit handler (complete):**
```typescript
const handleSubmit = () => {
  if (!text.trim()) return
  if (!isAuthenticated) {
    authModal?.openAuthModal('Sign in to ask questions')
    return
  }
  setIsLoading(true)
  setResponse(null)
  setFeedback(null)

  setTimeout(() => {
    const result = getAskResponse(text)
    setResponse(result)
    setIsLoading(false)
  }, ASK_LOADING_DELAY_MS) // 2000ms
}
```

**Loading state (inside `<div aria-live="polite">`):**
```
<div className="flex flex-col items-center justify-center py-16">
  <div className="mb-4 flex gap-1">
    {/* 3 bouncing dots — same as PrayTabContent */}
  </div>
  <p className="text-text-light">Searching Scripture for wisdom...</p>
  <p className="mt-4 font-serif italic text-text-light">
    "Your word is a lamp to my feet and a light for my path."
    <span className="mt-1 block text-sm not-italic">— Psalm 119:105 WEB</span>
  </p>
</div>
```

**Response display (with `animate-fade-in` wrapper):**

1. **Direct answer** — `<div className="mb-8">` containing paragraphs split by `\n\n`:
   ```
   {response.answer.split('\n\n').map((p, i) => (
     <p key={i} className="mb-4 text-base leading-relaxed text-text-dark">{p}</p>
   ))}
   ```

2. **"What Scripture Says" section:**
   ```
   <h2 className="mb-4 text-xl font-semibold text-text-dark">What Scripture Says</h2>
   <div className="space-y-4">
     {response.verses.map((verse, i) => (
       <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
         <p className="font-bold text-text-dark">{verse.reference}</p>
         <p className="mt-2 font-serif italic text-text-dark">{verse.text}</p>
         <p className="mt-2 text-sm text-text-light">{verse.explanation}</p>
       </div>
     ))}
   </div>
   ```

3. **Closing encouragement:**
   ```
   <div className="mt-8 rounded-r-lg border-l-4 border-primary bg-purple-50 p-4">
     <p className="text-text-dark">{response.encouragement}</p>
   </div>
   ```

4. **Suggested prayer:**
   ```
   <div className="mt-8">
     <p className="mb-2 text-sm font-semibold text-text-dark">Pray About This</p>
     <p className="font-serif italic leading-relaxed text-text-dark">{response.prayer}</p>
   </div>
   ```

5. **AI disclaimer:**
   ```
   <p className="mt-6 text-center text-xs text-text-light">
     AI-generated content for encouragement. Not professional advice.
   </p>
   ```

**Animation:** The response container uses `className="animate-fade-in"` (existing 500ms fade+slide animation). Respect `prefers-reduced-motion` — if reduced, skip animation class.

**Visibility toggling:** When `isLoading` is true, show loading state + hide input. When `response` is set, show response + hide input. When neither, show input section.

**Responsive behavior:**
- Desktop/Tablet: Verse cards have `p-5`, comfortable spacing
- Mobile: Same layout, cards go full-width within `max-w-2xl` container

**Guardrails (DO NOT):**
- Do NOT use `dangerouslySetInnerHTML` for any response text
- Do NOT render HTML from response data — all text is plain text rendered via React

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Loading state shows bouncing dots | integration | Submit → dots appear |
| Loading message "Searching Scripture..." is displayed | integration | Loading text |
| Loading verse (Psalm 119:105) appears | integration | Loading verse |
| Loading state has `aria-live="polite"` | unit | Accessibility |
| Response fades in after loading | integration | After 2000ms mock delay |
| Direct answer paragraphs render | integration | Response text displayed |
| "What Scripture Says" heading appears | integration | Section heading |
| 3 verse cards render with reference, text, explanation | integration | Card content |
| Verse cards use correct styles (rounded-xl, border, shadow-sm) | unit | CSS classes |
| Encouragement callout has purple background + left border | unit | CSS classes |
| Prayer section has "Pray About This" label + Lora italic text | integration | Typography |
| AI disclaimer appears below response | integration | Disclaimer text |
| Response section uses animate-fade-in | unit | Animation class |

**Expected state after completion:**
- [ ] Submitting a question shows loading state for 2s
- [ ] Response displays with all 4 sections (answer, verses, encouragement, prayer)
- [ ] AI disclaimer visible
- [ ] Animation works, respects reduced motion
- [ ] All tests pass

---

### Step 4: Action Buttons and Feedback Row

**Objective:** Add the 4 action buttons and "Was this helpful?" feedback row below the response.

**Files to modify:**
- `frontend/src/pages/AskPage.tsx` — add action buttons and feedback components

**Details:**

**Action buttons (below response, above feedback):**
```
<div className="mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-row">
  {/* Ask another question */}
  <button className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-dark hover:bg-gray-50 ...">
    <RefreshCw className="h-4 w-4" /> Ask another question
  </button>
  {/* Journal about this */}
  <button onClick={handleJournal} className="...">
    <BookOpen className="h-4 w-4" /> Journal about this
  </button>
  {/* Pray about this */}
  <button onClick={handlePray} className="...">
    <Heart className="h-4 w-4" /> Pray about this
  </button>
  {/* Share */}
  <button onClick={handleShare} className="...">
    <Share2 className="h-4 w-4" /> Share
  </button>
</div>
```

**Action handlers:**

1. **"Ask another question":** `setText(''); setResponse(null); setFeedback(null); window.scrollTo({ top: 0, behavior: 'smooth' })`
2. **"Journal about this":** `navigate('/daily?tab=journal', { state: { prayWallContext: text } })` — reuses the existing `prayWallContext` state key that JournalTabContent reads
3. **"Pray about this":** `navigate('/daily?tab=pray', { state: { prayWallContext: text } })` — reuses the existing `prayWallContext` state key that PrayTabContent reads
4. **"Share":** Copy to clipboard: `"{question}\n\n{response.verses[0].reference} — Found on Worship Room"` → `showToast('Copied to clipboard')`

**Feedback row (below action buttons):**
```typescript
const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)
const [feedbackThanks, setFeedbackThanks] = useState(false)
```

```
<div className="mt-6 flex items-center justify-center gap-4">
  <span className="text-sm text-text-light">Was this helpful?</span>
  <button onClick={() => handleFeedback('up')} aria-label="Yes, helpful" aria-pressed={feedback === 'up'} className="...">
    <ThumbsUp className={cn("h-5 w-5", feedback === 'up' ? 'fill-primary text-primary' : 'text-text-light')} />
  </button>
  <button onClick={() => handleFeedback('down')} aria-label="No, not helpful" aria-pressed={feedback === 'down'} className="...">
    <ThumbsDown className={cn("h-5 w-5", feedback === 'down' ? 'fill-danger text-danger' : 'text-text-light')} />
  </button>
</div>
{feedbackThanks && (
  <p className="mt-2 animate-fade-in text-center text-sm text-text-light">
    Thank you for your feedback!
  </p>
)}
```

**Feedback handler:**
```typescript
const handleFeedback = (type: 'up' | 'down') => {
  setFeedback(type)
  setFeedbackThanks(true)
  setTimeout(() => setFeedbackThanks(false), 2000)

  // Only persist for logged-in users
  if (!isAuthenticated || !response) return
  const existing: AskFeedback[] = JSON.parse(localStorage.getItem(ASK_FEEDBACK_KEY) || '[]')
  const entry: AskFeedback = {
    questionId: response.id,
    helpful: type === 'up',
    timestamp: new Date().toISOString(),
  }
  localStorage.setItem(ASK_FEEDBACK_KEY, JSON.stringify([...existing, entry]))
}
```

**Responsive behavior:**
- Desktop/Tablet: Action buttons in a single row (`sm:flex sm:flex-row`)
- Mobile: 2x2 grid (`grid grid-cols-2 gap-3`)
- Feedback row: always centered, single row

**Guardrails (DO NOT):**
- Do NOT write to localStorage for logged-out users — demo mode data policy
- Do NOT use `navigator.share()` for the share button (spec says clipboard copy, not Web Share API)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| "Ask another question" clears textarea and response | integration | Click → state reset |
| "Ask another question" scrolls to top | integration | `window.scrollTo` called |
| "Journal about this" navigates to /daily?tab=journal | integration | Navigation check |
| "Pray about this" navigates to /daily?tab=pray | integration | Navigation check |
| "Share" copies text to clipboard | integration | `navigator.clipboard.writeText` called |
| "Share" shows toast "Copied to clipboard" | integration | Toast appears |
| Thumbs up button highlights in primary color | unit | CSS class toggle |
| Thumbs down button highlights in danger color | unit | CSS class toggle |
| Selecting one deselects the other | integration | Toggle behavior |
| Thank-you message appears on feedback selection | integration | Text appears |
| Thank-you message auto-dismisses after 2s | integration | setTimeout behavior |
| Feedback stored in localStorage for logged-in user | integration | localStorage check |
| Feedback NOT stored for logged-out user | integration | localStorage empty |
| Action buttons are 2x2 grid on mobile | unit | CSS classes |
| Feedback buttons have aria-pressed | unit | Accessibility |

**Expected state after completion:**
- [ ] 4 action buttons render below response
- [ ] All action handlers work correctly
- [ ] Feedback row with thumbs up/down works
- [ ] Thank-you message auto-dismisses
- [ ] localStorage persistence for logged-in users only
- [ ] All tests pass

---

### Step 5: Landing Page Integration and `?q=` Auto-Submit

**Objective:** Change the hero TypewriterInput to navigate to `/ask?q=...` and implement auto-fill/auto-submit on the Ask page.

**Files to modify:**
- `frontend/src/components/HeroSection.tsx` — change navigation destination
- `frontend/src/pages/AskPage.tsx` — add `?q=` query param handling

**Details:**

**HeroSection change (line 87-93):**
```typescript
// BEFORE:
navigate(`/daily?tab=pray&q=${encodeURIComponent(value)}`)

// AFTER:
navigate(`/ask?q=${encodeURIComponent(value)}`)
```

Also update the auth modal message (line 89):
```typescript
// BEFORE:
authModal?.openAuthModal('Sign in to get AI-powered guidance')

// AFTER:
authModal?.openAuthModal('Sign in to ask questions')
```

**AskPage `?q=` handling:**
```typescript
const [searchParams] = useSearchParams()
const qParam = searchParams.get('q')

useEffect(() => {
  if (qParam) {
    setText(decodeURIComponent(qParam))
    // Auto-submit only for logged-in users
    if (isAuthenticated) {
      // Use a ref to prevent re-triggering
      handleSubmitRef.current()
    }
  }
}, []) // Only on mount
```

Implementation detail: Use a ref for `handleSubmit` to avoid stale closure issues in the mount effect. Pattern:
```typescript
const handleSubmitRef = useRef(handleSubmit)
handleSubmitRef.current = handleSubmit

useEffect(() => {
  if (qParam && isAuthenticated) {
    const decoded = decodeURIComponent(qParam)
    setText(decoded)
    // Slight delay to let state update
    setTimeout(() => handleSubmitRef.current(), 0)
  } else if (qParam) {
    setText(decodeURIComponent(qParam))
  }
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

**Guardrails (DO NOT):**
- Do NOT auto-submit for logged-out users — they'd hit the auth modal immediately
- Do NOT remove the `?q=` from the URL after processing (the user might want to share the URL)
- Do NOT break the existing Pray tab — it should still work via direct navigation, just not receive `?q=` from the hero input anymore

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| HeroSection navigates to /ask?q=... on submit (logged-in) | integration | Navigation target changed |
| HeroSection shows auth modal for logged-out submit | integration | Auth gating preserved |
| AskPage pre-fills textarea from ?q= param | integration | URL param → textarea value |
| AskPage auto-submits for logged-in user with ?q= | integration | Auto-triggers loading state |
| AskPage does NOT auto-submit for logged-out user with ?q= | integration | Only pre-fills |
| Pray tab still accessible at /daily?tab=pray | integration | No regression |

**Expected state after completion:**
- [ ] Landing page hero input navigates to `/ask?q=...`
- [ ] `/ask?q=some+question` pre-fills textarea
- [ ] Auto-submit works for logged-in users
- [ ] Logged-out users see pre-filled text only
- [ ] Pray tab still works independently
- [ ] All tests pass

---

### Step 6: Navbar Addition

**Objective:** Add "Ask" link to desktop navbar and mobile drawer.

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — add entry to `NAV_LINKS` array

**Details:**

Add to `NAV_LINKS` array at `Navbar.tsx:23`, between "Daily Hub" and "Bible":
```typescript
const NAV_LINKS: ReadonlyArray<{ label: string; to: string; icon?: LucideIcon }> = [
  { label: 'Daily Hub', to: '/daily' },
  { label: 'Ask', to: '/ask', icon: Sparkles },   // ← NEW
  { label: 'Bible', to: '/bible', icon: Book },
  // ... rest unchanged
]
```

Add `Sparkles` to the lucide-react import if not already imported. Check existing imports first.

The `NAV_LINKS` array is automatically iterated in:
1. Desktop nav (line ~287): `{NAV_LINKS.map((link) => ...)}`  — renders NavLink with optional icon
2. Mobile drawer (line ~663): `{NAV_LINKS.map((link, index) => ...)}` — renders NavLink with optional icon

Both already handle the `icon` property, so no additional rendering logic is needed.

**Desktop:** "Ask" appears between "Daily Hub" and "Bible" with Sparkles icon + text. Active state shows underline + primary color.

**Mobile:** "Ask" appears between "Daily Hub" and "Bible" in the drawer with Sparkles icon.

**Guardrails (DO NOT):**
- Do NOT create a dropdown for "Ask" — it's a single link, not a category
- Do NOT change the nav ordering for any other links

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| "Ask" link appears in desktop navbar | unit | NavLink presence |
| "Ask" link has Sparkles icon | unit | Icon rendered |
| "Ask" link navigates to /ask | unit | `to` attribute |
| "Ask" appears between "Daily Hub" and "Bible" in navigation order | unit | DOM order check |

**Expected state after completion:**
- [ ] "Ask" link visible in desktop navbar with Sparkles icon
- [ ] "Ask" link visible in mobile drawer
- [ ] Correct position between Daily Hub and Bible
- [ ] Active state styling works on /ask route
- [ ] All tests pass

---

### Step 7: Integration Tests and Final Polish

**Objective:** Write comprehensive page-level tests covering the full flow, accessibility, and edge cases.

**Files to create:**
- `frontend/src/pages/__tests__/AskPage.test.tsx` — comprehensive page tests

**Details:**

**Test file structure:**
```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AskPage } from '@/pages/AskPage'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'

// Mock useAuth for logged-in and logged-out scenarios
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

function renderAskPage(initialRoute = '/ask') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthModalProvider>
          <Routes>
            <Route path="/ask" element={<AskPage />} />
          </Routes>
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}
```

**Test groups:**

1. **Page structure** — hero, title, subtitle, divider, squiggle
2. **Input behavior** — textarea, character counter, chip clicks, crisis banner
3. **Auth gating** — logged-out submit → auth modal, logged-in submit → loading
4. **Loading state** — dots, message, verse, aria-live
5. **Response display** — answer paragraphs, verse cards, encouragement, prayer, disclaimer
6. **Action buttons** — reset, navigate to journal, navigate to pray, clipboard share
7. **Feedback** — thumbs up/down toggle, thank-you message, localStorage persistence
8. **URL params** — `?q=` pre-fill, auto-submit for logged-in
9. **Accessibility** — labels, aria-pressed, aria-live, heading hierarchy, keyboard nav, 44px targets
10. **Responsive** — mobile grid vs desktop flex for action buttons

**Guardrails (DO NOT):**
- Do NOT skip accessibility tests
- Do NOT test implementation details (internal state) — test user-visible behavior

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full flow: type question → submit → loading → response | integration | End-to-end happy path |
| Full flow: click chip → submit → response matches chip topic | integration | Chip → keyword match |
| Logged-out full flow: type → submit → auth modal | integration | Auth gate |
| ?q= param: pre-fills and auto-submits for logged-in | integration | URL param handling |
| Accessibility: all interactive elements are keyboard accessible | unit | Tab + Enter/Space |
| Accessibility: heading hierarchy is valid (h1 → h2) | unit | DOM structure |
| Accessibility: loading state announced to screen readers | unit | aria-live region |
| Responsive: action buttons use grid on small screens | unit | CSS class check |

**Expected state after completion:**
- [ ] All integration tests pass
- [ ] Full flow works end-to-end
- [ ] Accessibility tests pass
- [ ] `pnpm test` passes with no failures
- [ ] Feature is complete per spec acceptance criteria

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types, constants, mock response engine |
| 2 | 1 | Ask page component — input section + route |
| 3 | 2 | Response display — loading state, answer, verses |
| 4 | 3 | Action buttons and feedback row |
| 5 | 2 | Landing page integration and ?q= handling |
| 6 | — | Navbar addition (independent) |
| 7 | 3, 4, 5 | Integration tests and final polish |

**Note:** Steps 5 and 6 are independent of each other and can be done in parallel after Step 2. Step 7 depends on all prior steps being complete.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types, constants, mock response engine | [COMPLETE] | 2026-03-23 | Created `types/ask.ts`, `constants/ask.ts`, `mocks/ask-mock-data.ts`, `mocks/__tests__/ask-mock-data.test.ts`. 88 tests pass. |
| 2 | Ask page — input section + route | [COMPLETE] | 2026-03-23 | Created `pages/AskPage.tsx`, added route in `App.tsx`. 15 tests in `pages/__tests__/AskPage.test.tsx`. |
| 3 | Response display | [COMPLETE] | 2026-03-23 | Added loading state + response display to `AskPage.tsx`. 13 new tests (28 total). |
| 4 | Action buttons and feedback | [COMPLETE] | 2026-03-23 | Added action buttons + feedback row to `AskPage.tsx`. 12 new tests (40 total). |
| 5 | Landing page integration + ?q= | [COMPLETE] | 2026-03-23 | Updated `HeroSection.tsx` to navigate to `/ask?q=...`. Added `?q=` handling to `AskPage.tsx`. 3 new tests (43 total). |
| 6 | Navbar addition | [COMPLETE] | 2026-03-23 | Added "Ask" link with Sparkles icon to `NAV_LINKS` in `Navbar.tsx`, between Daily Hub and Bible. All 62 Navbar tests pass. |
| 7 | Integration tests + polish | [COMPLETE] | 2026-03-23 | Added 9 integration + accessibility tests (52 total in AskPage.test.tsx). Full flow, chip flow, ?q= auto-submit, a11y checks all pass. 140 total tests across feature. |
