# Feature: Draft Persistence Reassurance UI

**Master Plan Reference:** N/A — standalone enhancement building on Spec J (draft persistence)

---

## Overview

Spec J added draft auto-save to localStorage for Journal and Pray, so users' work survives auth flows and browser closure. But users don't *know* that. When the auth modal appears after clicking Save/Pray while logged out, users instinctively assume they're losing their work — the modal becomes a friction point that drives abandonment. This spec adds two trust signals: (1) a context-aware auth modal subtitle that explicitly says "your draft is safe," and (2) a polished "Draft saved" indicator with a green check icon, mirroring Google Docs / Notion auto-save UX.

## User Story

As a **logged-out visitor** writing a journal entry or prayer, I want to see that my draft is being saved and that it will survive the auth flow, so that I feel safe signing up without fear of losing my work.

## Requirements

### Functional Requirements

1. **Auth modal reassurance (Journal):** When a logged-out user clicks "Save Entry" in JournalInput with non-empty text, the auth modal subtitle reads: "Sign in to save your journal entries. Your draft is safe — we'll bring it back after." When text is empty, the existing subtitle is used unchanged.
2. **Auth modal reassurance (Pray):** When a logged-out user clicks "Help Me Pray" in PrayTabContent with non-empty text, the auth modal subtitle reads: "Sign in to pray together. Your draft is safe — we'll bring it back after." When text is empty, the existing subtitle is used unchanged.
3. **Draft saved indicator enhancement (Journal):** The existing plain-text "Draft saved" indicator in JournalInput is enhanced with a green `CheckCircle2` icon, right-aligned positioning, and a fixed-height wrapper to prevent layout shift.
4. **Draft saved indicator (Pray):** PrayerInput gets the same "Draft saved" indicator with `CheckCircle2` icon, matching the Journal implementation. Appears 1 second after typing stops (when draft saves to localStorage), auto-hides after 2 seconds.

### Non-Functional Requirements

- **Accessibility:** Indicator wrapper uses `aria-live="polite"` so screen readers announce "Draft saved" once per appearance. Icon is `aria-hidden="true"`.
- **No layout shift:** Indicator wrapper has fixed height (`h-5`) so content doesn't jump when indicator appears/disappears.
- **Motion safety:** Indicator fade-in uses `motion-safe:animate-fade-in`.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Save journal entry | Auth modal with draft-aware subtitle | Saves normally | "Sign in to save your journal entries. Your draft is safe — we'll bring it back after." (if draft exists) / "Sign in to save your journal entries" (if no draft) |
| Generate prayer | Auth modal with draft-aware subtitle | Generates normally | "Sign in to pray together. Your draft is safe — we'll bring it back after." (if draft exists) / "Sign in to generate a prayer" (if no draft) |
| Draft saved indicator | Shows for all users (draft saves to localStorage regardless of auth state) | Same behavior | N/A |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Indicator right-aligned below textarea, same size (`text-xs`). Auth modal subtitle wraps naturally. |
| Tablet (640-1024px) | Same as mobile. |
| Desktop (> 1024px) | Same layout, no special treatment needed — indicator is small and unobtrusive at all sizes. |

No responsive complexity — the indicator is a single small line of text with an icon.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or new free-text input. It only modifies UI messaging around existing auth modal and draft save flows. Crisis detection is already handled by the existing `CrisisBanner` component in JournalInput.

## Auth & Persistence

- **Logged-out users:** Draft saves to `wr_journal_draft` / `wr_prayer_draft` localStorage keys (existing Spec J behavior, unchanged). The "Draft saved" indicator shows for all users regardless of auth state.
- **Logged-in users:** Same behavior — drafts save to localStorage, indicator shows after save.
- **No new localStorage keys.** This spec only adds UI on top of existing `wr_journal_draft` and `wr_prayer_draft` keys.

## Completion & Navigation

N/A — standalone UI enhancement, not a Daily Hub completion flow.

## Design Notes

- **Indicator style:** `CheckCircle2` icon (lucide-react) in `text-success` (#27AE60) + "Draft saved" text in `text-white/50`, sized at `text-xs` (12px). This matches the subdued, trustworthy feel of Google Docs' "Saved to Drive" indicator.
- **Positioning:** Right-aligned below the textarea in a fixed-height wrapper (`h-5`), using `flex items-center justify-end`.
- **Animation:** Uses the existing `animate-fade-in` (500ms fade + slide up) with `motion-safe:` prefix.
- **Existing indicator (Journal):** JournalInput already has a plain-text "Draft saved" indicator with `draftSaved` state and `draftFeedbackTimerRef`. This spec enhances it with the `CheckCircle2` icon, right-alignment via `justify-end`, and fixed-height wrapper.
- **New indicator (Pray):** PrayerInput currently has no draft saved indicator. Add `draftSaved` state, feedback timer, and indicator JSX matching the enhanced Journal pattern.

## Out of Scope

- Changing draft persistence behavior (Spec J, already implemented)
- Auth flow changes (login/register logic)
- New localStorage keys
- Backend work (Phase 3)
- Light mode styling (Phase 4)
- Draft saved indicator on other textareas (Meditation, Prayer Wall composer, etc.)

## Acceptance Criteria

- [ ] JournalInput's `handleSave` detects non-empty text and passes context-aware subtitle to `authModal.openAuthModal`: "Sign in to save your journal entries. Your draft is safe — we'll bring it back after."
- [ ] When JournalInput text is empty and save is clicked, the existing subtitle "Sign in to save your journal entries" is used (no reassurance suffix)
- [ ] PrayTabContent's `handleGenerate` detects non-empty `inputText` and passes context-aware subtitle: "Sign in to pray together. Your draft is safe — we'll bring it back after."
- [ ] When PrayTabContent text is empty and generate is clicked, the existing subtitle "Sign in to generate a prayer" is used (no reassurance suffix)
- [ ] JournalInput's "Draft saved" indicator includes a `CheckCircle2` icon in `text-success` color
- [ ] JournalInput's indicator is right-aligned (`justify-end`) in a fixed-height wrapper (`h-5`)
- [ ] JournalInput's indicator wrapper has `aria-live="polite"`
- [ ] PrayerInput has a "Draft saved" indicator with `CheckCircle2` icon, matching JournalInput's enhanced style
- [ ] PrayerInput's auto-save useEffect triggers the indicator after successful localStorage save, auto-hides after 2 seconds
- [ ] PrayerInput's indicator has `aria-live="polite"` wrapper with fixed height (`h-5`)
- [ ] Both indicators use `motion-safe:animate-fade-in` for subtle entrance
- [ ] No layout shift when indicator appears/disappears (fixed-height wrapper reserves space)
- [ ] Both timers cleaned up on component unmount
- [ ] All existing draft persistence behavior unchanged (Spec J preserved)
- [ ] All existing auth modal behavior unchanged for non-draft scenarios
- [ ] Screen reader announces "Draft saved" once per appearance (not repeatedly)
