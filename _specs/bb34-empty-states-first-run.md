# BB-34: Empty States & First-Run

**Master Plan Reference:** N/A — standalone consistency-and-polish spec within the Bible redesign wave.

**Branch:** `bible-redesign` (no new branch)

**Depends on:** BB-33 (animations), BB-30 through BB-46 (feature wave substantially complete), BB-40 (SEO/canonical URLs), existing `FeatureEmptyState` component.

**Hands off to:** BB-35 (accessibility audit), BB-36 (performance), BB-37 (code health + Playwright full audit).

---

## Overview

Empty states are the first thing brand-new users see across most of Worship Room — no highlights, no notes, no bookmarks, no reading history, no streak. If any of these surfaces feel neglected, the user's first impression is "this app isn't ready for me yet," which is fatal for a calm-aesthetic devotional app that depends on the user trusting the space. BB-34 audits every empty state in the app, standardizes them on a single warm pattern, and builds a gentle first-run welcome for brand-new users that introduces the core value without overwhelming.

## User Story

As a **brand-new visitor** landing on Worship Room for the first time, I want to see friendly, specific descriptions of what each feature does (instead of blank pages or "No data" messages) so that I understand the app is ready for me and I know what to do next.

As a **returning user** who hasn't engaged with a specific feature yet, I want to see a warm, pressure-free explanation of the feature with a natural next action so that I feel invited rather than judged for not having used it yet.

## Requirements

### Functional Requirements

#### Empty-State Audit & Standardization

1. A complete audit document is produced at `_plans/recon/bb34-empty-states.md` listing every empty state in the app before any code changes begin. Each entry includes: page/feature name, route or component path, the empty condition, current behavior, standard compliance, and action required.
2. The audit covers every route in `App.tsx`, every tab in the Daily Hub, every list-rendering component, and every filter/search/sort affordance that can produce zero results.
3. All empty states use the existing `FeatureEmptyState` component (or a documented variant if the audit finds a genuine need for extension).
4. All empty-state copy follows these rules:
   - **Warm, not instructional.** "Your reading history will show up here as you read" not "No data."
   - **Second person, present tense.** "You haven't saved any verses yet" not "No verses saved."
   - **Anti-pressure.** No "start your journey today!" or "begin your streak!" — just the quiet invitation.
   - **Specific to the feature.** Each one names the feature and the natural next action.
5. Empty states that need a CTA have a white pill CTA button linking to the natural next action. Empty states that don't need one (e.g., "Highlight verses in the Bible reader to see them here") don't have a CTA forced in.
6. Empty states that already match the standard (verified during audit) are left unchanged. BB-34 doesn't refactor for its own sake.
7. Empty states from BB-43 (heatmap, progress map) and BB-45 (memorization deck) are verified to match the standard but left unchanged unless the audit finds a real issue.

#### Preliminary Empty States Inventory

The audit must cover at minimum these surfaces (and discover any the spec missed):

**High-priority (almost every user sees):**
- My Bible page (`/bible/my`) — activity feed empty when no highlights/notes/bookmarks
- Reading heatmap (BB-43) — empty state per BB-43
- Bible progress map (BB-43) — empty state per BB-43
- Memorization deck (BB-45) — empty state per BB-45
- Dashboard / home page — new users have no streak, activity, or personalized data
- Daily Hub devotional tab — always has seeded content, but completion tracking states
- Daily Hub pray tab — empty when no drafts or saved prayers
- Daily Hub journal tab — empty when no entries
- Daily Hub meditate tab — "recent sessions" area may be empty

**Medium-priority:**
- Prayer Wall user's own posts list, Prayer Wall profile (no posts), Prayer Wall dashboard (no saved prayers)
- Ask page — no conversation history
- Insights page — no mood or reading data
- Friends page — no friends
- Leaderboard — no rank
- Reading plans list — no active plans
- Reading plan detail — day 1 not started
- Music page — empty favorites, empty recent sessions
- Settings — notifications/activity sections empty

**Low-priority but important:**
- Bible search results (BB-42) — zero results for a query
- Bible search mode (BB-38 + BB-42) — empty query state
- Bookmarks list — empty
- Highlights filter results — zero results per color filter
- Notes list — empty
- Activity feed filters — zero results per type filter
- Local support — zero churches/counselors in area
- Any modal or drawer that can render empty

#### First-Run Welcome

8. A new `FirstRunWelcome` component exists at `frontend/src/components/onboarding/FirstRunWelcome.tsx`.
9. The welcome is a single-screen frosted-glass card with:
   - A warm greeting heading: "Welcome to Worship Room"
   - A 2-3 sentence description of what the app is
   - 3-4 "start here" options as clickable cards or pills
   - A "Maybe later" dismiss text link
