# Implementation Plan: Devotional Prompt Passing

**Spec:** `_specs/devotional-prompt-passing.md`
**Date:** 2026-04-06
**Branch:** `claude/feature/devotional-prompt-passing`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- Components: `frontend/src/components/daily/`
- Pages: `frontend/src/pages/`
- Types: `frontend/src/types/`
- Constants: `frontend/src/constants/`
- Tests: `frontend/src/components/daily/__tests__/` and `frontend/src/pages/__tests__/`

### Key Files

| File | Path | Role |
|------|------|------|
| PrayContext type | `frontend/src/types/daily-experience.ts:107-110` | Current: `{ from: 'pray' \| 'devotional', topic: string }` — needs `customPrompt?` field |
| DailyHub | `frontend/src/pages/DailyHub.tsx` | Parent page managing PrayContext state, tab switching, cross-tab callbacks |
| DevotionalTabContent | `frontend/src/components/daily/DevotionalTabContent.tsx` | CTAs at lines 308-323: `onSwitchToJournal(devotional.theme)`, `onSwitchToPray(\`I'm reflecting on ${devotional.passage.reference}...\`)` |
| JournalTabContent | `frontend/src/components/daily/JournalTabContent.tsx` | Receives `prayContext` prop, manages mode/prompt/context state |
| JournalInput | `frontend/src/components/daily/JournalInput.tsx` | Context banner (line 192-207), prompt card (line 211-231), textarea (line 249-264), draft auto-save |
| PrayTabContent | `frontend/src/components/daily/PrayTabContent.tsx` | Receives `initialContext` prop, pre-fills textarea via `initialText` state |
| PrayerInput | `frontend/src/components/daily/PrayerInput.tsx` | Consumes `initialText` prop, syncs to textarea via useEffect |
| Devotional data | `frontend/src/data/devotionals.ts` | `reflectionQuestion` prefixed with "Something to think about today: " |

### Existing Data Flow

```
DevotionalTabContent
  ├─ "Journal about this" → onSwitchToJournal(devotional.theme)
  │   └─ DailyHub.handleSwitchToDevotionalJournal(topic)
  │       └─ setPrayContext({ from: 'devotional', topic })
  │       └─ switchTab('journal')
  │           └─ JournalTabContent: checks prayContext.from but has NO devotional-specific handling yet
  │
  └─ "Pray about today's reading" → onSwitchToPray(`I'm reflecting on ${passage.reference}...`)
      └─ DailyHub.handleSwitchToDevotionalPray(context)
          └─ setPrayContext({ from: 'devotional', topic: context })
          └─ switchTab('pray')
              └─ PrayTabContent: receives NO devotional context (initialContext only from URL params)
```

### What Needs to Change

1. **PrayContext type** gains `customPrompt?: string` — backward-compatible (optional field)
2. **DevotionalTabContent** passes richer data: reflection question (stripped prefix) as `customPrompt`, theme as `topic`
3. **DailyHub** passes `customPrompt` through callbacks and also feeds `prayContext` to PrayTabContent
4. **JournalTabContent** adds devotional-specific handling: auto-select Guided mode, custom prompt, devotional context banner, draft conflict dialog, scroll-to-input
5. **JournalInput** renders devotional-specific context banner and uses `customPrompt` for prompt card
6. **PrayTabContent** consumes `prayContext` for devotional pre-fill and scroll-to-input

### Existing Context Systems (Must Not Break)

| Context Source | PrayContext.from | PrayContext.topic | How It Works |
|---------------|-----------------|------------------|-------------|
| Pray → Journal | `'pray'` | extracted topic (e.g., "anxiety") | Banner: "Continuing from your prayer about {topic}", auto-Guided, custom reflect prompt |
| Prayer Wall → Journal | N/A (uses `location.state.prayWallContext`) | N/A | Sets `contextPrompt` state directly |
| Challenge → Journal | N/A (uses `location.state.challengeContext`) | N/A | Sets `contextPrompt` state directly |
| URL param → Journal | N/A (uses `urlPrompt` prop) | N/A | Sets `contextPrompt` state directly |
| Prayer Wall → Pray | N/A (uses `location.state.prayWallContext`) | N/A | Sets `initialText` directly |
| URL param → Pray | N/A (uses `initialContext` prop from `urlContext`) | N/A | Sets `initialText` directly |
| Challenge → Pray | N/A (uses `location.state.challengeContext`) | N/A | Sets `initialText` directly |

**Critical**: Devotional context flows through `PrayContext` (same as Pray → Journal). The `from: 'devotional'` discriminator differentiates them. All other context flows use `location.state` or URL params and remain completely untouched.

### Test Patterns

- Provider wrapping: `MemoryRouter` → `ToastProvider` → `AuthModalProvider` → Component
- Some tests also wrap `AuthProvider` when `useAuth` is used
- PrayTabContent tests additionally mock `AudioProvider`, `useScenePlayer`, `useReducedMotion`
- Mock patterns: `vi.mock()` for hooks, `vi.fn()` for callbacks
- User events: `userEvent.setup()` pattern

### localStorage Keys Touched

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_journal_draft` | Read (draft conflict check) / Write (clear on "Start fresh") | Existing key — no new keys introduced |
| `wr_journal_mode` | Write (set to 'guided' on devotional context) | Existing key |

