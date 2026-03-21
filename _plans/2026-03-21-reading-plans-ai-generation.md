# Implementation Plan: Reading Plans AI Plan Generation

**Spec:** `_specs/reading-plans-ai-generation.md`
**Date:** 2026-03-21
**Branch:** `claude/feature/reading-plans-ai-generation`
**Design System Reference:** `_plans/recon/design-system.md` (loaded, captured 2026-03-06)
**Recon Report:** not applicable (no external recon for this spec)
**Master Spec Plan:** Consumes data models from Reading Plans Specs 1-2 and Dashboard & Growth specs (Phase 2.75). No single master plan file — cross-spec dependencies documented in spec header and Architecture Context below.

> **Design System Recon Note:** Recon was captured 2026-03-06. Phase 2.85 and 2.9 additions have been implemented since then. The recon values for color palette, typography, and component patterns remain valid.

---

## Architecture Context

### Project Structure
- **Components:** `frontend/src/components/` — organized by feature (`reading-plans/`, `daily/`, `dashboard/`, `prayer-wall/`, `ui/`)
- **Pages:** `frontend/src/pages/` — one file per route (`ReadingPlans.tsx`, `ReadingPlanDetail.tsx`)
- **Hooks:** `frontend/src/hooks/` — custom hooks (`useReadingPlanProgress.ts`, `useAuth.ts`, `useFocusTrap.ts`)
- **Constants:** `frontend/src/constants/` — `reading-plans.ts`, `crisis-resources.ts`
- **Data:** `frontend/src/data/reading-plans/` — 10 plan data files + `index.ts`
- **Types:** `frontend/src/types/reading-plans.ts`
- **Tests:** Co-located `__tests__/` directories

### Key Existing Files This Spec Touches

| File | Purpose | What This Spec Changes |
|------|---------|----------------------|
| `pages/ReadingPlans.tsx` | Browser page `/reading-plans` | Add "Create Your Own Plan" card above grid, add `?create=true` flow, add "Created for you" badge logic |
| `components/reading-plans/PlanCard.tsx` | Individual plan card | Add optional "Created for you" badge |
| `constants/reading-plans.ts` | Plan-related constants | Add `CUSTOM_PLANS_KEY` constant, keyword matching map |

### Component/Service Patterns to Follow

- **CrisisBanner pattern:** `<CrisisBanner text={textValue} />` — import from `@/components/daily/CrisisBanner`. Renders when `containsCrisisKeyword(text)` is true. Uses `role="alert"` with crisis hotlines.
- **Auth gating pattern:** `useAuth()` for `isAuthenticated`, `useAuthModal()?.openAuthModal(message)` for logged-out interception. See `ReadingPlans.tsx` line 106-108.
- **Textarea glow-pulse pattern:** From `PrayTabContent.tsx` — `animate-glow-pulse` Tailwind animation class, cyan/violet glow keyframes (tailwind.config.js lines 30-39, 164).
- **Bouncing dots pattern:** Three `<span>` elements with `animate-bounce`, staggered `[animation-delay:0ms]`, `[animation-delay:150ms]`, `[animation-delay:300ms]`. See `PrayTabContent.tsx` lines 336-347.
- **Toast pattern:** `const { showToast } = useToast()` — import from `@/components/ui/Toast`.
- **PlanCard pattern:** Light-themed card on `bg-neutral-bg`. `rounded-xl border border-gray-200 bg-white p-6 shadow-sm`. See `PlanCard.tsx`.
- **Detail page dark background:** `DETAIL_HERO_STYLE` from `ReadingPlanDetail.tsx` lines 20-24: `radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0D0620 100%)`.
- **Query param handling:** `useSearchParams()` from `react-router-dom` for `?create=true` detection.

### Test Patterns

- **Provider wrapping:** `MemoryRouter` with future flags (`{ v7_startTransition: true, v7_relativeSplatPath: true }`). `AuthProvider` for auth-dependent components. `ToastProvider` when toasts are used.
- **localStorage:** `beforeEach(() => { localStorage.clear() })` for isolation.
- **User interaction:** `const user = userEvent.setup()`, `await user.click(...)`, `await user.type(...)`.
- **Selectors:** Prefer `screen.getByRole()`, `screen.getByText()` over `screen.getByTestId()`.
- **Mock pattern:** `vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ ... }) }))`.