10. The welcome uses the frosted-glass pattern: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6`, max-width ~480px on desktop, full-width with margins on mobile.
11. The welcome uses BB-33's `animate-fade-in-up` entrance animation.
12. A new localStorage key `wr_first_run_completed` (timestamp value) gates the welcome's appearance. If the key is absent, the user is on their first run. If present, the welcome never shows again.
13. The welcome appears only on the home page (`/`) or Dashboard — NOT on deep-linked routes (e.g., `/bible/john/3?verse=16` must show the verse, not the welcome).
14. Clicking any "start here" option sets the localStorage key and dismisses the welcome, then navigates to the selected route.
15. Clicking "Maybe later" sets the localStorage key and dismisses the welcome.
16. The welcome is NOT a gate — the home page or Dashboard is fully accessible behind it. The welcome renders as an overlay card, not a blocking modal.
17. Both Escape key and a visible tap target dismiss the welcome (mobile users need a tap target, desktop users need keyboard access).
18. If the user clears localStorage, the welcome will reappear. This is expected behavior — localStorage is the only persistence mechanism, and a cleared localStorage makes the user effectively new.

#### "Start Here" Options

The plan phase proposes exact copy for review. Preliminary options (subject to approval):

1. **Read the Bible** — links to `/bible`
2. **Try a daily devotional** — links to `/daily`
3. **Take the starting point quiz** — links to the `#quiz` anchor on the landing page (if the StartingPointQuiz still exists in the codebase; otherwise this option is omitted)
4. **Browse reading plans** — links to `/grow` or `/bible/plans`

### Non-Functional Requirements

- **Performance:** Zero new npm packages. No animated illustrations or Lottie files. Static Lucide icons only. Lighthouse performance score must not regress.
- **Accessibility:** `FeatureEmptyState` must meet WCAG AA standards — proper heading hierarchy, sufficient contrast (text-white/70 on hero-bg passes 4.5:1), keyboard-accessible CTAs. First-run welcome must be dismissible via Escape key and visible tap target.
- **Bundle size:** No new assets. No decorative illustrations.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View empty states | Sees empty state with feature description + CTA | Same | N/A |
| Click empty state CTA | Navigates to target (no auth gate on empty states themselves) | Same | N/A |
| View first-run welcome | Sees welcome on first visit to home page | Sees welcome on first visit to Dashboard | N/A |
| Dismiss first-run welcome | Sets localStorage key, closes welcome | Same | N/A |
| Click "start here" option | Navigates to target route (Bible, Daily Hub, etc.) | Same | N/A |

**Zero new auth gates.** Empty states and the first-run welcome are visible to all users regardless of auth status. CTAs within empty states link to existing pages — the target pages already have their own auth gating if needed.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | `FeatureEmptyState`: full-width centered, `min-h-[50vh]`, icon `h-10 w-10`. First-run welcome: full-width with `mx-4` margins. "Start here" options stack vertically. |
| Tablet (640-1024px) | `FeatureEmptyState`: same centered layout with more breathing room. First-run welcome: `max-w-md mx-auto`. "Start here" options in 2-column grid. |
| Desktop (> 1024px) | `FeatureEmptyState`: centered within page content area. First-run welcome: `max-w-[480px] mx-auto`. "Start here" options in 2-column grid or horizontal row. |

All empty states and the welcome use `min-h-[44px]` touch targets on CTAs per the 44px minimum.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required. Empty states display static copy only.

## Auth & Persistence

- **Logged-out users:** See all empty states and the first-run welcome. Zero data persistence beyond `wr_first_run_completed` localStorage key (which is a UI preference, not user data).
- **Logged-in users:** Same behavior. The `wr_first_run_completed` key persists across logout (it is NOT cleared on logout, same as other UI preference keys).
- **localStorage usage:** One new key: `wr_first_run_completed` (timestamp string). Documented in `.claude/rules/11-local-storage-keys.md`.

## Completion & Navigation

N/A — standalone feature. Empty states do not participate in daily completion tracking. The first-run welcome is a one-time navigation helper, not a trackable activity.

## Design Notes

- **Empty states** use the existing `FeatureEmptyState` component with:
  - Lucide icons at `h-10 w-10 text-white/30 sm:h-12 sm:w-12`
  - Heading at `text-lg font-bold text-white/70`
  - Description at `text-sm text-white/60` with comfortable max-width
  - Primary CTA using the **inline white pill CTA pattern** from `09-design-system.md`
  - Secondary action as text link in `text-white/50 hover:text-white/70`
  - Centered in a `min-h-[50vh]` container
