# Devotional Prompt Passing

**Master Plan Reference:** N/A -- standalone enhancement to existing Daily Hub cross-tab flows.

---

## Overview

When a user finishes reading today's devotional and feels moved to journal or pray, the transition should carry the devotional's substance -- not just a one-word theme or generic sentence. The reflection question (e.g., "Are there areas where you are trying to earn what Christ has already freely given?") is the devotional's anchor insight and should become the journal prompt. Similarly, praying about the devotional should pre-fill a richer context combining the passage reference and reflection question. This spec also addresses two UX friction points: users landing at the top of the page instead of the input area, and losing unsaved journal drafts when devotional context arrives.

## User Story

As a **logged-in user**, I want clicking "Journal about this" or "Pray about today's reading" on the devotional to carry the reflection question and passage context into my journal prompt or prayer textarea, so that my journaling and prayer flow naturally from what I just read without losing my train of thought.

## Requirements

### Functional Requirements

1. **Richer context from Devotional to Journal:** "Journal about this" passes the devotional's reflection question (stripped of the "Something to think about today: " prefix) as a custom prompt, plus the theme as topic context.
2. **Richer context from Devotional to Pray:** "Pray about today's reading" passes a combined string of passage reference + reflection question as pre-filled textarea text, plus the theme as topic context.
3. **Auto-select Guided mode:** When Journal receives devotional context, it auto-selects Guided mode so the custom prompt appears immediately on the prompt card.
4. **Devotional-specific context banner:** Journal shows "Reflecting on today's devotional on [theme]" (distinct from the existing "Continuing from your prayer about..." banner for Pray-to-Journal context).
5. **Draft conflict protection:** When devotional context arrives and the journal textarea already has unsaved text, a dialog appears offering two choices:
   - "Start fresh" -- clears the draft and uses the devotional prompt
   - "Keep my current draft" -- dismisses the devotional context and preserves the existing draft (this is the safe default)
6. **Scroll-to-input:** When transitioning from Devotional to Journal or Pray, the target textarea scrolls into view (centered in viewport) and receives focus.
7. **Context dismissal:** "Write about something else" in the context banner dismisses the devotional context, reverting to rotating journal prompts.
8. **Backward compatibility:** Existing non-devotional context flows remain unchanged -- Prayer Wall to Pray, challenge contexts, URL param-based context passing.

### Non-Functional Requirements

- **Performance:** No additional API calls or localStorage reads. All context passes through React state.
- **Accessibility:** Draft conflict dialog uses `role="dialog"` and `aria-labelledby`. All buttons meet 44px minimum touch target. Context banner uses `role="status"` within `aria-live="polite"` region. Scroll behavior uses `behavior: 'smooth'` for reduced-motion respect via browser defaults.

## Auth Gating

This feature modifies cross-tab navigation within the Daily Hub. The CTAs ("Journal about this", "Pray about today's reading") are already rendered only within DevotionalTabContent, which is visible to all users. However, the downstream actions (saving journal entries, generating prayers) are already auth-gated by the existing Journal and Pray tab implementations.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Click "Journal about this" on devotional | Switches to Journal tab with devotional prompt visible in Guided mode; save is gated downstream | Switches to Journal tab with devotional prompt; full save flow available | N/A (tab switch is not gated) |
| Click "Pray about today's reading" on devotional | Switches to Pray tab with pre-filled textarea; "Generate Prayer" is gated downstream | Switches to Pray tab with pre-filled textarea; full prayer generation available | N/A (tab switch is not gated) |
| Draft conflict "Start fresh" | Clears draft, uses devotional prompt | Same | N/A |
| Draft conflict "Keep my current draft" | Dismisses devotional context, preserves draft | Same | N/A |

No new auth gates are introduced. The existing downstream gates on journal save and prayer generation remain unchanged.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Draft conflict dialog is full-width within the journal container. Buttons stack if needed (`flex-wrap`). Context banner is full-width. Scroll-to-input centers textarea in viewport. |
| Tablet (640-1024px) | Same as mobile but with more horizontal padding. Buttons sit side-by-side. |
| Desktop (> 1024px) | Same as tablet. All content constrained to existing `max-w-2xl` container. |

The draft conflict dialog and context banner inherit the existing Journal tab's responsive container (`max-w-2xl`). No breakpoint-specific layout changes are needed beyond the existing Journal/Pray responsive behavior.

## AI Safety Considerations

N/A -- This feature does not introduce new user text input or AI-generated content. It passes existing devotional content (reflection questions, passage references) between existing tabs. The downstream Pray and Journal tabs already have crisis keyword detection on their text inputs.

## Auth & Persistence

- **Logged-out users:** Context passes through React state only. No persistence. Tab switching and prompt display work identically. Downstream save/generate actions are gated as before.
- **Logged-in users:** Same React state context passing. No new persistence. Journal draft auto-save (`wr_journal_draft`) continues to work as before -- the draft conflict dialog interacts with it only to clear it when user chooses "Start fresh."
- **localStorage usage:** No new keys. Reads/clears existing `wr_journal_draft` key only in the draft conflict "Start fresh" flow.