### Cross-Spec Data Dependencies

| localStorage Key | Owner | This Spec's Access | Description |
|------------------|-------|-------------------|-------------|
| `wr_reading_plan_progress` | Spec 1 (reading-plans-browser) | Read | Plan progress data (for badge display) |
| `wr_custom_plans` | **This spec (NEW)** | Read + Write | Array of generated plan IDs |

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Click "Create Plan" button | Auth modal: "Sign in to create a personalized reading plan" | Step 2 | `useAuth` + `useAuthModal?.openAuthModal()` |
| Access creation flow (Steps 1-3) | Not accessible for logged-out (button intercepts) | Step 2 | Auth check on button prevents flow entry |

---

## Design System Values (for UI steps)

Values from codebase inspection and design system recon (2026-03-06):

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Detail page dark bg | background-image | `radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0D0620 100%)` | ReadingPlanDetail.tsx:21-22 |
| Primary CTA button | styles | `bg-primary text-white font-semibold py-3 px-6 rounded-lg` | design-system.md |
| Frosted glass card | styles | `bg-white/5 border border-white/10 rounded-xl p-5` | spec |
| Caveat heading | class | `font-script text-4xl sm:text-5xl text-white` | design-system.md |
| Lora verse | class | `font-serif italic text-white/60 text-base leading-relaxed` | spec |
| Glow-pulse animation | keyframes | `2.5s ease-in-out infinite`, cyan/violet box-shadow | tailwind.config.js:30-39, 164 |
| Bouncing dots | pattern | `animate-bounce rounded-full bg-primary`, delays: 0ms, 150ms, 300ms | PrayTabContent.tsx:336-347 |
| Light plan card | styles | `rounded-xl border border-gray-200 bg-white p-6 shadow-sm` | PlanCard.tsx:57 |
| Primary color | hex | `#6D28D9` / `bg-primary` | 09-design-system.md |
| Primary Light | hex | `#8B5CF6` / `text-primary-lt` | 09-design-system.md |
| Success green | hex | `#27AE60` / `text-success` | 09-design-system.md |
| Glow cyan | hex | `#00D4FF` / `glow-cyan` | 09-design-system.md |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Worship Room uses **Caveat** (`font-script`) for script/highlighted headings, not Lora
- **Lora** (`font-serif`) is for scripture text and verses, always italic
- **Inter** (`font-sans`, default) is for all body text and UI labels
- The reading plans browser page uses a **light background** (`bg-neutral-bg`) — not the dark dashboard theme
- Plan cards on the browser are light-themed: `border-gray-200 bg-white shadow-sm`
- The detail page uses a dark gradient hero — reuse `DETAIL_HERO_STYLE` for the creation flow
- The `animate-glow-pulse` animation is on the textarea itself (not a wrapper)
- All `max-w-2xl` for content columns
- `containsCrisisKeyword()` is from `@/constants/crisis-resources`
- `CrisisBanner` is from `@/components/daily/CrisisBanner`
- Bouncing dots use Tailwind's built-in `animate-bounce` with staggered delays, NOT a custom animation

---

## Shared Data Models