- **First-run welcome** uses the `FrostedCard` visual pattern: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6` with dual box-shadow
- **First-run entrance** uses `animate-fade-in-up` from BB-33's token system
- **Text defaults** follow the Round 3 standard: `text-white` for readable text, muted opacities only for decorative/secondary elements
- **No GlowBackground** on empty states — they inherit whatever background the parent page provides
- **No design system recon file needed** — all patterns are existing components
- `_plans/recon/design-system.md` exists and can be referenced during planning for exact CSS values

## What BB-34 Explicitly Does NOT Do

- No multi-step onboarding tour
- No forced account creation
- No personality quiz or survey on first run (may LINK to the existing StartingPointQuiz as an optional path)
- No email capture on first run
- No animated illustrations or Lottie files
- No celebration animations when a user completes their first action
- No progress indicators or "getting started" checklists
- No toast or banner celebrating the user "unlocking" features
- No changes to existing feature behavior (only touches empty states)
- No backend — first-run detection is localStorage-only
- No A/B testing of the welcome content
- No animated entrance beyond BB-33's fade-in-up
- No new auth gates
- No copy changes to populated states
- No changes to seeded content
- No new npm packages
- No changes to BB-45 memorization deck empty state or BB-43 heatmap/progress map empty states (unless the audit finds a real issue)

## Out of Scope

- **Backend persistence** of first-run state — deferred to Phase 3 when user accounts are real
- **A/B testing** of welcome content or copy — ship one version
- **Animated illustrations** in empty states — static Lucide icons only
- **Light mode** variants of empty states — dark theme only (Phase 4)
- **Localization / i18n** of empty-state copy — English only for MVP
- **Email or push notification** based on empty state (e.g., "You haven't journaled yet, try it!") — out of scope
- **Dashboard widget rearrangement** based on empty vs populated state — existing widget priority handles this
- **Changes to existing first-run onboarding** (WelcomeWizard, GettingStartedCard, progressive disclosure tooltips) — BB-34 builds the new `FirstRunWelcome` only; the plan phase determines if existing onboarding components need coordination or should coexist

## Acceptance Criteria

- [ ] A complete audit document exists at `_plans/recon/bb34-empty-states.md` listing every empty state in the app, its current behavior, its standard compliance, and the action taken
- [ ] The audit covers every route in `App.tsx`, every tab in the Daily Hub, every list-rendering component, and every filter/search/sort affordance that can produce zero results
- [ ] All empty states use `FeatureEmptyState` (or a documented variant if extension is justified)
- [ ] All empty-state copy follows the warm, second-person, anti-pressure rules
- [ ] Every empty state has a clear explanation of what the feature is for, not generic "No data" text
- [ ] Empty states that need a CTA have a white pill CTA button; those that don't need one don't have one forced in
- [ ] `FeatureEmptyState` meets WCAG AA — proper heading hierarchy, sufficient contrast, keyboard-accessible CTAs
- [ ] `FirstRunWelcome` component exists at `frontend/src/components/onboarding/FirstRunWelcome.tsx`
- [ ] First-run welcome is a single-screen card with greeting, description, 3-4 "start here" options, and dismiss link
- [ ] Welcome uses frosted-glass pattern (`bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl`)
- [ ] Welcome uses `animate-fade-in-up` entrance animation from BB-33
- [ ] Welcome appears only on first visit to home page or Dashboard, not on deep-linked routes
- [ ] Welcome gated by `wr_first_run_completed` localStorage key
- [ ] Clicking any "start here" option sets the key and dismisses the welcome
- [ ] Clicking "Maybe later" sets the key and dismisses the welcome
- [ ] Welcome is NOT a gate — underlying page is fully accessible
- [ ] All "start here" options navigate to working routes
- [ ] Welcome respects `prefers-reduced-motion` per BB-33's global safety net
- [ ] Welcome is dismissible via both Escape key and visible tap target
- [ ] All BB-30 through BB-33 tests continue to pass unchanged
- [ ] At least 20 component tests cover empty state rendering across representative pages
- [ ] At least 8 component tests cover the `FirstRunWelcome` component (render, dismiss, click-through, reduced motion, localStorage persistence)
- [ ] At least 4 integration tests cover first-run detection logic (new user sees welcome, returning user doesn't, deep-linked user doesn't)
- [ ] No TypeScript errors, no new lint warnings
- [ ] Zero new auth gates
- [ ] Exactly one new localStorage key: `wr_first_run_completed`
- [ ] New key documented in `.claude/rules/11-local-storage-keys.md`
- [ ] Audit document committed at `_plans/recon/bb34-empty-states.md` as durable reference
- [ ] Lighthouse performance score does not regress
- [ ] Final verification includes a repo-wide sweep confirming zero empty states with generic "No data" text remain (BB-33 process lesson)