---

## Auth Gating Checklist

**No new auth gates introduced.** The tab-switching CTAs are not auth-gated. Downstream actions (journal save, prayer generation) are already gated.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Click "Journal about this" | No gate — tab switch only | Step 2 | N/A (not gated) |
| Click "Pray about today's reading" | No gate — tab switch only | Step 2 | N/A (not gated) |
| Draft conflict "Start fresh" | No gate | Step 4 | N/A (not gated) |
| Draft conflict "Keep my current draft" | No gate | Step 4 | N/A (not gated) |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Context banner (existing) | border | `border border-primary/20` | JournalInput.tsx:194 |
| Context banner (existing) | background | `bg-primary/5` | JournalInput.tsx:194 |
| Context banner (existing) | padding | `p-3` | JournalInput.tsx:194 |
| Context banner (existing) | text | `text-sm text-white/80` | JournalInput.tsx:195 |
| Context banner dismiss link | style | `text-xs text-primary underline hover:text-primary-light` | JournalInput.tsx:202 |
| Draft conflict dialog | card | `rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm` | Spec design notes (matches FrostedCard) |
| Draft conflict dialog | shadow | `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` | design-system.md FrostedCard |
| Primary button | background | `bg-primary` → `hover:bg-primary-light` | JournalInput.tsx:323 |
| Ghost button | style | `border border-white/[0.12] bg-transparent text-white hover:bg-white/[0.06]` | Derived from FrostedCard hover pattern |
| Prompt card | style | `rounded-lg border-l-2 border-primary bg-white/[0.06] p-6` | JournalInput.tsx:213 |
| Prompt card text | style | `font-serif text-lg italic leading-relaxed text-white/80 sm:text-xl` | JournalInput.tsx:214 |

---

## Design System Reminder

- All tabs share `max-w-2xl` container width
- Context banners use `border-primary/20 bg-primary/5 p-3 rounded-lg` pattern
- Prompt card uses Lora italic rendering: `font-serif text-lg italic leading-relaxed text-white/80 sm:text-xl`
- FrostedCard: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl`
- Primary button: `bg-primary px-8 py-3 font-semibold text-white rounded-lg`
- Ghost button: `border border-white/[0.12] bg-transparent text-white rounded-lg`
- Dismiss link: `text-xs text-primary underline hover:text-primary-light`
- 44px minimum touch target on all interactive elements
- Draft auto-save uses `JOURNAL_DRAFT_KEY` constant (not raw string)
- `scrollIntoView({ behavior: 'smooth', block: 'center' })` + `.focus()` for scroll-to-input
- GlowBackground orbs always use `glowOpacity={0.30}` in production

---

## Shared Data Models

```typescript
// Extended PrayContext (backward-compatible)
export interface PrayContext {
  from: 'pray' | 'devotional'
  topic: string
  customPrompt?: string  // NEW: reflection question or combined prayer context
}
```

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_journal_draft` | Read / Write | Draft conflict check (read), clear on "Start fresh" (write/remove) |
| `wr_journal_mode` | Write | Auto-set to 'guided' when devotional context arrives |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Draft conflict dialog full-width within max-w-2xl container. Buttons stack via `flex-wrap`. Context banner full-width. |
| Tablet | 768px | Same as mobile with more padding. Buttons side-by-side. |
| Desktop | 1440px | Same as tablet. All content constrained to `max-w-2xl`. |

No breakpoint-specific layout changes beyond existing Journal/Pray responsive behavior.

---

## Vertical Rhythm