```typescript
// types/reading-plans.ts — ReadingPlan (READ-ONLY, from Spec 1)
export interface ReadingPlan {
  id: string
  title: string
  description: string
  theme: PlanTheme
  durationDays: 7 | 14 | 21
  difficulty: PlanDifficulty
  coverEmoji: string
  days: PlanDayContent[]
}

export type PlanTheme = 'anxiety' | 'grief' | 'gratitude' | 'identity' | 'forgiveness'
  | 'trust' | 'hope' | 'healing' | 'purpose' | 'relationships'
```

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_custom_plans` | Read + Write | Array of plan ID strings generated for the user |
| `wr_reading_plan_progress` | Read (via `useReadingPlanProgress`) | Plan progress for status display |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Single column, full-width buttons, chips wrap to 2 rows of 3, duration cards stack vertically |
| Tablet | 640-1024px | Centered layouts, duration cards in horizontal row, buttons auto-width |
| Desktop | > 1024px | Content constrained to `max-w-2xl`, chips single row, duration cards horizontal |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| PageHero → Create card | `py-8 sm:py-10` (section padding) | ReadingPlans.tsx:155 |
| Create card → FilterBar | `mt-6` (16-24px) | Existing pattern in ReadingPlans.tsx |
| FilterBar → Plan grid | `mt-6` (24px) | ReadingPlans.tsx:165 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Spec 1 (reading-plans-browser) and Spec 2 (reading-plans-progress-dashboard) are complete and committed on `main`
- [ ] The `useReadingPlanProgress` hook exports `getActivePlanId()`, `getProgress()`, `getPlanStatus()`, `startPlan()` as documented
- [ ] The `CrisisBanner` component is available at `@/components/daily/CrisisBanner`
- [ ] The `useToast` hook is available at `@/components/ui/Toast`
- [ ] The `animate-glow-pulse` animation is defined in `tailwind.config.ts`
- [ ] All auth-gated actions from the spec are accounted for in the plan
- [ ] Design system values are verified (from reference and codebase inspection)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Creation flow as query param vs separate route | `?create=true` query param within `/reading-plans` route | Spec requirement 5: "within the `/reading-plans` route, activated by the `?create=true` query parameter" |
| Step state management | React `useState` with step counter (1-3) | No persistence needed — steps 1-2 are ephemeral. Simple local state is sufficient. |
| Keyword matching order | Top-to-bottom scan, first match wins | Spec requirement 23: "use the first match found (scan the table top to bottom)" |
| Duration selection not used in mock | Store but don't use for matching | Spec "Out of Scope": duration filtering deferred to Phase 3+ real AI |
| Browser back during Step 3 | Blocked via `beforeunload` or disabled back button | Spec: "no back navigation from Step 3 (loading state)" |
| Duplicate plan ID in `wr_custom_plans` | Skip duplicate via Set dedup before saving | Spec edge case: "The plan ID is already in `wr_custom_plans`, so no duplicate is added" |
| Chip replaces textarea content | Full replacement, cursor at end | Spec requirement 12: "If the textarea already has content, clicking a chip replaces it" |
| Create card position | Before FilterBar, inside the existing section | Card is part of the browsing experience, should feel like a first-class plan option |

---

## Implementation Steps

### Step 1: Add Constants & Keyword Matching Utility

**Objective:** Add the `wr_custom_plans` localStorage key constant and the keyword-to-plan matching function.

**Files to create/modify:**
- `frontend/src/constants/reading-plans.ts` — Add `CUSTOM_PLANS_KEY` constant
- `frontend/src/utils/plan-matcher.ts` — New utility for keyword matching

**Details:**

1. In `constants/reading-plans.ts`, add:
   ```typescript
   export const CUSTOM_PLANS_KEY = 'wr_custom_plans';
   ```

2. Create `utils/plan-matcher.ts` with the keyword matching function:
   ```typescript
   const KEYWORD_MAP: { keywords: string[]; planId: string }[] = [
     { keywords: ['anxiety', 'worry', 'stress', 'anxious', 'overwhelmed', 'panic'], planId: 'finding-peace-in-anxiety' },
     { keywords: ['grief', 'loss', 'death', 'mourning', 'died', 'passing', 'gone'], planId: 'walking-through-grief' },
     { keywords: ['gratitude', 'thankful', 'grateful', 'blessings', 'appreciate'], planId: 'the-gratitude-reset' },
     { keywords: ['identity', 'who am i', 'self-worth', 'insecurity', 'confidence'], planId: 'knowing-who-you-are-in-christ' },
     { keywords: ['forgive', 'forgiveness', 'resentment', 'bitter', 'grudge', 'hurt by'], planId: 'the-path-to-forgiveness' },
     { keywords: ['trust', 'doubt', 'uncertain', 'faith wavering', 'hard to believe'], planId: 'learning-to-trust-god' },
     { keywords: ['hope', 'hopeless', 'despair', 'dark times', 'no way out'], planId: 'hope-when-its-hard' },
     { keywords: ['healing', 'broken', 'wounded', 'trauma', 'pain', 'recovering'], planId: 'healing-from-the-inside-out' },
     { keywords: ['purpose', 'meaning', 'direction', 'calling', 'what should i do'], planId: 'discovering-your-purpose' },
     { keywords: ['relationship', 'marriage', 'friendship', 'family', 'lonely', 'isolated'], planId: 'building-stronger-relationships' },
   ];

   const DEFAULT_PLAN_ID = 'learning-to-trust-god';

   export function matchPlanByKeywords(input: string): string {
     const lower = input.toLowerCase();
     for (const { keywords, planId } of KEYWORD_MAP) {
       if (keywords.some(kw => lower.includes(kw))) {
         return planId;
       }
     }
     return DEFAULT_PLAN_ID;
   }
   ```

3. Create `utils/custom-plans-storage.ts` for reading/writing `wr_custom_plans`:
   ```typescript
   import { CUSTOM_PLANS_KEY } from '@/constants/reading-plans';

   export function getCustomPlanIds(): string[] {
     try {
       const raw = localStorage.getItem(CUSTOM_PLANS_KEY);
       return raw ? JSON.parse(raw) : [];
     } catch {
       return [];
     }
   }

   export function addCustomPlanId(planId: string): void {
     const existing = getCustomPlanIds();
     if (!existing.includes(planId)) {
       existing.push(planId);
       localStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(existing));
     }
   }
   ```

**Guardrails (DO NOT):**
- DO NOT modify any existing plan data files
- DO NOT import or depend on any backend API
- DO NOT use `wr_reading_plan_progress` for writes — that's owned by Spec 1

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `matchPlanByKeywords returns correct plan for each keyword set` | unit | Test all 10 keyword groups with sample input |
| `matchPlanByKeywords falls back to learning-to-trust-god` | unit | Test with no-match input |
| `matchPlanByKeywords is case-insensitive` | unit | Test with mixed case input |
| `matchPlanByKeywords matches multi-word keywords` | unit | Test "who am i", "hurt by", "what should i do" |
| `getCustomPlanIds returns empty array by default` | unit | No localStorage → empty array |
| `addCustomPlanId stores and deduplicates` | unit | Add same ID twice → only one entry |

**Expected state after completion:**
- [ ] `matchPlanByKeywords()` correctly maps all keyword sets
- [ ] `getCustomPlanIds()` / `addCustomPlanId()` handle localStorage CRUD
- [ ] All tests pass

---

### Step 2: Create Plan Creation Flow Component

**Objective:** Build the 3-step creation wizard as a standalone component that renders within the `/reading-plans` route when `?create=true` is present.

**Files to create:**
- `frontend/src/components/reading-plans/CreatePlanFlow.tsx` — Main wizard component with 3 steps

**Details:**

1. Create `CreatePlanFlow.tsx` with these props:
   ```typescript
   interface CreatePlanFlowProps {
     onClose: () => void; // navigate back to /reading-plans (remove ?create=true)
   }
   ```

2. **State management:**
   ```typescript
   const [step, setStep] = useState(1);
   const [topicText, setTopicText] = useState('');
   const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
   const [isGenerating, setIsGenerating] = useState(false);
   ```

3. **Full-screen dark background:** Use `DETAIL_HERO_STYLE` pattern:
   ```typescript
   const CREATION_BG_STYLE = {
     backgroundImage:
       'radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0D0620 100%)',
     backgroundSize: '100% 100%',
   } as const;
   ```
   Apply as `min-h-screen` with `style={CREATION_BG_STYLE}`.

4. **Progress dots:** 3 dots centered at the top:
   ```tsx
   <div className="flex justify-center gap-2 pt-8" aria-label={`Step ${step} of 3`}>
     {[1, 2, 3].map((n) => (
       <div key={n} className={cn('h-2 w-2 rounded-full', n === step ? 'bg-primary' : 'bg-white/20')} />
     ))}
   </div>
   ```

5. **Back navigation:**
   - Back arrow button at top-left (Lucide `ArrowLeft`), `text-white/50 hover:text-white`, min-h 44px
   - Step 1: `onClose()` (removes `?create=true`, returns to browser)
   - Step 2: `setStep(1)`
   - Step 3: hidden (no back during generation)
   - Escape key: `useEffect` with keydown listener for `Escape`, same behavior as back button

6. **Step 1 — "What's on your heart?":**
   - Heading: `<h1 className="font-script text-4xl sm:text-5xl text-white text-center mt-8">What's on your heart?</h1>`
   - Textarea: `max-w-2xl mx-auto mt-8`, 500 char max, `maxLength={500}`, placeholder: "I'm struggling with anxiety about my job..."
   - Textarea classes: `w-full rounded-xl border border-glow-cyan/30 bg-white/5 p-4 text-white placeholder:text-white/30 backdrop-blur-sm resize-none min-h-[120px] animate-glow-pulse focus:outline-none focus:ring-2 focus:ring-primary/50`
   - Character count: `<p className="text-right text-xs text-white/40 mt-2">{topicText.length}/500</p>`
   - CrisisBanner: `<CrisisBanner text={topicText} />` above textarea
   - 6 topic chips below textarea, in `flex flex-wrap justify-center gap-2 mt-6 max-w-2xl mx-auto`:
     ```typescript
     const TOPIC_CHIPS = [
       { label: 'Anxiety', starter: "I've been feeling anxious about..." },
       { label: 'Grief', starter: "I'm grieving the loss of..." },
       { label: 'Relationship struggles', starter: "I'm struggling in my relationship with..." },
       { label: 'Finding purpose', starter: "I've been searching for my purpose because..." },
       { label: 'Strengthening faith', starter: "I want to grow deeper in my faith because..." },
       { label: 'Forgiveness', starter: "I'm trying to forgive..." },
     ];
     ```
   - Chip: `<button>` with `rounded-full px-4 py-2 text-sm bg-white/10 text-white/80 border border-white/15 hover:bg-white/15 transition-colors min-h-[44px]`
   - On chip click: `setTopicText(starter)`, then focus textarea and place cursor at end via `ref.current?.setSelectionRange(starter.length, starter.length)`
   - "Next" button: `bg-primary text-white font-semibold py-3 px-6 rounded-lg w-full sm:w-auto mt-8`, `disabled={!topicText.trim()}`, `opacity-50 cursor-not-allowed` when disabled

