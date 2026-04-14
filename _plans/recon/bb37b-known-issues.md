# BB-37b Known Issues

**Date:** 2026-04-13
**Source:** Consolidated from all specs (BB-3b through BB-46), recon documents (BB-33 through BB-46), and BB-37b audit Steps 1-3

## Summary

- Phase 3 deferred items: 24
- Audio cluster deferred: 5 specs (BB-26, BB-27, BB-28, BB-29, BB-44)
- Known UX limitations: 12
- Known technical debt: 14
- Design decisions (not issues): 9
- BB-37b audit findings: 12

---

## Deferred to Phase 3 (Backend Required)

| # | Issue | Source Spec | Notes |
|---|-------|------------|-------|
| 1 | Real JWT authentication (Spring Security) | Phase 3 roadmap | Current: simulated auth via localStorage `wr_auth_simulated`. AuthModal is a UI shell only. |
| 2 | Real AI prayer generation via OpenAI API | Phase 3 roadmap | Current: mock/hardcoded prayers. `getMockPrayer` with devotional context awareness. |
| 3 | Real AI devotional/insight generation | Phase 3 roadmap | Current: 50 hardcoded devotionals. |
| 4 | Real AI Bible chat answers | Phase 3 roadmap | Current: mock data in `ask-mock-data.ts`. Ask page blocked on backend proxy for API key. |
| 5 | Real AI reading plan generation | Phase 3 roadmap | Current: keyword-matched to preset plans. |
| 6 | Push notification backend server | BB-41 | Current: local-fallback mechanism only. Server-side push is Phase 3. |
| 7 | Push subscription server storage | BB-41 | Current: localStorage only. Phase 3 adds `POST /api/push/subscribe` endpoint. |
| 8 | Journal entry encryption at rest | Security rules | Journals are plain text in localStorage. Backend encryption is Phase 3. |
| 9 | Backend crisis detection | 01-ai-safety.md | Current: frontend-only keyword detection. Backend LLM classifier is Phase 3. |
| 10 | Data persistence migration (localStorage to API) | Phase 3 roadmap | All user data (mood, prayers, journal, highlights, bookmarks, notes, streaks, plans, memorization, friends, badges) in localStorage. |
| 11 | Cross-device sync | BB-7, BB-7.5, BB-8, BB-16, BB-17, BB-46 | No accounts = no sync. BB-16 export/import is the manual workaround. |
| 12 | Server-side rate limiting (Redis) | BB-32, 02-security.md | Current: client-side per-tab rate limiting (bypassable). Real rate limiting requires backend. |
| 13 | Backend API key proxy for Gemini | BB-30, BB-31 | Current: API key exposed in client bundle, protected by HTTP referrer restrictions. |
| 14 | User account registration (real) | Phase 3 roadmap | Current: `RegisterPage` is UI shell only. |
| 15 | Photo moderation | Phase 3 roadmap | No image upload exists yet. |
| 16 | Email verification flow | 02-security.md | Deferred to Phase 3. |
| 17 | Reading plan backend persistence | BB-21 | `bible:plans` in localStorage only. |
| 18 | Streak backend persistence | BB-17 | `bible:streak` in localStorage only. |
| 19 | Memorization deck backend persistence | BB-45 | `wr_memorization_cards` in localStorage only. |
| 20 | First-run state backend persistence | BB-34 | `wr_first_run_completed` in localStorage only. |
| 21 | Heatmap data backend persistence | BB-43 | `wr_chapters_visited` in localStorage only. |
| 22 | VAPID key generation and management | BB-41 | Current: placeholder dev key. Real key pair generation is Phase 3. |
| 23 | Production SW notification deep-link E2E test | BB-37 follow-up #5 | Needs actual compiled SW in production build. |
| 24 | Sitemap.xml and robots.txt | BB-40 | Deferred to deployment spec. |

---

## Audio Cluster (Deferred)