N/A — This feature modifies content within existing tab containers. No new sections or inter-section spacing introduced.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] `PrayContext` type is at `frontend/src/types/daily-experience.ts:107-110`
- [x] Devotional `reflectionQuestion` is prefixed with "Something to think about today: " (verified in `data/devotionals.ts:37`)
- [x] All auth-gated actions from the spec are accounted for (none — no new gates)
- [x] Design system values are verified from codebase inspection (JournalInput.tsx, FrostedCard.tsx)
- [ ] No [UNVERIFIED] values in this plan
- [x] All existing context flows identified and documented (Pray→Journal, PrayerWall→Journal, Challenge→Journal, URL→Journal, PrayerWall→Pray, Challenge→Pray, URL→Pray)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Reflection question prefix stripping | Strip `"Something to think about today: "` in DevotionalTabContent before passing | Prompt reads more naturally without the prefix when used in Journal/Pray context |
| Draft conflict trigger condition | Check `localStorage.getItem(JOURNAL_DRAFT_KEY)` AND current textarea `text` state | Both must be non-empty — localStorage alone is insufficient because text state may have been cleared |
| Draft conflict "safe default" | "Keep my current draft" is the visually secondary button (ghost style) BUT is the safe default for keyboard/focus | Matches spec: "Keep my current draft" is the safe default. Place it second (right side) and auto-focus it. |
| Devotional → Pray pre-fill format | `"I'm reflecting on {passage.reference}. {reflectionQuestion}"` | Combines passage context + reflection question for richer prayer starting point |
| Prompt priority when contextPrompt AND prayContext.customPrompt both exist | `contextPrompt` (from URL/PrayerWall/challenge) wins over devotional `customPrompt` | URL params and location.state are external navigation that should take priority. In practice both won't coexist. |
| Scroll-to-input timing | `requestAnimationFrame` → `scrollIntoView` + `focus` | Ensures DOM has updated after tab switch and state changes before scrolling |
| PrayTabContent prayContext prop | Add `prayContext` prop instead of repurposing `initialContext` | `initialContext` is consumed once via ref guard and comes from URL. PrayContext comes from React state and is the right channel for cross-tab context |

---

## Implementation Steps

### Step 1: Extend PrayContext Type

**Objective:** Add optional `customPrompt` field to PrayContext interface.

**Files to create/modify:**
- `frontend/src/types/daily-experience.ts` — Add `customPrompt?: string` to PrayContext

**Details:**

```typescript
export interface PrayContext {
  from: 'pray' | 'devotional'
  topic: string
  customPrompt?: string
}
```

This is backward-compatible. All existing callers that create `PrayContext` without `customPrompt` continue to work because the field is optional.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change the `from` union type — `'pray' | 'devotional'` is already sufficient
- DO NOT add any other fields — the spec only requires `customPrompt`
- DO NOT modify the `SavedJournalEntry` or other types in this file

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | — | Type-only change, verified by TypeScript compiler |

**Expected state after completion:**
- [x] PrayContext has `customPrompt?: string` field
- [x] TypeScript compiles clean (`pnpm tsc --noEmit`)
- [x] All existing tests pass unchanged

---

### Step 2: Update DevotionalTabContent CTA Callbacks

**Objective:** Pass richer data (reflection question + passage reference) through the cross-tab CTA callbacks.

**Files to create/modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — Update callback props and CTA click handlers

**Details:**

Change the props interface to pass both `topic` and `customPrompt`:

```typescript
interface DevotionalTabContentProps {
  onSwitchToJournal?: (topic: string, customPrompt: string) => void
  onSwitchToPray?: (topic: string, customPrompt: string) => void
  onComplete?: () => void
}
```

Add a helper to strip the reflection question prefix (above the component function):

```typescript
const REFLECTION_PREFIX = 'Something to think about today: '

function stripReflectionPrefix(question: string): string {
  return question.startsWith(REFLECTION_PREFIX)
    ? question.slice(REFLECTION_PREFIX.length)
    : question
}
```

Update the CTA click handlers (lines 308-323):

**"Journal about this" (line 311):**
```typescript
onClick={() => onSwitchToJournal?.(
  devotional.theme,
  stripReflectionPrefix(devotional.reflectionQuestion),
)}
```