## Completion & Navigation

This feature modifies cross-tab context passing within the Daily Hub. It does not change completion tracking:

- **Devotional completion:** Unchanged. The "Journal about this" and "Pray about today's reading" CTAs are rendered after the devotional content, below the completion button.
- **Journal/Pray completion:** Unchanged. Arriving from devotional does not affect how `markJournalComplete()` or `markPrayComplete()` are called.
- **Context flow:** Devotional -> Journal (reflection question as prompt, theme as topic). Devotional -> Pray (passage + reflection as pre-filled text, theme as topic). Existing Pray -> Journal flow unchanged.

## Design Notes

- **Draft conflict dialog:** Uses the existing frosted glass card pattern (`rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm`). "Start fresh" button uses primary fill (`bg-primary`). "Keep my current draft" button uses ghost style (border + transparent bg). Both meet 44px touch target minimum.
- **Context banner (devotional):** Matches the existing "Continuing from your prayer about..." banner pattern -- same border, background, text sizes, dismiss link style. Message reads "Reflecting on today's devotional on [theme]" to differentiate from the prayer-origin banner.
- **Prompt card:** When devotional context is active, the Guided mode prompt card displays the reflection question text. Same Lora italic rendering as existing journal prompts.
- **Scroll behavior:** `scrollIntoView({ behavior: 'smooth', block: 'center' })` on the textarea element, followed by `.focus()`. Uses `requestAnimationFrame` to ensure DOM has updated.

## Data Flow

The context passes through a single state object (`PrayContext`) that already exists:

1. DevotionalTabContent CTA click -> callback with (topic, customPrompt)
2. DailyHub handler stores both in PrayContext state
3. Tab switches via URL param
4. Target tab (Journal or Pray) reads PrayContext and consumes the customPrompt

**PrayContext extension:** The existing `PrayContext` type gains an optional `customPrompt` field. This is backward-compatible -- all existing callers that don't pass `customPrompt` continue to work unchanged because the field is optional.

**Prompt priority chain (Journal, highest to lowest):**
1. External context prompt (e.g., from URL params)
2. Devotional custom prompt (when `prayContext.from === 'devotional'` and `customPrompt` present)
3. Pray-to-Journal context (when `prayContext.from === 'pray'`)
4. Rotating guided prompts (default)

**Reflection question cleanup:** The `reflectionQuestion` field on devotionals is prefixed with "Something to think about today: ". This prefix is stripped before passing to Journal/Pray so the prompt reads naturally.

## Out of Scope

- **New localStorage keys or persistence** -- context is ephemeral React state only
- **Changes to devotional content or data model** -- we only read existing `reflectionQuestion` and `passage.reference` fields
- **Changes to crisis detection** -- existing downstream detection in Pray/Journal tabs is sufficient
- **Changes to draft auto-save debouncing** -- the existing 1-second debounce is unchanged
- **Changes to auth gating** -- no new gates introduced
- **Devotional -> Meditate context passing** -- not part of this spec
- **Backend API changes** -- all frontend state management

## Acceptance Criteria

- [ ] `PrayContext` type extended with optional `customPrompt` field (backward-compatible)
- [ ] Clicking "Journal about this" on devotional passes the reflection question (without "Something to think about today: " prefix) as `customPrompt` and the theme as `topic`
- [ ] Clicking "Pray about today's reading" on devotional passes a combined "I'm reflecting on [passage]. [reflection question]" as `customPrompt` and the theme as `topic`
- [ ] Journal auto-selects Guided mode when devotional context arrives
- [ ] Journal prompt card displays the devotional reflection question (not a generic rotating prompt)
- [ ] Journal context banner reads "Reflecting on today's devotional on [theme]" (not "Continuing from your prayer about...")
- [ ] Draft conflict dialog appears when devotional context arrives AND journal textarea has non-empty text
- [ ] "Start fresh" clears draft text, removes `wr_journal_draft` from localStorage, and shows the devotional prompt
- [ ] "Keep my current draft" dismisses the devotional context, closes the dialog, and preserves existing draft text and the rotating journal prompt
- [ ] Draft conflict dialog does NOT appear when journal textarea is empty
- [ ] Journal textarea scrolls into view (centered) and receives focus when devotional context arrives
- [ ] Pray textarea is pre-filled with the devotional prayer context string
- [ ] Pray textarea scrolls into view (centered) and receives focus when devotional context arrives
- [ ] "Write about something else" dismiss link in context banner removes devotional context and reverts to rotating prompts
- [ ] Existing Pray -> Journal context flow still works (banner shows "Continuing from your prayer about...", Guided mode auto-selected)
- [ ] Existing URL param context flow (Prayer Wall -> Pray, challenges) still works unchanged
- [ ] Draft conflict dialog buttons meet 44px minimum touch target
- [ ] Draft conflict dialog has `role="dialog"` and `aria-labelledby`
- [ ] Context banner has `role="status"` within `aria-live="polite"` region
- [ ] All existing tests pass