| # | Spec | Description | Blocker |
|---|------|-------------|---------|
| 1 | BB-26 | FCBH Audio Bible integration — narrated chapter playback | Blocked on FCBH API key |
| 2 | BB-27 | Layering ambient + narrated audio | Depends on BB-26 |
| 3 | BB-28 | Narration-specific sleep timer | Depends on BB-26 |
| 4 | BB-29 | Auto-advance to next chapter during audio playback | Depends on BB-26 |
| 5 | BB-44 | Word-level/verse-level timing metadata (read-along mode) | Depends on BB-26 |

**Status:** BB-26 spec exists at `_specs/bb-26-fcbh-audio-bible-integration.md`. Entire cluster deferred to BB-37c or future Audio Wave when FCBH API key is obtained.

---

## Known UX Limitations

| # | Limitation | Source Spec | Notes |
|---|-----------|------------|-------|
| 1 | Single-verse memorization only | BB-45 | Multi-verse cards beyond the BibleReader's existing selection range are out of scope. Card editing not supported (remove and re-add). |
| 2 | No phrase search in Bible search | BB-42 | Multi-word queries use AND logic, not exact phrase matching. No `"God so loved the world"` support. |
| 3 | No fuzzy matching in Bible search | BB-42 | Exact token match only. No typo tolerance. |
| 4 | No search filters (testament, book, genre) | BB-42 | Future spec. |
| 5 | Session-only echo freshness penalty | BB-46 | Freshness penalty (-50 score) tracked in memory only. Reloading the page resets it, so users may see the same echo again. No `localStorage` key for this. |
| 6 | No echo dismiss button | BB-46 | Users cannot dismiss an echo they don't want to see. Deferred to future spec. |
| 7 | Push notifications may not fire at scheduled time | BB-41 | Local-fallback fires when SW wakes up, not at exact time. If user doesn't visit and periodic sync doesn't fire, no notification delivered. |
| 8 | Periodic sync Chrome/Edge only | BB-41 | iOS Safari does not support periodic sync. Notifications degrade to main-thread-only delivery. |
| 9 | No cross-tab rate limiting for AI | BB-32 | Each browser tab has its own rate-limit bucket. Opening a new tab resets the limit. |
| 10 | No cross-tab sync after import | BB-16 | After importing Bible data, other open tabs won't re-render. Users must refresh. |
| 11 | Export/import is all-or-nothing | BB-16 | No partial export ("export only highlights") or partial import. |
| 12 | No multi-book recent reading list | BB-19 | Only the single most recent chapter is shown on the resume card. |

---

## Known Technical Debt