7. **Step 2 — "How long of a journey?":**
   - Heading: same Caveat style as Step 1
   - 3 duration cards in `flex flex-col sm:flex-row gap-4 mt-8 max-w-2xl mx-auto`:
     ```typescript
     const DURATION_OPTIONS = [
       { days: 7, label: 'Quick Focus', description: 'A focused week to address what\'s on your heart', icon: Zap },
       { days: 14, label: 'Deeper Dive', description: 'Two weeks to explore and reflect more deeply', icon: Layers },
       { days: 21, label: 'Full Transformation', description: 'Three weeks to build lasting spiritual habits', icon: Sunrise },
     ];
     ```
   - Each card: `<button>` with `bg-white/5 border rounded-xl p-5 text-left transition-all min-h-[44px] w-full sm:flex-1`, `hover:bg-white/10`
   - Selected: `border-primary shadow-[0_0_15px_rgba(109,40,217,0.3)]`, unselected: `border-white/10`
   - `aria-pressed={selectedDuration === days}`
   - "Generate My Plan" button: same primary style, `disabled={!selectedDuration}`, text: "Generate My Plan"

8. **Step 3 — "Generating your plan...":**
   - Center-aligned content with generous padding
   - Bouncing dots: 3 `<span>` elements matching PrayTabContent pattern
   - `motion-reduce:animate-none` for reduced motion
   - Message: `<p className="text-lg text-white/80 mt-6">Creating a Scripture journey just for you...</p>`
   - Verse: `<blockquote className="font-serif italic text-white/60 text-base mt-8 leading-relaxed">For I know the plans I have for you, declares the Lord.</blockquote>`
   - Attribution: `<p className="text-white/40 text-sm mt-2">— Jeremiah 29:11 WEB</p>`
   - `aria-live="polite"` container announcing the loading state
   - On mount of step 3: `setTimeout` of 2500ms, then:
     1. Call `matchPlanByKeywords(topicText)` to get `planId`
     2. Call `addCustomPlanId(planId)` to store in localStorage
     3. Call `navigate(`/reading-plans/${planId}`)` to go to plan detail
     4. Call `showToast('Your personalized plan is ready!')` via `useToast`

