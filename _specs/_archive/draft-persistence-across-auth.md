# Feature: Draft Persistence Across Auth (Journal + Pray)

**Master Plan Reference:** N/A — standalone feature

---

## Overview

When a user pours out a vulnerable prayer or journal entry and then hits the auth wall, losing those words is a trust-breaking moment. This feature adds draft persistence to the Pray tab (matching Journal's existing pattern) and hardens the auth modal round-trip for both tabs, so no user's words are ever lost to a page refresh, tab switch, or sign-in prompt.

## User Story

As a **logged-out visitor**, I want my prayer text to be **automatically saved as I type** so that if I'm prompted to sign in or navigate away, **my words are preserved when I return**.

As a **logged-in user**, I want my prayer draft to **persist across page refreshes and tab switches** so that I never lose work-in-progress text.

## Requirements

### Functional Requirements

1. **Prayer draft auto-save**: The Pray tab textarea content is debounce-saved to localStorage (`wr_prayer_draft`) 1 second after the user stops typing — identical to Journal's existing `wr_journal_draft` pattern.
2. **Prayer draft restore on mount**: When the PrayerInput component mounts, it initializes the textarea from localStorage if a draft exists.
3. **Empty text clears draft**: If the user clears the textarea entirely, the localStorage key is removed (no stale empty-string persistence).
4. **Draft cleared on successful submission**: After a prayer is successfully generated (mock response displays), the draft is removed from localStorage.
5. **Draft NOT cleared on reset**: When the user dismisses a generated prayer via "Pray again" / reset, the draft is not cleared — the user may want to refine their previous text.
6. **Draft survives auth modal round-trip**: When a logged-out user clicks the generate button, the auth modal opens and the textarea text persists in both component state and localStorage. Closing the modal (with or without authenticating) returns the user to their text.
7. **Draft survives page refresh**: Refreshing the page and returning to the Pray tab restores the draft.
8. **Draft survives tab switches**: Switching between Daily Hub tabs preserves the Pray draft independently of the Journal draft.
9. **Independent drafts**: `wr_prayer_draft` and `wr_journal_draft` are completely independent keys — changes to one never affect the other.
10. **No regression to Journal**: Journal's existing draft auto-save/restore behavior must remain unchanged.

### Non-Functional Requirements

- **Resilience**: All localStorage reads and writes are wrapped in try/catch — failures are silently ignored (no crashes in private browsing mode or when storage is full).
- **Performance**: Debounce timer (1 second) prevents excessive localStorage writes during rapid typing.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Type in Pray textarea | Can type freely; draft auto-saves to localStorage | Can type freely; draft auto-saves to localStorage | N/A |
| Click "Help Me Pray" (generate) | Auth modal appears with sign-in prompt; draft preserved in state + localStorage | Prayer generates; draft cleared on success | "Sign in to generate a prayer" |
| Close auth modal without signing in | Returns to textarea with text intact (state + localStorage) | N/A | N/A |
| Close auth modal after signing in | Returns to textarea with text intact; user can now click generate again | N/A | N/A |

## Responsive Behavior

This feature is purely behavioral (localStorage persistence logic) — it does not change any visual layout. The existing Pray tab textarea is already responsive across all breakpoints. No responsive changes needed.

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | No change — existing textarea layout preserved |
| Tablet (640-1024px) | No change |
| Desktop (> 1024px) | No change |

## AI Safety Considerations

N/A — This feature does not change AI content generation or introduce new user text input. The Pray textarea already exists; this feature only adds persistence to its content. Crisis detection (if applicable to prayer text) is handled at the generation step, not at the draft-save step.

## Auth & Persistence

- **Logged-out users:** Draft saves to `wr_prayer_draft` in localStorage (session-scoped persistence only — no database writes, consistent with demo-mode zero-persistence policy for user data). This is acceptable because the draft is ephemeral input text, not user-submitted content.
- **Logged-in users:** Same localStorage persistence. Draft cleared on successful prayer generation.
- **localStorage usage:**
  - **New key**: `wr_prayer_draft` (string) — raw textarea content, debounce-saved every 1 second, cleared on successful prayer submission
  - **Existing key (unchanged)**: `wr_journal_draft` (string) — Journal draft, completely independent

## Completion & Navigation

N/A — This feature does not affect Daily Hub completion tracking. Draft persistence is invisible to the completion system. Prayer completion is already tracked at the generation step (which is unchanged).

## Design Notes

- No visual changes — this is a behavioral/persistence feature only.
- The existing PrayerInput textarea and PrayTabContent components are the only touch points.
- Follows the exact same pattern as Journal's draft auto-save (debounced localStorage write, restore on mount, clear on successful save).

## Out of Scope

- **Journal draft changes**: Journal already works correctly; this spec only adds the equivalent for Pray.
- **Draft persistence for other text inputs**: Meditation text inputs, Prayer Wall compose, AI chat input — these are separate features if needed.
- **Draft sync across devices**: localStorage is device-local. Cross-device sync requires backend persistence (Phase 3+).
- **Draft expiration/TTL**: No expiration on drafts. They persist until cleared by submission or user action.
- **Visual draft indicator**: No "draft saved" toast or indicator — silent save, matching Journal's pattern.

## Acceptance Criteria

- [ ] `PRAYER_DRAFT_KEY = 'wr_prayer_draft'` constant added to the daily experience constants file
- [ ] PrayerInput textarea initializes from `wr_prayer_draft` localStorage value on mount (empty string if no draft)
- [ ] Typing in the Pray textarea triggers a debounced (1-second) save to `wr_prayer_draft` in localStorage
- [ ] Clearing the textarea entirely removes `wr_prayer_draft` from localStorage (does not persist empty string)
- [ ] Refreshing the page and navigating to `/daily?tab=pray` restores the draft text in the textarea
- [ ] Logged-out user: clicking "Help Me Pray" opens auth modal with message "Sign in to generate a prayer"; textarea text remains intact after closing modal
- [ ] Logged-in user: successful prayer generation clears `wr_prayer_draft` from localStorage
- [ ] Clicking "Pray again" (reset) does NOT clear the draft from localStorage
- [ ] Switching between Daily Hub tabs preserves Pray draft independently of Journal draft
- [ ] `wr_journal_draft` behavior is completely unchanged (no regression)
- [ ] All localStorage operations wrapped in try/catch — no crashes in private browsing or full-storage scenarios
- [ ] `wr_prayer_draft` documented in the localStorage key inventory (`.claude/rules/11-local-storage-keys.md`)