| # | Issue | Source | Priority | Notes |
|---|-------|--------|----------|-------|
| 1 | `useBibleNotes` deprecated hook still imported by `VerseCardActions.tsx` | BB-37b Step 1 | **Critical** | Writes to `wr_bible_notes` (old key) instead of `bible:notes` (canonical). Notes from AI Bible Chat invisible to My Bible, heatmap, echoes. ~30 min fix. |
| 2 | `useScriptureEcho` reads raw localStorage with wrong type cast | BB-37b Step 1 | Moderate | Casts `wr_bible_highlights` to `BibleHighlight[]` (old schema with `createdAt: string`). After migration, data is `Highlight[]` with `createdAt: number`. Date in whisper toast may be garbled. ~15 min fix. |
| 3 | 18+ inner page headings use `font-script` (Caveat) | BB-37b Step 1 | Low | Design system marks this as "deprecated for headings." Known debt deferred to inner page redesign. |
| 4 | 43 `eslint-disable` directives without reason comments | BB-37b Step 3 | Low | 27 `exhaustive-deps`, 7 `rules-of-hooks`, 2 other. All reviewed and confirmed safe in BB-37 but lack inline documentation. |
| 5 | `wr_notification_prompt_dismissed` key used as inline string literal | BB-37b Step 1 | Informational | In `BibleReader.tsx:577,909,913`. All other BB-41 keys use named constants. ~5 min fix. |
| 6 | JournalInput textarea uses `font-serif` for user input | BB-37b Step 1 | Low | Design system says serif is for scripture display only. PrayerInput does not use `font-serif` — inconsistency. ~5 min fix. |
| 7 | Flaky `useNotifications` sort test | BB-37 follow-up #1 | Low | Passes individually, fails intermittently in full suite. Appeared stable in BB-37b run. Monitor. |
| 8 | Flaky `WelcomeWizard` keyboard test | BB-37 follow-up #2 | Low | Focus state flaky in jsdom. Appeared stable in BB-37b run. Monitor. |
| 9 | `zod` in dependencies but knip reports unused | BB-37 follow-up #3 | Low | Verify if used by any runtime code or only by removed features. |
| 10 | 12 unused exports flagged by knip | BB-37 follow-up #4 | Low | crossRefs, search, heatmap, env, echoes. Audit for Phase 3 readiness vs truly dead code. |
| 11 | 70 unused exported types | BB-37 follow-up #6 | Low | Standard Props pattern. No action needed per BB-37. |
| 12 | ~119 decorative icons in labeled buttons missing `aria-hidden="true"` | BB-35 | Low | ~45 files affected. Planned batch fix. Functional impact: screen readers announce both icon name and button text. |
| 13 | 8 dialogs missing `aria-modal="true"` | BB-35 + BB-37b Step 1 | Low | BB-35 found 6 (NotificationPanel, WelcomeWizard, MoodCheckIn, GuidedPrayerPlayer x2, JournalTabContent). BB-37b found 2 more (AmbientAudioPicker desktop + mobile). |
| 14 | Skip link only on pages using `Layout` wrapper | BB-35 | Low | ~20 pages without skip link. BB-35 planned fix: move skip link to `Navbar.tsx`. |

---

## Design Decisions (Not Issues)

| # | Decision | Source | Rationale |
|---|----------|--------|-----------|
| 1 | Heatmap omits reading percentages | BB-43 | Anti-pressure design. No "you read 23% of the Bible" guilt-inducing metrics. The heatmap shows activity patterns without quantifying completeness. |
| 2 | Pray tab guided sessions use `max-w-4xl` (wider than `max-w-2xl` standard) | BB-37b Step 1 | Intentional. Square prayer cards in a 4-column grid need more horizontal space than the narrow text column. Documented with inline comment. |
| 3 | `VerseDisplay.tsx` uses `duration-[2000ms]` (not standard token) | BB-33, BB-37b Step 1 | Deliberate 2s slow-fade for verse highlight glow-out. Not a standard UI transition — it's a decorative visual effect. |
| 4 | No spaced repetition in memorization deck | BB-45 | Anti-pressure design. No SM-2, no Anki-style scheduling, no quizzing, no mastery tracking. Review = flipping a card. |
| 5 | No streak numbers in notification bodies | BB-41 | Anti-pressure design. Streak reminders say "Still time to read today" without mentioning the count. Test enforces no digits. |
| 6 | No badges for completing anxiety or sleep plans | BB-24, BB-25 | "A user who finishes 14 days does not need a digital trophy." Completion uses standard celebration, not custom trophies. |
| 7 | No "are you feeling better?" prompts in anxiety plan | BB-24 | "That question puts pressure on users who aren't feeling better." |
| 8 | No Jeremiah 29:11 in anxiety plan | BB-24 | Explicitly forbidden. "It does not belong in an anxiety plan." |
| 9 | Global CSS `prefers-reduced-motion` safety net covers ~130 files | BB-33 | Most files with transitions but no per-element motion guard are low-risk `transition-colors` caught by the CSS safety net. ~6 files have medium-risk missing guards. |

---

## BB-37b Audit Findings

### Step 1: Cross-Spec Integration Audit