**"Pray about today's reading" (line 318):**
```typescript
onClick={() => onSwitchToPray?.(
  devotional.theme,
  `I'm reflecting on ${devotional.passage.reference}. ${stripReflectionPrefix(devotional.reflectionQuestion)}`,
)}
```

**Auth gating:** N/A — CTAs are not auth-gated

**Responsive behavior:** N/A: no UI impact (callback signature change only)

**Guardrails (DO NOT):**
- DO NOT change CTA button styling or layout
- DO NOT change the `onComplete` callback
- DO NOT modify anything else in DevotionalTabContent — only the callback props interface and the two click handlers
- DO NOT add the prefix string as a constant in a separate file — it's only used here

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| "Journal about this" passes theme and stripped reflection question | unit | Click CTA → verify `onSwitchToJournal` called with `(theme, strippedQuestion)` |
| "Pray about today's reading" passes theme and combined context | unit | Click CTA → verify `onSwitchToPray` called with `(theme, combinedString)` where combined includes passage.reference + stripped question |
| `stripReflectionPrefix` strips known prefix | unit | Verify prefix removal and passthrough when prefix absent |

**Expected state after completion:**
- [x] DevotionalTabContent props changed to `(topic, customPrompt)` signature
- [x] Prefix stripping works for all 50 devotionals (all use the same prefix pattern)
- [x] Existing DevotionalTabContent tests updated for new callback signatures
- [x] TypeScript compiles clean

---

### Step 3: Update DailyHub Cross-Tab Handlers

**Objective:** Route `customPrompt` through DailyHub's callback handlers and pass `prayContext` to PrayTabContent.

**Files to create/modify:**
- `frontend/src/pages/DailyHub.tsx` — Update handlers and PrayTabContent prop passing

**Details:**

**Update `handleSwitchToDevotionalJournal` (lines 138-144):**
```typescript
const handleSwitchToDevotionalJournal = useCallback(
  (topic: string, customPrompt: string) => {
    setPrayContext({ from: 'devotional', topic, customPrompt })
    setSearchParams({ tab: 'journal' }, { replace: true })
  },
  [setSearchParams],
)
```

**Update `handleSwitchToDevotionalPray` (lines 146-152):**
```typescript
const handleSwitchToDevotionalPray = useCallback(
  (topic: string, customPrompt: string) => {
    setPrayContext({ from: 'devotional', topic, customPrompt })
    setSearchParams({ tab: 'pray' }, { replace: true })
  },
  [setSearchParams],
)
```

**Pass `prayContext` to PrayTabContent (line 350-353):**
```tsx
<PrayTabContent
  onSwitchToJournal={handleSwitchToJournal}
  initialContext={urlContext.current}
  prayContext={prayContext}
/>
```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change `handleSwitchToJournal` (Pray → Journal flow) — it stays as-is with `(topic: string)` signature
- DO NOT change tab switching logic or URL param handling
- DO NOT change how `prayContext` is passed to JournalTabContent — it already works
- DO NOT remove `initialContext` prop from PrayTabContent — URL param flow must continue working

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Devotional → Journal stores customPrompt in prayContext | integration | Simulate DevotionalTabContent calling `onSwitchToJournal(topic, prompt)` → verify Journal tab receives prayContext with customPrompt |
| Devotional → Pray passes prayContext to PrayTabContent | integration | Simulate DevotionalTabContent calling `onSwitchToPray(topic, prompt)` → verify PrayTabContent receives prayContext |

**Expected state after completion:**
- [x] DailyHub routes `customPrompt` into PrayContext state
- [x] PrayTabContent receives `prayContext` prop
- [x] TypeScript compiles clean
- [x] Existing DailyHub tests pass

---

### Step 4: Add Draft Conflict Dialog to JournalTabContent

**Objective:** When devotional context arrives and journal has unsaved text, show a dialog offering "Start fresh" or "Keep my current draft".

**Files to create/modify:**
- `frontend/src/components/daily/JournalTabContent.tsx` — Add devotional context handling, draft conflict state, scroll-to-input

**Details:**

**Add devotional context effect (after existing `prayContext?.from === 'pray'` effect at line 76-82):**

```typescript
// Switch to Guided mode when devotional context arrives
useEffect(() => {
  if (prayContext?.from === 'devotional' && prayContext.customPrompt) {
    // Check for draft conflict
    const existingDraft = localStorage.getItem(JOURNAL_DRAFT_KEY)
    // We need to check current text state too — but can't read state in effect reliably.
    // Use a ref to track whether we need to show the conflict dialog.
    setDraftConflictPending(!!existingDraft && existingDraft.trim().length > 0)
    if (!existingDraft || existingDraft.trim().length === 0) {
      // No conflict — apply devotional context directly
      setMode('guided')
      setContextDismissed(false)
      // Scroll-to-input after DOM update
      requestAnimationFrame(() => {
        parentTextareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        parentTextareaRef.current?.focus()
      })
    }
  }
}, [prayContext])
```

**Add state for draft conflict dialog:**

```typescript
const [draftConflictPending, setDraftConflictPending] = useState(false)
```

**Add conflict resolution handlers:**

```typescript
const handleStartFresh = useCallback(() => {
  setDraftConflictPending(false)
  localStorage.removeItem(JOURNAL_DRAFT_KEY)
  setMode('guided')
  setContextDismissed(false)
  // Signal JournalInput to clear text — pass a clearDraft callback or use a ref
  requestAnimationFrame(() => {
    parentTextareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    parentTextareaRef.current?.focus()
  })
}, [])

