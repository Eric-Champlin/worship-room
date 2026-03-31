# Feature: First-Visit Prayer Flow

**Master Plan Reference:** N/A — standalone feature (Round 3, P0 priority)

---

## Overview

Worship Room's strongest feature — AI-generated personalized prayer via the `/ask` page — is currently locked behind a login wall on first interaction. A visitor types how they're feeling into the hero input, hits submit, and sees an auth modal instead of a response. The value proposition is never demonstrated. This spec removes the auth gate from the first interaction and lets every visitor experience the AI prayer response before any login prompt.

This is the single highest-impact conversion fix in Round 3. Competitors (Hallow, Abide, Glorify) all offer a free first experience. Worship Room's "Free to use, meaningful to keep" philosophy (see UX Flows doc) demands that value is delivered before commitment is asked.

## User Stories

- As a **logged-out visitor**, I want to type how I'm feeling in the hero input, submit it, and see a real AI response so I can experience Worship Room's value before deciding to create an account.
- As a **logged-out visitor**, I want to copy or share the AI response so I can send it to a friend who might benefit.
- As a **logged-in user**, I want the hero input and Ask page to work exactly as they do today with no changes to my experience.

---

## Requirements

### 1. Remove Auth Gate from Hero Input Submit

**Current behavior:** `HeroSection.tsx` checks `isAuthenticated` on submit. If false, opens auth modal with "Sign in to ask questions." The visitor never navigates to `/ask`.

**Target behavior:**
- Remove the `isAuthenticated` check from the hero submit handler
- All users (logged-in and logged-out) navigate to `/ask?q={encodeURIComponent(text)}` on submit
- The hero input behavior is identical regardless of auth state

### 2. Allow Logged-Out Users to See the First AI Response

**Current behavior:** `AskPage.tsx` checks `isAuthenticated` before generating a response. Logged-out users who arrive at `/ask?q=something` see the auth modal instead of a response.

**Target behavior:**
- When a logged-out user arrives at `/ask?q=something`, the page reads the `q` param, displays the user's question, and generates the mock AI response — same visual treatment as for logged-in users (verse cards, formatting, suggested prayer)
- The first response is completely free: no auth modal, no login prompt, no interruption
- The auto-submit logic (reading `q` param and triggering response) must work without `isAuthenticated`

### 3. Gate Follow-Up Actions (Not the First Response)

After the first response displays for a logged-out user, deeper engagement actions are auth-gated while sharing actions remain free.

### 4. Inline Conversion Prompt

After the AI response is displayed to a logged-out user, show a subtle inline conversion card (not a modal, not a popup):
- Frosted glass card matching the Dashboard Card Pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- Heading, body copy, primary CTA, and dismissible secondary link
- Feels inviting, not desperate — no urgency language, no countdown, no "limited time"
- Placed below the AI response, above the follow-up input area

### 5. Crisis Detection on Logged-Out Input

Crisis keyword detection must run on all user input regardless of auth status. If a logged-out user types crisis keywords in the hero input, the `CrisisBanner` must display crisis resources on the Ask page. This is a safety-critical requirement — see `01-ai-safety.md`.

### 6. Preserve Pray Tab Auth Gate

The Pray tab (`/daily?tab=pray`) auth gate stays as-is. The conversion funnel is: hero input → Ask page (free first response) → conversion prompt → registration. The Pray tab remains a logged-in feature. No changes to `PrayTabContent.tsx`.

---

## Auth Gating