| # | Category | Issue | Severity | Resolution |
|---|----------|-------|----------|------------|
| 1 | localStorage + Reactive Store | `VerseCardActions.tsx` imports deprecated `useBibleNotes` hook, writes to `wr_bible_notes` (old key). Notes from AI Bible Chat invisible to My Bible, heatmap, echoes. | Critical | Migrate to `lib/bible/notes/store.ts`. Needs thin adapter for API differences. ~30 min. |
| 2 | localStorage | `useScriptureEcho.ts` reads raw `wr_bible_highlights` and casts to old `BibleHighlight[]` schema. Date display in whisper toast may produce garbled output after highlight store migration. | Moderate | Import `getAllHighlights()` from `highlightStore` instead of reading raw localStorage. ~15 min. |
| 3 | Accessibility | `AmbientAudioPicker.tsx` desktop and mobile `role="dialog"` elements missing `aria-modal="true"`. Not in BB-35 audit list. | Low | Add `aria-modal="true"` to both branches. ~5 min. |
| 4 | Typography | `JournalInput.tsx` textarea uses `font-serif` for user input. Design system says serif is for scripture display only. Inconsistent with PrayerInput. | Low | Change to `font-sans`. ~5 min. |
| 5 | localStorage (hygiene) | `wr_notification_prompt_dismissed` key used as inline string literal in BibleReader.tsx, not a named constant. | Informational | Extract to constant. ~5 min. |

### Step 2: Voice and Consistency Audit

| # | Category | Issue | Severity | Resolution |
|---|----------|-------|----------|------------|
| 6 | Empty state copy | `MonthlyHighlights.tsx:63` — "No new badges this month — keep going!" reads as mild pressure after a negative state. | Low | Rewrite to "Badges come with time — you're doing great" or similar. |
| 7 | Empty state copy | `PrayerWallProfile.tsx:247` — "This person hasn't shared any prayers yet." Third-person, system-message tone. | Low | Warmer copy for own profile (second-person) and others. |
| 8 | Empty state copy | `PrayerWallProfile.tsx:274,304` and `PrayerWallDashboard.tsx:460` — "No replies yet." / "No reactions yet." Generic system messages. | Low | Consider warmer alternatives or remove messages entirely. |
| 9 | Empty state copy | `NotificationPanel.tsx:97` — "All caught up!" with emoji. Emoji inconsistent with project conventions. | Low | Remove emoji or replace with icon. |
| 10 | Notification settings | `NotificationsSection.tsx:214` — "if you haven't read yet today" is mildly negative framing. | Informational | Could rewrite to "if there's still time to read." Not urgent. |

### Step 3: Metrics Reconciliation

| # | Category | Issue | Severity | Resolution |
|---|----------|-------|----------|------------|
| 11 | Test failure | `JournalSearchFilter > search is case-insensitive` — expects 1 result, gets 2. Test data collision. Was fixed in BB-37, appears regressed. | Medium | Tighten test assertion or isolate test data. Not a production bug. |
| 12 | Bundle size | Main bundle grew from 97.5 KB to 99.87 KB gzip (+2.37 KB), exceeding BB-36 baseline of 97.6 KB. | Low | Expected growth from BB-30-46 features. Document as new baseline (99.87 KB). |

---

## Appendix: Empty States Not Yet Compliant

From BB-34 audit, these empty states were discovered but not in the BB-34 plan's fix scope:

| # | Location | Current Text | Issue |
|---|----------|-------------|-------|
| 1 | `PrayerWallProfile.tsx:274` | "No replies yet." | Generic system message |
| 2 | `PrayerWallProfile.tsx:304` | "No reactions yet." | Generic system message |
| 3 | `PrayerWallDashboard.tsx:460` | "No reactions yet." | Same pattern |
| 4 | `NotificationPanel.tsx:97` | "All caught up!" with emoji | Emoji inconsistent |
| 5 | `MoodTrendChart.tsx:189` | "Start checking in to see your mood trend" | Instructional |
| 6 | `PlanBrowserEmptyState.tsx` (all-started variant) | "Finish one to unlock" | Mild pressure |

---

## Appendix: BB-35 Accessibility Deferred Items