9. **Step transitions:** Fade effect — wrap step content in a div with `key={step}` and CSS transition:
   ```css
   opacity: 0 → 1, transition: opacity 300ms ease-out
   ```
   Use state-triggered animation (set visible on mount via `useEffect` + `requestAnimationFrame`).

**Auth gating:**
- The creation flow is only accessible via the "Create Plan" button which is auth-gated in Step 3 (the browser page integration). No additional auth checks needed inside the flow component itself.

**Responsive behavior:**
- Desktop (> 1024px): `max-w-2xl` centered content, chips in single row, duration cards in `sm:flex-row`
- Tablet (640-1024px): Same as desktop (sm breakpoint handles cards)
- Mobile (< 640px): Full-width textarea, chips wrap naturally, duration cards stack via `flex-col`, buttons full-width via `w-full sm:w-auto`

**Guardrails (DO NOT):**
- DO NOT persist any data during Steps 1-2 (React state only)
- DO NOT allow back navigation during Step 3 (hide back button, ignore Escape)
- DO NOT use `dangerouslySetInnerHTML` for any content
- DO NOT block crisis banner — it's informational, not blocking (user can still proceed)
- DO NOT render the flow in a modal — it's a full-screen view with its own background

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Renders Step 1 with heading and textarea` | unit | Verify "What's on your heart?" heading, textarea visible |
| `Topic chip pre-fills textarea` | unit | Click "Anxiety" chip → textarea contains starter sentence |
| `Next button disabled when textarea empty` | unit | Verify disabled state |
| `Next button enabled when textarea has text` | unit | Type text → button enabled |
| `Character count shows X/500` | unit | Type text → count updates |
| `CrisisBanner appears on crisis keywords` | unit | Type "suicide" → crisis banner visible |
| `Step 2 renders duration cards` | unit | Click Next → 3 duration cards visible |
| `Duration card selection (radio behavior)` | unit | Click 7-day → selected, click 14-day → only 14-day selected |
| `Generate button disabled when no duration` | unit | No selection → disabled |
| `Step 3 shows loading animation` | unit | Click Generate → bouncing dots + message + verse |
| `Escape navigates back from Step 1` | unit | Press Escape on Step 1 → onClose called |
| `Escape navigates back from Step 2` | unit | Press Escape on Step 2 → returns to Step 1 |
| `Escape does nothing on Step 3` | unit | Press Escape on Step 3 → no change |
| `Back arrow navigates correctly` | unit | Click back on Step 2 → Step 1 |
| `Progress dots show current step` | unit | Step 2 → second dot is bg-primary |
| `Reduced motion disables bounce animation` | unit | `prefers-reduced-motion` → no animate-bounce |

**Expected state after completion:**
- [ ] 3-step creation wizard renders correctly
- [ ] Step transitions work with back navigation and Escape
- [ ] Crisis detection works on textarea
- [ ] Topic chips pre-fill textarea
- [ ] Duration cards have radio behavior
- [ ] Step 3 shows loading state and triggers plan matching after 2500ms

---

### Step 3: Integrate Creation Flow into ReadingPlans Page

**Objective:** Add the "Create Your Own Plan" card to the browser page, handle `?create=true` query param to show the creation flow, and add "Created for you" badge to plan cards.

**Files to modify:**
- `frontend/src/pages/ReadingPlans.tsx` — Add Create card, handle query param, integrate flow
- `frontend/src/components/reading-plans/PlanCard.tsx` — Add optional "Created for you" badge

**Details:**

1. **In `ReadingPlans.tsx`:**
   - Import `useSearchParams` from `react-router-dom`
   - Import `CreatePlanFlow` from `@/components/reading-plans/CreatePlanFlow`
   - Import `Sparkles` from `lucide-react`
   - Import `getCustomPlanIds` from `@/utils/custom-plans-storage`
   - Add: `const [searchParams, setSearchParams] = useSearchParams()`
   - Add: `const showCreateFlow = searchParams.get('create') === 'true'`
   - Add: `const customPlanIds = getCustomPlanIds()`

2. **When `showCreateFlow` is true:** Render `<CreatePlanFlow onClose={() => setSearchParams({})} />` instead of the normal page content. The entire Layout/PageHero/section is replaced by the full-screen flow.

3. **"Create Your Own Plan" card:** Insert above the FilterBar inside the existing section:
   ```tsx
   <div className="mb-6 rounded-xl border border-primary/10 bg-white p-6 shadow-sm">
     <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
       <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
         <Sparkles className="h-6 w-6 text-primary" />
       </div>
       <div className="flex-1">
         <h3 className="text-lg font-bold text-text-dark">Create Your Own Plan</h3>
         <p className="mt-1 text-sm text-text-light">
           Tell us what you&apos;re going through and we&apos;ll create a personalized Scripture journey just for you.
         </p>
       </div>
       <button
         type="button"
         onClick={handleCreatePlan}
         className="min-h-[44px] w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-lt sm:w-auto"
       >
         Create Plan
       </button>
     </div>
   </div>
   ```

4. **`handleCreatePlan` function:**
   ```typescript
   const handleCreatePlan = useCallback(() => {
     if (!isAuthenticated) {
       authModal?.openAuthModal('Sign in to create a personalized reading plan');
       return;
     }
     setSearchParams({ create: 'true' });
   }, [isAuthenticated, authModal, setSearchParams]);
   ```

5. **PlanCard badge:** Add `isCustom` prop to `PlanCard`:
   ```typescript
   interface PlanCardProps {
     plan: ReadingPlan
     status: 'unstarted' | 'active' | 'paused' | 'completed'
     progress?: PlanProgress
     onStart: (planId: string) => void
     isCustom?: boolean // NEW
   }
   ```
   In the card JSX, after the emoji div, add:
   ```tsx
   {isCustom && (
     <span className="mb-2 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary-lt">
       Created for you
     </span>
   )}
   ```
   Pass `isCustom={customPlanIds.includes(plan.id)}` from `ReadingPlans.tsx`.

**Auth gating:**
- "Create Plan" button: `if (!isAuthenticated)` → auth modal with "Sign in to create a personalized reading plan"
- Card and badge are visible to all (no auth gate)

**Responsive behavior:**
- Create card: on mobile, icon + text + button stack vertically via `flex-col`. On desktop, `sm:flex-row sm:items-center` makes it horizontal.
- Badge: small inline pill, wraps with other content naturally.

**Guardrails (DO NOT):**
- DO NOT create a separate route for the creation flow — use `?create=true` query param
- DO NOT show "Created for you" badge for logged-out users (they have no `wr_custom_plans` data)
- DO NOT modify the existing ConfirmDialog or filter logic
- DO NOT change the existing PlanCard light-theme styling

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Create card renders on browser page` | unit | Verify "Create Your Own Plan" heading, Sparkles icon, button |
| `Create Plan button triggers auth modal for logged-out` | unit | Mock logged-out, click → auth modal with correct message |
| `Create Plan button opens flow for logged-in` | unit | Mock logged-in, click → ?create=true in URL |
| `Creation flow renders when ?create=true` | integration | Navigate with query param → flow visible, browser hidden |
| `Closing flow removes query param` | integration | onClose → back to browser page |
| `Created for you badge shows on custom plans` | unit | Seed wr_custom_plans → badge visible on matching card |
| `Badge not shown when wr_custom_plans empty` | unit | No seed → no badge on any card |
| `Existing plan cards unchanged` | regression | All 10 plans render correctly with/without badge |