**Every interactive element must have its auth behavior explicitly defined.**

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Hero input submit | Navigates to `/ask?q={text}` (no gate) | Navigates to `/ask?q={text}` (no gate) | N/A |
| First AI response generation | Generates and displays response (no gate) | Generates and displays response (no gate) | N/A |
| Copy response to clipboard | Works without auth | Works without auth | N/A |
| Share response | Works without auth | Works without auth | N/A |
| Ask a follow-up question | Auth modal | Submits follow-up | "Sign in to continue the conversation" |
| "Journal about this" CTA | Auth modal | Navigates to journal | "Sign in to save journal entries" |
| "Pray about this" CTA | Auth modal | Navigates to pray | "Sign in to generate prayers" |
| Thumbs up/down feedback | Auth modal | Records feedback | "Sign in to give feedback" |
| Save conversation | Auth modal | Saves to localStorage | "Sign in to save conversations" |
| Follow-up chip click | Auth modal | Submits as follow-up question | "Sign in to continue the conversation" |

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Hero input full-width. Ask page response stacks vertically. Conversion card full-width with `p-4`. Action buttons stack or wrap. |
| Tablet (640-1024px) | Hero input centered at existing `max-w-2xl`. Ask page content centered. Conversion card centered with `p-5`. |
| Desktop (> 1024px) | Hero input centered at existing `max-w-2xl`. Ask page content centered. Conversion card centered with `p-6`. Action buttons in a row. |

The conversion prompt card should be full-width within the content column at all breakpoints. On mobile, reduce padding slightly (`p-4` instead of `p-6`).

---

## AI Safety Considerations

**Crisis detection is mandatory on all user input, regardless of auth state.**

- The `CrisisBanner` component and `containsCrisisKeyword()` check must fire on the Ask page for logged-out users the same as for logged-in users
- If crisis keywords are detected in the hero input, crisis resources must display on the Ask page when the user arrives via `/ask?q={crisis text}`
- The crisis detection currently lives in `AskPage.tsx` — verify it does not depend on `isAuthenticated`. If it does, fix it. Crisis resources must always show.
- This is non-negotiable per `01-ai-safety.md`: "Run crisis detection on the backend (not the client) to prevent bypassing" — for Phase 2 (frontend-only), the client-side keyword check is the safety net

---

## Auth & Persistence

- **Logged-out users:** Zero persistence. The first AI response lives in React state only. No localStorage writes, no cookies, no anonymous IDs. If the user refreshes the page, the response is gone.
- **Logged-in users:** No change to current behavior. Conversation state persists in React state (same as today — real persistence is Phase 3).
- **localStorage usage:** None for this feature. The conversion prompt dismissal ("Keep exploring") can use React state — it only needs to persist for the current page visit.
- **Route type:** `/ask` remains a public route. No route-level auth gate.

---

## Completion & Navigation

N/A — standalone feature. Not part of the Daily Hub tabbed experience.

---

## Design Notes

### Conversion Prompt Card

- **Pattern:** Dashboard Card Pattern from design system: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- **Padding:** `p-6` desktop, `p-4` mobile
- **Heading:** "This is just the beginning." — `text-white font-semibold text-lg`
- **Body:** "Create a free account to save your prayers, journal your thoughts, track your growth, and join a community that cares." — `text-white/70 text-sm`
- **CTA button:** "Get Started — It's Free" — `bg-primary text-white rounded-full px-6 py-3 font-semibold` (matches existing primary CTA patterns)
- **Secondary link:** "Keep exploring" — `text-primary-lt text-sm` with hover underline. Dismisses the card (React state, no persistence).
- **Animation:** Fade-in after the AI response finishes rendering (use existing `animate-fade-in` pattern, 500ms)
- **Placement:** Below the AI response area, above the follow-up input. Full-width within the content column.

### Existing Components Referenced

- `HeroSection.tsx` — landing page hero with `TypewriterInput` (modify submit handler)
- `AskPage.tsx` — the Ask page (modify auth gating for first response)
- `AskResponseDisplay.tsx` — response display with action buttons (add per-action auth gating for logged-out users)
- `CrisisBanner` — crisis keyword detection component (verify auth-independent behavior)
- `AuthModal` / `useAuthModal()` — auth prompt modal (used for follow-up action gating)
- `useAuth()` — auth hook (still needed for conditional rendering of conversion prompt and follow-up gating)