const handleKeepDraft = useCallback(() => {
  setDraftConflictPending(false)
  // Dismiss the devotional context — revert to rotating prompts
  setContextDismissed(true)
}, [])
```

**Render the draft conflict dialog (above JournalInput):**

```tsx
{draftConflictPending && prayContext?.from === 'devotional' && (
  <div
    role="dialog"
    aria-labelledby="draft-conflict-title"
    className="mb-6 rounded-2xl border border-white/[0.12] bg-white/[0.06] p-6 backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]"
  >
    <h3 id="draft-conflict-title" className="mb-2 text-lg font-semibold text-white">
      You have an unsaved draft
    </h3>
    <p className="mb-4 text-sm text-white/80">
      Would you like to start fresh with today&apos;s devotional prompt, or keep working on your current draft?
    </p>
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={handleStartFresh}
        className="min-h-[44px] rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Start fresh
      </button>
      <button
        type="button"
        onClick={handleKeepDraft}
        className="min-h-[44px] rounded-lg border border-white/[0.12] bg-transparent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        autoFocus
      >
        Keep my current draft
      </button>
    </div>
  </div>
)}
```

**Pass a `clearDraft` signal to JournalInput:** Add a `draftCleared` counter state that increments on "Start fresh". JournalInput watches it and clears its text state.

```typescript
const [draftClearSignal, setDraftClearSignal] = useState(0)

// In handleStartFresh:
setDraftClearSignal((c) => c + 1)
```

Pass to JournalInput as a new prop `draftClearSignal={draftClearSignal}`.

**Update the `currentPrompt` computation** to handle devotional custom prompt. This happens in JournalTabContent (line 136-140) — the prompt priority chain:

```typescript
const currentPrompt = contextPrompt && !contextDismissed
  ? contextPrompt
  : prayContext?.from === 'devotional' && prayContext.customPrompt && !contextDismissed
    ? prayContext.customPrompt
    : prayContext?.from === 'pray' && !contextDismissed
      ? `Reflect on your prayer about ${prayContext.topic ?? 'what you shared'}. How did it feel to bring that before God? What comes up as you sit with it?`
      : allPrompts[promptIndex]?.text ?? ''