| # | Issue | Reason |
|---|-------|--------|
| 1 | ProfilePopup missing `aria-modal` | Inline popup, not a true modal |
| 2 | FormField adoption across all forms | Spec says no refactoring of working patterns |
| 3 | Audio transcripts for ambient sounds | Planned for future update (audio cluster) |
| 4 | Complex verse highlighting keyboard UX | Basic support exists; optimal SR experience deferred |
| 5 | Memorization card flip SR narration | Basic keyboard support exists; full narration deferred |
| 6 | Spotify embed accessibility | Third-party content, outside our control |
| 7 | No AAA compliance | Target is WCAG 2.2 AA only; AAA requires 7:1 contrast conflicting with cinematic design |
| 8 | No automated a11y testing infrastructure | No axe-core or CI integration; manual audit only |
| 9 | No RTL language support | English-only in v1 |
| 10 | No live captions/transcripts for audio | Future spec when audio cluster ships |
| 11 | Verse number superscripts < 44px touch target | Inherently small; verse text is the primary tap target |
| 12 | Color picker dots ~32px touch target | Constrained by inline palette design; documented exception |

---

## Appendix: BB-42 Search Deferred Follow-Ups

| # | Feature | Notes |
|---|---------|-------|
| 1 | Phrase search | Quoted exact phrases like `"God so loved the world"` |
| 2 | Fuzzy matching | Typo tolerance |
| 3 | Filters by testament, book, or genre | |
| 4 | Search history and saved searches | |
| 5 | Suggestions / autocomplete | |
| 6 | Cross-reference search | BB-9 cross-reference data |
| 7 | Analytics on search queries | |

---

## Appendix: BB-46 Echoes Deferred Follow-Ups

| # | Feature | Notes |
|---|---------|-------|
| 1 | Dismiss button | Allow users to dismiss an echo (no localStorage key yet) |
| 2 | Echoes feed page | `/bible/echoes` for browsing all echoes |
| 3 | My Bible integration | Intentionally excluded in v1 (My Bible is for intentional browsing) |
| 4 | Reading plan / devotional echoes | Only highlights, memorization, and reading activity in v1 |
| 5 | Social sharing | Echoes are private reminders, not shareable |
| 6 | Analytics | Tap rate tracking for future engagement analysis |

---

## Appendix: BB-45 Memorization Deferred Follow-Ups

| # | Feature | Notes |
|---|---------|-------|
| 1 | Card editing | Currently: remove and re-add |
| 2 | Deck export | |
| 3 | Card categories/tags | |
| 4 | Sort controls | Newest-first only in v1 |
| 5 | Search within the deck | |

---

## Appendix: Specs With No Outstanding Issues

The following specs have no deferred items, known issues, or limitations beyond the standard "no backend, no analytics, no Phase 3 features" pattern that applies to all specs:

- BB-3b (Chapter Picker)
- BB-6 (Verse Tap Action Sheet)
- BB-9 (Cross References)
- BB-10 (Daily Hub Bridge - Pray)
- BB-10b (Pray Persistence)
- BB-11 (Daily Hub Bridge - Journal)
- BB-11b (Journal Persistence)
- BB-12 (Daily Hub Bridge - Meditate)
- BB-13 (Share as Image)
- BB-14 (My Bible)
- BB-15 (Search My Bible)
- BB-18 (Verse of the Day)
- BB-19 (Last Read Resume)
- BB-20 (Ambient Audio Under Reading)
- BB-21 (Reading Plans Architecture)
- BB-21.5 (Plan Browser)
- BB-22 (Psalms 30 Days Plan)
- BB-23 (John Story of Jesus Plan)
- BB-24 (When You're Anxious Plan)
- BB-25 (When You Can't Sleep Plan)
- BB-30 (Explain This Passage)
- BB-31 (Reflect on Passage)
- BB-33 (Animations & Micro-Interactions)
- BB-38 (Deep Linking Architecture)
- BB-39 (PWA Offline Reading)
- BB-40 (SEO & Open Graph Cards)