**Expected state after completion:**
- [ ] "Create Your Own Plan" card appears above filter bar on browser page
- [ ] Auth modal fires for logged-out users clicking "Create Plan"
- [ ] `?create=true` shows creation flow, closing returns to browser
- [ ] "Created for you" badge appears on plan cards in `wr_custom_plans`
- [ ] All existing tests pass

---

### Step 4: End-to-End Integration & Tests

**Objective:** Write integration tests for the full creation flow from card click to plan detail navigation, and ensure all pieces work together.

**Files to create:**
- `frontend/src/components/reading-plans/__tests__/CreatePlanFlow.test.tsx` — Unit tests for the wizard
- `frontend/src/pages/__tests__/ReadingPlans-create.test.tsx` — Integration tests for the browser page with creation flow
- `frontend/src/utils/__tests__/plan-matcher.test.ts` — Unit tests for keyword matching
- `frontend/src/utils/__tests__/custom-plans-storage.test.ts` — Unit tests for localStorage helper

**Details:**

1. **`plan-matcher.test.ts`:** Cover all 10 keyword groups + fallback + case-insensitivity + multi-word keywords.

2. **`custom-plans-storage.test.ts`:** Cover `getCustomPlanIds()` (empty, populated, malformed JSON) and `addCustomPlanId()` (add new, deduplicate).