```

**Update `showPromptRefresh`** to also hide the refresh button for devotional context:

```typescript
const showPromptRefresh = !(
  (prayContext?.from === 'pray' && !contextDismissed) ||
  (prayContext?.from === 'devotional' && prayContext.customPrompt && !contextDismissed)
)
```

**Auth gating:** N/A — no new gates

**Responsive behavior:**
- Desktop (1440px): Dialog within `max-w-2xl` container. Buttons side-by-side.
- Tablet (768px): Same as desktop.
- Mobile (375px): Buttons wrap via `flex-wrap` if needed. Dialog is full-width within container.

**Guardrails (DO NOT):**
- DO NOT change existing Pray → Journal context flow (the `prayContext?.from === 'pray'` effect and banner remain unchanged)
- DO NOT change Prayer Wall / challenge / URL param context flows
- DO NOT add new localStorage keys
- DO NOT auto-focus the "Start fresh" button — spec says "Keep my current draft" is the safe default (use `autoFocus` on keep button)
- DO NOT render the draft conflict dialog when the textarea is empty — only when `localStorage.getItem(JOURNAL_DRAFT_KEY)` has non-empty content

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Devotional context auto-selects Guided mode when no draft exists | unit | Set prayContext with `from: 'devotional'` + customPrompt, empty localStorage → verify mode is 'guided' |
| Devotional context shows draft conflict dialog when draft exists | unit | Set `wr_journal_draft` in localStorage + set prayContext → verify dialog with `role="dialog"` appears |
| "Start fresh" clears draft and shows devotional prompt | unit | Click "Start fresh" → verify localStorage cleared, prompt card shows customPrompt text |
| "Keep my current draft" dismisses devotional context | unit | Click "Keep my current draft" → verify dialog gone, rotating prompts shown |
| No draft conflict dialog when draft is empty | unit | Empty `wr_journal_draft` + set prayContext → verify no dialog |
| Prompt card shows devotional reflection question | unit | Set prayContext with customPrompt → verify prompt card text matches |
| "Write about something else" dismisses devotional context | unit | Show devotional context → click dismiss → verify rotating prompts |
| Existing Pray → Journal context still works | regression | Set prayContext `from: 'pray'` → verify "Continuing from your prayer about..." banner |

**Expected state after completion:**
- [x] Draft conflict dialog appears only when devotional context arrives AND draft exists
- [x] "Start fresh" clears draft and applies devotional prompt
- [x] "Keep my current draft" dismisses devotional context
- [x] Prompt card shows devotional reflection question when context is active
- [x] "Write about something else" reverts to rotating prompts
- [x] Existing Pray → Journal flow unchanged
- [x] TypeScript compiles clean

---

### Step 5: Add Devotional Context Banner to JournalInput

**Objective:** Show "Reflecting on today's devotional on [theme]" banner when devotional context is active, and handle the `draftClearSignal` prop.

**Files to create/modify:**
- `frontend/src/components/daily/JournalInput.tsx` — Add devotional context banner, draftClearSignal handling

**Details:**

**Add `draftClearSignal` prop to interface (line 19-30):**

```typescript
export interface JournalInputProps {
  // ... existing props
  draftClearSignal?: number
}
```

**Add effect to clear text when `draftClearSignal` changes (after existing draft save effect):**

```typescript
const prevClearSignal = useRef(draftClearSignal ?? 0)
useEffect(() => {
  if (draftClearSignal !== undefined && draftClearSignal !== prevClearSignal.current) {
    prevClearSignal.current = draftClearSignal
    setText('')
    lastSavedTextRef.current = ''
  }
}, [draftClearSignal])
```

**Add devotional context banner (after existing `prayContext?.from === 'pray'` banner, inside the `aria-live="polite"` div at line 192-208):**

```tsx
{mode === 'guided' && prayContext?.from === 'devotional' && prayContext.customPrompt && !contextDismissed && (
  <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3" role="status">
    <p className="text-sm text-white/80">
      Reflecting on today&apos;s devotional on{' '}
      <span className="font-medium">{prayContext.topic ?? 'today\u2019s reading'}</span>
    </p>
    <button
      type="button"
      onClick={onDismissContext}
      className="mt-1 text-xs text-primary underline hover:text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      Write about something else
    </button>
  </div>
)}
```

**Add free-write mode devotional note (after existing `prayContext?.from === 'pray'` free-write note at line 235-246):**

```tsx
{mode === 'free' && prayContext?.from === 'devotional' && prayContext.customPrompt && !contextDismissed && (
  <p className="mb-4 text-sm text-white/50">
    Reflecting on today&apos;s devotional on {prayContext.topic ?? 'today\u2019s reading'}.{' '}
    <button
      type="button"
      onClick={onDismissContext}
      className="text-primary underline hover:text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      Dismiss
    </button>
  </p>
)}
```

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): Banner within `max-w-2xl` container.
- Tablet (768px): Same.
- Mobile (375px): Full-width within container.

**Guardrails (DO NOT):**
- DO NOT change the existing Pray → Journal context banner text ("Continuing from your prayer about...")
- DO NOT change the prompt card rendering — it already uses `currentPrompt` which will contain the devotional prompt
- DO NOT change the textarea, character count, voice input, or save button
- DO NOT change the draft auto-save mechanism
- DO NOT add the `draftClearSignal` prop as required — keep it optional for backward compatibility

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Devotional context banner shows correct text | unit | Set prayContext `from: 'devotional'` with topic → verify "Reflecting on today's devotional on {topic}" |
| Devotional context banner dismiss works | unit | Click "Write about something else" → verify onDismissContext called |
| Free-write mode shows devotional context note | unit | Set mode to 'free' + devotional prayContext → verify note text |
| draftClearSignal clears textarea text | unit | Increment draftClearSignal → verify text state is empty |
| Existing pray context banner unchanged | regression | Set prayContext `from: 'pray'` → verify "Continuing from your prayer about..." |

**Expected state after completion:**
- [x] Devotional context banner renders with correct message
- [x] Dismiss link works
- [x] Free-write mode shows devotional context note
- [x] Draft clear signal clears textarea
- [x] Existing pray context banner unchanged

---

### Step 6: Add Devotional Context to PrayTabContent

**Objective:** PrayTabContent consumes `prayContext` for devotional pre-fill, scroll-to-input, and textarea focus.

**Files to create/modify:**
- `frontend/src/components/daily/PrayTabContent.tsx` — Add `prayContext` prop, devotional pre-fill, scroll-to-input

**Details:**

**Update props interface (line 23-26):**

```typescript
interface PrayTabContentProps {
  onSwitchToJournal?: (topic: string) => void
  initialContext?: string | null
  prayContext?: PrayContext | null
}
```

Add import for `PrayContext`:
```typescript
import type { PrayContext } from '@/types/daily-experience'
```

**Add devotional context pre-fill effect (after existing challenge context effect, around line 75):**

```typescript
// Pre-fill from devotional context
const devotionalContextConsumed = useRef(false)
useEffect(() => {
  if (
    prayContext?.from === 'devotional' &&
    prayContext.customPrompt &&
    !devotionalContextConsumed.current &&
    activeTab === 'pray'
  ) {
    devotionalContextConsumed.current = true
    setInitialText(prayContext.customPrompt)
    // Scroll to textarea after DOM update
    requestAnimationFrame(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>('#pray-textarea')
      textarea?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      textarea?.focus()
    })
  }
}, [prayContext, activeTab])
```

**Note:** PrayerInput doesn't expose a textarea ref to PrayTabContent. Use a document query for the textarea (PrayerInput's textarea already exists in the DOM). Alternatively, add an `id` to PrayerInput's textarea.

**Add `id="pray-textarea"` to PrayerInput's textarea** — this is a small addition to PrayerInput.tsx for scroll targeting. On the textarea element in PrayerInput, add `id="pray-textarea"`.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact beyond scroll-to-input behavior which works identically at all breakpoints.

**Guardrails (DO NOT):**
- DO NOT change the existing `initialContext` / URL param flow
- DO NOT change the Prayer Wall context flow (uses `location.state`)
- DO NOT change the challenge context flow
- DO NOT remove the `initialContextConsumed` ref — it prevents re-consuming URL params
- DO NOT change PrayerInput's text syncing from `initialText` — the existing `useEffect` in PrayerInput that watches `initialText` handles this

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Devotional prayContext pre-fills textarea | unit | Set prayContext `from: 'devotional'` with customPrompt → verify textarea contains the combined text |
| Devotional pre-fill consumed only once | unit | Set prayContext, verify pre-fill, re-render → verify no duplicate pre-fill |
| Existing URL param initialContext still works | regression | Set initialContext prop → verify textarea pre-filled |
| Existing Prayer Wall context still works | regression | Set location.state.prayWallContext → verify textarea pre-filled |

**Expected state after completion:**
- [x] PrayTabContent accepts and consumes `prayContext` for devotional pre-fill
- [x] Textarea is pre-filled with combined passage + reflection question
- [x] Textarea scrolls into view and receives focus
- [x] All existing pre-fill flows (URL param, Prayer Wall, challenge) unchanged
- [x] TypeScript compiles clean

---

### Step 7: Tests for All Changes

**Objective:** Comprehensive test coverage for all new functionality and regression testing for existing flows.

**Files to create/modify:**
- `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx` — Update existing CTA tests for new callback signatures, add prefix stripping test
- `frontend/src/components/daily/__tests__/JournalTabContent.test.tsx` — Add devotional context tests, draft conflict tests
- `frontend/src/components/daily/__tests__/JournalInput.test.tsx` — Add devotional banner tests, draftClearSignal test
- `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` — Add devotional prayContext pre-fill test
- `frontend/src/pages/__tests__/DailyHub.test.tsx` — Add integration test for devotional → journal and devotional → pray flows

**Details:**

Follow existing test patterns: `MemoryRouter` → `ToastProvider` → `AuthModalProvider` → Component. Mock hooks as needed (`vi.mock`). Use `userEvent.setup()` for interactions.

**DevotionalTabContent tests (update + add):**
- Update existing "Journal about this" test: verify `onSwitchToJournal` called with 2 args `(theme, strippedQuestion)`
- Update existing "Pray about today's reading" test: verify `onSwitchToPray` called with 2 args `(theme, combinedString)`
- Add: `stripReflectionPrefix` strips prefix correctly
- Add: `stripReflectionPrefix` passes through when prefix absent

**JournalTabContent tests (add):**
- Devotional context auto-selects Guided mode (no draft)
- Devotional context shows draft conflict dialog (draft exists)
- "Start fresh" clears draft, shows devotional prompt
- "Keep my current draft" dismisses dialog, preserves draft
- No dialog when draft is empty
- Devotional prompt appears in prompt card
- "Write about something else" reverts to rotating prompts
- Existing Pray → Journal context unchanged (regression)
- Existing URL prompt context unchanged (regression)

**JournalInput tests (add):**
- Devotional banner renders correct text
- Devotional banner dismiss calls onDismissContext
- Free-write devotional note renders
- draftClearSignal clears text
- Existing pray banner unchanged (regression)

**PrayTabContent tests (add):**
- Devotional prayContext pre-fills textarea
- Existing URL initialContext still works (regression)

**DailyHub tests (add/update):**
- Devotional → Journal: prayContext carries customPrompt
- Devotional → Pray: prayContext carries customPrompt and PrayTabContent receives it

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT delete or weaken existing tests
- DO NOT mock localStorage globally — use `beforeEach` setup/cleanup per test
- DO NOT hardcode devotional content in tests — use the first devotional from `DEVOTIONAL_POOL` or create a minimal fixture

**Test specifications:**
Total: ~20 tests across 5 test files (8 JournalTabContent, 5 JournalInput, 3 DevotionalTabContent updates, 2 PrayTabContent, 2 DailyHub)

**Expected state after completion:**
- [x] All new tests pass
- [x] All existing tests pass
- [x] `pnpm test` exits clean
- [x] No test warnings or uncovered branches in new code

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Extend PrayContext type |
| 2 | 1 | Update DevotionalTabContent CTA callbacks |
| 3 | 1, 2 | Update DailyHub cross-tab handlers |
| 4 | 1, 3 | Add draft conflict dialog to JournalTabContent |
| 5 | 4 | Add devotional context banner to JournalInput |
| 6 | 1, 3 | Add devotional context to PrayTabContent |
| 7 | 2, 3, 4, 5, 6 | Tests for all changes |

**Parallelizable:** Steps 4+5 and Step 6 can be done in parallel (both depend on Steps 1-3 but are independent of each other).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Extend PrayContext type | [COMPLETE] | 2026-04-06 | Added `customPrompt?: string` to PrayContext in `daily-experience.ts` |
| 2 | Update DevotionalTabContent CTA callbacks | [COMPLETE] | 2026-04-06 | Updated props to `(topic, customPrompt)` signature, added `stripReflectionPrefix` helper, updated both CTA handlers |
| 3 | Update DailyHub cross-tab handlers | [COMPLETE] | 2026-04-06 | Updated both devotional handlers to `(topic, customPrompt)` signature, passed `prayContext` to PrayTabContent. Also added `prayContext` prop to PrayTabContent interface (with `_prayContext` alias until Step 6 implementation). |
| 4 | Add draft conflict dialog to JournalTabContent | [COMPLETE] | 2026-04-06 | Added devotional context effect, draft conflict dialog, handleStartFresh/handleKeepDraft, draftClearSignal, updated currentPrompt and showPromptRefresh. TS will compile after Step 5 adds draftClearSignal to JournalInput. |
| 5 | Add devotional context banner to JournalInput | [COMPLETE] | 2026-04-06 | Added `draftClearSignal` prop, clear effect, devotional context banner in guided mode, devotional note in free-write mode. All 33 existing tests pass. |
| 6 | Add devotional context to PrayTabContent | [COMPLETE] | 2026-04-06 | Added devotional pre-fill effect with ref guard, scroll-to-input, `id="pray-textarea"` on PrayerInput textarea. All 50 existing tests pass. |
| 7 | Tests for all changes | [COMPLETE] | 2026-04-06 | 15 new tests: 3 DevotionalTabContent (updated CTA tests), 9 JournalTabContent (devotional context, draft conflict, regression), 3 PrayTabContent (pre-fill, consume-once, regression). All 125 tests pass across 3 files. JournalInput tests consolidated into JournalTabContent (minor deviation — no standalone JournalInput test file exists). |