### New Visual Patterns

The conversion prompt card is a **new pattern** — a frosted glass CTA card with heading, body, primary button, and dismissible secondary link. While it reuses the Dashboard Card Pattern's glass effect, the CTA layout (centered heading + body + button + link) is new. Flag as `[UNVERIFIED]` during planning until visual verification confirms it fits the page.

---

## Out of Scope

- Pray tab auth gate changes (stays as-is — logged-in feature)
- Real AI generation (still using mock responses — Phase 3)
- Ask page conversation persistence beyond React state (known, acceptable)
- Auth modal form improvements (separate spec)
- Registration marketing page (the "Get Started" CTA routes to `/register` which is currently a stub)
- Rate limiting for logged-out AI responses (Phase 3 concern — mock responses have no cost)
- Analytics/tracking for conversion funnel (future enhancement)
- A/B testing of conversion prompt copy (future enhancement)

---

## Acceptance Criteria

- [ ] Logged-out user can type in the hero input and submit without seeing an auth modal
- [ ] Submitting the hero input navigates to `/ask?q={text}` for all users (logged-in and logged-out)
- [ ] The Ask page reads the `q` param and generates a mock AI response for logged-out users
- [ ] The first AI response displays fully (text, verse cards, suggested prayer, formatting) without any auth interruption
- [ ] Copy button works without auth for logged-out users
- [ ] Share button works without auth for logged-out users
- [ ] Follow-up question submission triggers auth modal with "Sign in to continue the conversation" for logged-out users
- [ ] Follow-up chip clicks trigger auth modal with "Sign in to continue the conversation" for logged-out users
- [ ] "Journal about this" CTA triggers auth modal with "Sign in to save journal entries" for logged-out users
- [ ] "Pray about this" CTA triggers auth modal with "Sign in to generate prayers" for logged-out users
- [ ] Thumbs up/down feedback triggers auth modal with "Sign in to give feedback" for logged-out users
- [ ] A gentle inline conversion prompt card appears below the first response for logged-out users
- [ ] The conversion prompt uses frosted glass styling (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- [ ] The conversion prompt "Get Started — It's Free" button routes to `/register`
- [ ] The conversion prompt "Keep exploring" link dismisses the card
- [ ] The conversion prompt does NOT appear for logged-in users
- [ ] Crisis keyword detection works for logged-out users — `CrisisBanner` displays if crisis keywords are in the `q` param
- [ ] Logged-in users experience no changes — hero input, Ask page, and all actions work exactly as before
- [ ] The existing Ask page functionality is preserved for logged-in users: follow-up chips, verse card linking, conversation threading
- [ ] Conversion prompt renders correctly at 375px (mobile), 768px (tablet), and 1440px (desktop)
- [ ] Ask page response renders correctly at 375px, 768px, and 1440px
- [ ] Conversion prompt fades in after the AI response finishes rendering (using existing fade-in animation pattern)

---

## Test Requirements

- Test logged-out hero input submit → navigation to `/ask?q=text` (no auth modal)
- Test logged-out Ask page with `?q=` param → response generation → full response display
- Test logged-out follow-up question attempt → auth modal with correct message
- Test logged-out follow-up chip click → auth modal with correct message
- Test logged-out Journal CTA → auth modal with correct message
- Test logged-out Pray CTA → auth modal with correct message
- Test logged-out feedback buttons → auth modal with correct message
- Test logged-out Copy button → works without auth
- Test logged-out Share button → works without auth
- Test logged-out crisis keywords in `q` param → `CrisisBanner` displays
- Test logged-in user flow is unchanged (hero submit, response generation, follow-ups, all actions)
- Test conversion prompt renders only for logged-out users
- Test conversion prompt does not render for logged-in users
- Test conversion prompt dismissal via "Keep exploring"
- Test conversion prompt CTA routes to `/register`
