# Phase 3 Accessibility Notes — Cutover Smoke Test

**Status:** PLACEHOLDER — replace this file's body during the Phase 3 cutover smoke test execution. CC scaffolds the structure; Eric authors the real content.

**Cutover spec:** Spec 3.12 — Phase 3 Cutover (Prayer Wall Read-Swap)
**Cutover date:** _____________ (Eric fills in)
**Authored by:** Eric Champlin
**Pairs with:** `_cutover-evidence/phase3-a11y-smoke.json` (axe-core JSON output)

---

## Scope (Universal Rule 17)

Phase 3 (Spec 3.12) wired the four Prayer Wall page consumers to the backend that Specs 3.1–3.7, 3.10, and 3.11 shipped. No net-new user-visible UI; the existing `PrayerCard`, `InteractionBar`, `CommentsSection`, `InlineComposer`, `CommentInput`, `MarkAsAnsweredForm`, `DeletePrayerDialog`, `QotdComposer`, `FeatureEmptyState` (for new error/loading states), and `PrayerWallSkeleton` are all rendered as before — they're now driven by real backend data instead of mock data. The accessibility smoke test verifies the four routes still scan clean against WCAG 2.2 AA — it is a regression check + verification that the new loading skeletons and error empty states do not introduce a11y issues, not a net-new audit.

**Routes scanned:**
- `/prayer-wall` — main feed
- `/prayer-wall/:id` — detail page (use Sarah's post UUID created during Smoke 5)
- `/prayer-wall/dashboard` — private dashboard (5 tabs)
- `/prayer-wall/user/:id` — public profile (use Sarah's UUID)

---

## 1. axe-core automated scan

- [ ] Scan completed against all four routes above
- [ ] Zero CRITICAL violations across all scanned routes
- [ ] JSON output committed to `_cutover-evidence/phase3-a11y-smoke.json`
- [ ] Any non-CRITICAL findings recorded as follow-up entries in `_plans/post-1.10-followups.md`

**Findings summary:** _____________ (Eric fills in: e.g., "0 CRITICAL, 0 SERIOUS — scan clean" or specific finding details)

---

## 2. Keyboard-only walkthrough

Performed without using the mouse/trackpad. Confirms tab order, focus indicators, and keyboard activation.

### Flow 1: Compose and submit a prayer

- [ ] Tab from page top → focus reaches the "Share a Prayer Request" button
- [ ] Enter/Space activates the button → focus moves into the InlineComposer
- [ ] Tab through textarea → category radiogroup → anonymous checkbox → Submit/Cancel
- [ ] Submit button shows `aria-busy` during in-flight request (verify via screen reader announcement)
- [ ] Successful submission closes the composer and announces the success toast

**Issues found:** _____________ (Eric fills in)

### Flow 2: Comment on a post

- [ ] Tab from feed → focus reaches a card's "View comments" toggle
- [ ] Enter expands the comments section
- [ ] Tab through comment items → comment input → Send button
- [ ] Send button is disabled (`disabled` + `aria-disabled`) until input has content
- [ ] Enter inside the input also submits

**Issues found:** _____________ (Eric fills in)

### Flow 3: Dashboard tab navigation

- [ ] Tab to the tablist on `/prayer-wall/dashboard`
- [ ] Arrow keys cycle through the 5 tabs (roving tabindex)
- [ ] Home/End keys jump to first/last tab
- [ ] Active tab content updates correctly
- [ ] Loading skeleton has `aria-busy="true"` and screen reader announces "Loading"
- [ ] Error state retry button is keyboard-activatable

**Issues found:** _____________ (Eric fills in)

---

## 3. VoiceOver spot-check

Performed with VoiceOver enabled (Cmd+F5 on macOS) on the InlineComposer + CommentInput interactions, plus the new loading/error states added by Spec 3.12.

### InlineComposer VoiceOver

- [ ] Textarea announces label "Prayer request"
- [ ] Category radiogroup announces "Prayer category, radio group"
- [ ] Each radio announces "selected" / "not selected" appropriately
- [ ] Submit button announces "busy" during submission

**Issues found:** _____________ (Eric fills in)

### CommentInput VoiceOver

- [ ] Input announces label "Comment"
- [ ] Send button announces "Submit comment, button"
- [ ] When `isSubmitting=true`, button announces busy state

**Issues found:** _____________ (Eric fills in)

### FeatureEmptyState (new in Spec 3.12 for fetch errors) VoiceOver

- [ ] Heading "We couldn't load prayers" announced as level-3 heading
- [ ] Description announced with the brand-voice copy (no exclamation points near vulnerability)
- [ ] Retry button announces "Try again, button"

**Issues found:** _____________ (Eric fills in)

### PrayerWallSkeleton (existing, used during initial load) VoiceOver

- [ ] Container has `aria-busy="true"`
- [ ] Sr-only "Loading" announced
- [ ] No keyboard trap; user can Escape out or wait

**Issues found:** _____________ (Eric fills in)

---

## 4. Anti-pressure copy verification

Spec 3.12 added two new user-facing strings (both via `mapApiErrorToToast` taxonomy that pre-existed in Spec 3.10):

- "We couldn't load prayers" / "We couldn't load this prayer" / "We couldn't load this profile" / "We couldn't load your prayers" / "We couldn't load your bookmarks" — page-level FeatureEmptyState headings on fetch errors
- "My comments are coming soon" / "Replies are coming soon" — flag-on backend-gap empty states for the dashboard's My Comments tab and the public profile's Replies tab

Verify these pass the Anti-Pressure Copy Checklist:

- [ ] No comparison framing
- [ ] No urgency markers
- [ ] No exclamation points
- [ ] No therapy-app jargon
- [ ] No streak-as-shame or missed-X framing
- [ ] No false scarcity
- [ ] Sentence case + period terminator
- [ ] Blameless framing ("We couldn't" not "Your connection failed")

**All 8 boxes pass:** _____________ (Eric verifies)

---

## 5. Summary

- [ ] Routes scanned successfully
- [ ] Keyboard walkthrough completed without dead-ends
- [ ] VoiceOver spot-check completed without blocking issues
- [ ] Anti-pressure copy verification passed
- [ ] Evidence committed alongside this notes file

**Overall a11y posture:** _____________ (Eric: "Pass — no regressions" or specific summary)