3. **`CreatePlanFlow.test.tsx`:** All step transitions, chip interactions, textarea behavior, character count, crisis detection, duration selection, loading state, escape key, back navigation, reduced motion.

4. **`ReadingPlans-create.test.tsx`:** Create card rendering, auth gating, query param flow toggle, badge rendering.

**Guardrails (DO NOT):**
- DO NOT test real navigation (mock `useNavigate`)
- DO NOT test real localStorage persistence in component tests (mock the storage utils)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All keyword groups match correctly | unit | 10 tests covering each keyword set |
| Fallback to default plan | unit | No-match input → learning-to-trust-god |
| Full flow: type → select duration → generate → navigate | integration | Simulate complete user journey |
| Auth gate prevents flow entry | integration | Logged-out click → auth modal, no flow |
| Badge rendering with seeded data | unit | Seed localStorage → badge visible |

**Expected state after completion:**
- [ ] All unit tests pass for matcher and storage utils
- [ ] All component tests pass for CreatePlanFlow
- [ ] All integration tests pass for ReadingPlans page with creation flow
- [ ] `pnpm test` passes with zero failures

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Constants & keyword matching utility |
| 2 | 1 | CreatePlanFlow wizard component |
| 3 | 1, 2 | Browser page integration & badge |
| 4 | 1, 2, 3 | End-to-end tests |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Constants & Keyword Matching | [COMPLETE] | 2026-03-21 | Added `CUSTOM_PLANS_KEY` to `constants/reading-plans.ts`. Created `utils/plan-matcher.ts` (keyword matching) and `utils/custom-plans-storage.ts` (localStorage CRUD). Tests: `utils/__tests__/plan-matcher.test.ts` (15 tests), `utils/__tests__/custom-plans-storage.test.ts` (6 tests). All pass. |
| 2 | Create Plan Creation Flow | [COMPLETE] | 2026-03-21 | Created `components/reading-plans/CreatePlanFlow.tsx` (3-step wizard with StepOne/StepTwo/StepThree sub-components). Tests: `__tests__/CreatePlanFlow.test.tsx` (17 tests). All pass. |
| 3 | Integrate into ReadingPlans Page | [COMPLETE] | 2026-03-21 | Modified `pages/ReadingPlans.tsx` (Create card, ?create=true flow toggle, badge prop passing). Modified `components/reading-plans/PlanCard.tsx` (isCustom prop + "Created for you" badge). All existing tests pass. |
| 4 | End-to-End Tests | [COMPLETE] | 2026-03-21 | Created `pages/__tests__/ReadingPlans-create.test.tsx` (8 integration tests). Unit tests for plan-matcher (14 tests) and custom-plans-storage (6 tests) created in Step 1. CreatePlanFlow tests (17 tests) created in Step 2. Total new tests: 45. All 300 test files pass (3041 tests). |
