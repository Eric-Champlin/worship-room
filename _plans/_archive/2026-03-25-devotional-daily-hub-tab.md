# Implementation Plan: Merge Devotional into Daily Hub as First Tab

**Spec:** `_specs/devotional-daily-hub-tab.md`
**Date:** 2026-03-25
**Branch:** `claude/feature/devotional-daily-hub-tab`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

> **Recon Staleness Note:** Design system recon was captured 2026-03-06. Since then, the daily-hub-hero-redesign and inner-page-hero-redesign features were committed (see git log). The Daily Hub hero layout has changed. The tab bar styling and tab content patterns are still current. Hero values in this plan are taken from the current codebase (`DailyHub.tsx`), not the recon.

---

## Architecture Context

### Directory Conventions
- **Pages:** `frontend/src/pages/` — `DailyHub.tsx`, `DevotionalPage.tsx`
- **Tab content components:** `frontend/src/components/daily/` — `PrayTabContent.tsx`, `JournalTabContent.tsx`, `MeditateTabContent.tsx`
- **Devotional components:** `frontend/src/components/devotional/` — `RelatedPlanCallout.tsx`
- **Types:** `frontend/src/types/` — `daily-experience.ts`, `devotional.ts`, `dashboard.ts`
- **Data:** `frontend/src/data/devotionals.ts` — `getTodaysDevotional()`, `formatDevotionalDate()`
- **Constants:** `frontend/src/constants/dashboard/activity-points.ts`
- **Tests:** `frontend/src/pages/__tests__/DailyHub.test.tsx`, `DevotionalPage.test.tsx`

### Existing Patterns

**Tab bar** (`DailyHub.tsx` lines 33-37, 300-355):
- `TABS` array of `{ id, label, icon }`, typed as `TabId`
- `isValidTab()` type guard for query params
- Default tab: `'pray'` (will change to `'devotional'`)
- Animated underline: `width: ${100 / TABS.length}%`, `translateX(${index * 100}%)`
- Tab content: mounted but CSS-hidden via `hidden={activeTab !== tab.id}`
- WAI-ARIA Tabs: `role="tablist"`, `role="tab"`, `role="tabpanel"`, keyboard arrow navigation

**Tab content container** (`PrayTabContent.tsx` line 390):
```tsx
<div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
  <div className="relative">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.12]" style={SQUIGGLE_MASK_STYLE}>
      <BackgroundSquiggle />
    </div>
    <div className="relative">
      {/* Content */}
    </div>
  </div>
</div>
```

**Heading pattern** (`PrayTabContent.tsx` lines 672-677):
```tsx
<h2 className="mb-4 text-center font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
  What's On Your{' '}
  <span className="font-script text-3xl text-primary sm:text-4xl lg:text-5xl">Heart?</span>
</h2>
```

**Cross-tab CTA pattern** (`PrayTabContent.tsx` lines 650-657):
```tsx
<button type="button" onClick={() => onSwitchToJournal?.(topic)}
  className="text-sm font-medium text-primary transition-colors hover:text-primary-light">
  Journal about this &rarr;
</button>
```

**DevotionalPage** (`DevotionalPage.tsx` lines 29-331):
- Date nav: `dayOffset` from `?day=` param, clamped to [-7, 0]
- Content sections: title, quote (Lora italic), passage (verse numbers), reflection, prayer, question card
- Reading completion: Intersection Observer on question ref, fires for today only, logged-in only
- `wr_devotional_reads`: array of date strings (max 365)
- RelatedPlanCallout: theme-matched reading plan link
- Swipe: `useSwipe` hook for day browsing

**Context passing** (`DailyHub.tsx` lines 69, 132-138):
- `PrayContext` type: `{ from: string, topic: string }`
- `handleSwitchToJournal`: sets context and switches tab via `setSearchParams`

**Route redirects** (`App.tsx` lines 142-144):
```tsx
<Route path="/pray" element={<Navigate to="/daily?tab=pray" replace />} />
```

### Activity Tracking

**`ActivityType`** (`types/dashboard.ts` line 15): Does NOT include `'devotional'`. Current types: `mood | pray | listen | prayerWall | meditate | journal | readingPlan | gratitude | reflection | challenge | localVisit`.

**`useCompletionTracking`** (`hooks/useCompletionTracking.ts`): Tracks pray/journal/meditate per day. Does NOT track devotional. `DailyCompletion` interface has `pray: boolean`, `journal: boolean`, `meditate: { completed, types }`.

### Test Patterns

**DailyHub.test.tsx** (lines 1-60):
- Mocks: `useAuth`, `useFaithPoints`, `AudioProvider` (`useAudioState`, `useAudioDispatch`), `useScenePlayer`
- Render helper: `MemoryRouter` + `ToastProvider` + `AuthModalProvider` + `<DailyHub />`
- Uses `screen.getByRole`, `userEvent`, `waitFor`

### Files With `/devotional` Links (all need updating)

| File | Line | Current Target |
|------|------|---------------|
| `DailyHub.tsx` | 245 | `to="/devotional"` (hero card) |
| `Navbar.tsx` | 27, 631, 908 | `to="/devotional"` |
| `TodaysDevotionalCard.tsx` | 43, 50 | `to="/devotional"` |
| `MoodRecommendations.tsx` | 104 | `route: '/devotional'` |
| `DevotionalTeaser.tsx` | 18 | `to="/devotional"` |
| `SeasonalBanner.tsx` | 72 | `to="/devotional"` |
| `App.tsx` | 135 | Route definition |

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View devotional tab content | No auth required | Step 2 | N/A — public |
| Browse days (arrows) | No auth required | Step 2 | N/A — public |
| Reading completion tracking | Auth required — only logged-in users | Step 3 | `useAuth().isAuthenticated` check before localStorage write |
| Cross-tab CTAs (Journal/Pray) | No auth required — target tabs handle their own gating | Step 4 | N/A — downstream auth |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Tab content container | max-width | `672px` / `max-w-2xl` | `PrayTabContent.tsx:390` |
| Tab content container | padding | `px-4 py-10 sm:py-14` | `PrayTabContent.tsx:390` |
| BackgroundSquiggle wrapper | classes | `pointer-events-none absolute inset-0 opacity-[0.12]` | `PrayTabContent.tsx:393-394` |
| Heading — base text | font/size | `font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl` | `PrayTabContent.tsx:672` |
| Heading — script word | font/size | `font-script text-3xl text-primary sm:text-4xl lg:text-5xl` | `PrayTabContent.tsx:674` |
| Tab button | classes | `flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium` | `DailyHub.tsx:324` |
| Tab active color | color | `text-white` | `DailyHub.tsx:326` |
| Tab inactive color | color | `text-white/60 hover:text-white/80` | `DailyHub.tsx:327` |
| Tab underline | color/height | `h-0.5 bg-primary` | `DailyHub.tsx:346` |
| Date nav — enabled | color | `text-white/40 hover:text-white/70` | `DevotionalPage.tsx:187` |
| Date nav — disabled | color | `text-white/15 cursor-not-allowed` | `DevotionalPage.tsx:186` |
| Date nav — button size | min size | `min-h-[44px] min-w-[44px]` | `DevotionalPage.tsx:184` |
| Date text | style | `text-lg text-white/85 sm:text-xl` | `DevotionalPage.tsx:195` |
| Quote — decorative mark | style | `font-serif text-5xl leading-none text-white/20` | `DevotionalPage.tsx:230` |
| Quote — text | style | `font-serif text-xl italic leading-relaxed text-white/70 sm:text-2xl` | `DevotionalPage.tsx:233` |
| Quote — attribution | style | `text-sm text-white/40` | `DevotionalPage.tsx:236` |
| Passage — reference | style | `text-xs font-medium uppercase tracking-widest text-primary-lt` | `DevotionalPage.tsx:242` |
| Passage — text | style | `font-serif text-base italic leading-relaxed text-white/70 sm:text-lg` | `DevotionalPage.tsx:245` |
| Verse numbers | style | `font-sans text-xs text-white/30 align-super` | `DevotionalPage.tsx:248` |
| Reflection | style | `text-base leading-relaxed text-white/80` with `space-y-4` | `DevotionalPage.tsx:259` |
| Prayer — label | style | `text-xs font-medium uppercase tracking-widest text-white/40` | `DevotionalPage.tsx:268` |
| Prayer — text | style | `font-serif text-base italic leading-relaxed text-white/60` | `DevotionalPage.tsx:271` |
| Question card | classes | `rounded-2xl border border-white/10 border-l-2 border-l-primary bg-white/[0.06] p-4 backdrop-blur-sm sm:p-6` | `DevotionalPage.tsx:278` |
| Question — prefix | style | `text-sm text-white/40` | `DevotionalPage.tsx:279` |
| Question — text | style | `text-lg font-medium text-white` | `DevotionalPage.tsx:280` |
| Theme tag pill | style | `rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/50` | `DailyHub.tsx:262` |
| Section dividers | style | `border-t border-white/10 py-8 sm:py-10` | `DevotionalPage.tsx:228,241,258,267,277` |
| Cross-tab CTA | style | `text-sm font-medium text-primary transition-colors hover:text-primary-light` | `PrayTabContent.tsx:654` |
| Content column inner | classes | `mx-auto max-w-2xl px-4 sm:px-6` | `DevotionalPage.tsx:221` |

---

## Design System Reminder

- Worship Room uses **Caveat** (`font-script`) for script/highlighted headings, not Lora
- Squiggle backgrounds use `SQUIGGLE_MASK_STYLE` for fade mask + `opacity-[0.12]`
- All tabs share `max-w-2xl` container width with `px-4 py-10 sm:py-14`
- Tab bar uses `text-white` active / `text-white/60` inactive (NOT `text-primary` / `text-text-light` — those are from the old light theme)
- Hero devotional card uses `to="/devotional"` Link — this must become a tab switch, not a navigation
- Date strings for `wr_devotional_reads` use `toLocaleDateString('en-CA')` format (YYYY-MM-DD)
- Devotional content uses `bg-[#0f0a1e]` as page background (dark), but inside the Daily Hub the background is `bg-dashboard-dark`
- Daily Hub background is `bg-dashboard-dark` — devotional content adapts to this context
- Section dividers in devotional content use `border-t border-white/10` between each section

---

## Shared Data Models

**DevotionalTabContent will need devotional context to pass to other tabs:**

```typescript
// Existing type (types/daily-experience.ts)
export interface PrayContext {
  from: string
  topic: string
}

// Existing function (data/devotionals.ts)
getTodaysDevotional(date?: Date, dayOffset?: number): Devotional
formatDevotionalDate(date?: Date, dayOffset?: number): string
```

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_devotional_reads` | Both | Array of date strings marking completed devotional reads |
| `worship-room-daily-completion` | Read | Daily tab completion tracking (existing) |

**New ActivityType addition:**
| Key | Points | Display Name | Checklist Name |
|-----|--------|-------------|----------------|
| `devotional` | 10 | `Read devotional` | `Read devotional` |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | 4 tabs icon-only (< 400px), full-width content, `px-4`, stacked CTAs, swipe for day browsing |
| Small mobile+ | 400px | 4 tabs with icon + short label ("Devos", "Pray", "Journal", "Meditate") |
| Tablet | 768px | `max-w-2xl` centered, `text-2xl` quote, horizontal CTAs |
| Desktop | 1440px | `max-w-2xl mx-auto`, generous spacing, no swipe |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Heading → date navigation | `mb-4` (16px) | Heading pattern from PrayTabContent |
| Date navigation → devotional title | `pt-8 sm:pt-10` (32px/40px) | DevotionalPage.tsx:223 |
| Between content sections | `border-t border-white/10 py-8 sm:py-10` | DevotionalPage.tsx:228,241,258,267,277 |
| Question card → RelatedPlanCallout | `py-8 sm:py-10` (in question section) + callout's own margin | DevotionalPage.tsx:287 |
| RelatedPlanCallout → CTAs | `mt-8 sm:mt-10` | DevotionalPage.tsx:297 |
| CTAs → bottom padding | `pb-16 sm:pb-20` | DevotionalPage.tsx:326 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/devotional-daily-hub-tab` is current and checked out
- [ ] The recent hero redesign commits are on this branch (hero card → tab switch behavior depends on current hero layout)
- [ ] `pnpm test` passes on the current branch before changes begin
- [ ] All auth-gated actions from the spec are accounted for in the plan (only reading completion tracking is gated)
- [ ] Design system values are verified from codebase inspection (all values sourced from specific files/lines)
- [ ] The `devotional` ActivityType does not yet exist — Step 3 adds it
- [ ] The `DailyCompletion` type does not yet have a `devotional` field — Step 3 addresses this via `wr_devotional_reads` (separate from `DailyCompletion`, matching existing standalone behavior)
- [ ] `useCompletionTracking` does NOT need modification — devotional uses its own separate `wr_devotional_reads` tracking (not the `DailyCompletion` localStorage key), same as the standalone page

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Devotional completion uses `wr_devotional_reads` not `DailyCompletion` | Keep existing mechanism | Spec says "no new localStorage keys" and "reading completion mechanism unchanged" |
| Share & Read Aloud buttons | Carry over into tab content | They existed on standalone page and are useful; spec says "optional" but they're trivial to include |
| Hero card click becomes tab switch | Use `switchTab('devotional')` callback instead of `<Link>` | Spec requires "in-page tab switch, not route change" |
| `?day=` param with non-devotional tabs | Ignored by other tabs, consumed by devotional | Spec explicitly states this behavior |
| Tab label on mobile | "Devos" above 400px, icon-only below | Spec requirement for 4-tab mobile fit |
| `recordActivity('devotional')` | Add to ActivityType + constants | Spec says "integrate with existing activity tracking system" |
| Context passing to Journal | Pass `{ from: 'devotional', topic: devotional.theme }` | Follows PrayContext pattern; spec says pass theme or title |
| Context passing to Pray | Pass devotional passage reference as initial context | Spec says "pre-fill prayer starter" |
| Redirect preserves `?day=` | Custom redirect component, not simple `<Navigate>` | Spec requires `/devotional?day=-3` → `/daily?tab=devotional&day=-3` |

---

## Implementation Steps

### Step 1: Expand Tab Bar to 4 Tabs + DevotionalTabContent Skeleton

**Objective:** Add the Devotional tab to the Daily Hub tab bar, change the default tab, create a skeleton `DevotionalTabContent` component, and mount it.

**Files to create/modify:**
- `frontend/src/pages/DailyHub.tsx` — Add `devotional` tab, change default, mount panel
- `frontend/src/components/daily/DevotionalTabContent.tsx` — New skeleton component

**Details:**

1. **DailyHub.tsx — TABS array** (line 33): Add `{ id: 'devotional', label: 'Devotional', mobileLabel: 'Devos', icon: BookOpen }` as the FIRST element. Keep existing 3 tabs in order after it. Update `TabId` type.

2. **DailyHub.tsx — `isValidTab()`** (line 41): Add `'devotional'` to the check.

3. **DailyHub.tsx — default tab** (line 63): Change fallback from `'pray'` to `'devotional'`.

4. **DailyHub.tsx — imports**: Add `BookOpen` from lucide-react, import `DevotionalTabContent`.

5. **DailyHub.tsx — tab button label** (line 331): Use `tab.mobileLabel || tab.label` for the visible text. Add responsive class: below 400px show icon-only (hide label text), above 400px show icon + label. Use Tailwind `hidden min-[400px]:inline` on the label span.

6. **DailyHub.tsx — tab panel** (after line 362): Add a new `role="tabpanel"` div for devotional, mounted but hidden like the others:
   ```tsx
   <div role="tabpanel" id="tabpanel-devotional" aria-labelledby="tab-devotional" tabIndex={0} hidden={activeTab !== 'devotional'}>
     <DevotionalTabContent onSwitchToJournal={handleSwitchToDevotionalJournal} onSwitchToPray={handleSwitchToDevotionalPray} />
   </div>
   ```

7. **DailyHub.tsx — context handlers**: Add `handleSwitchToDevotionalJournal` (sets journal context from devotional theme) and `handleSwitchToDevotionalPray` (sets pray context from devotional passage reference). These call `switchTab` with the appropriate tab.

8. **DailyHub.tsx — hero devotional card** (line 244): Change from `<Link to="/devotional">` to a `<button>` that calls `switchTab('devotional')`. Preserve all styling and content.

9. **DailyHub.tsx — completionMap** (line 143): Add `devotional: hasReadDevotional` to the map so the tab bar shows a checkmark.

10. **DevotionalTabContent.tsx — skeleton**: Create with the standard tab content container pattern (BackgroundSquiggle + SQUIGGLE_MASK_STYLE + max-w-2xl), heading "What's On Your **Soul?**", and a placeholder `<p>` for content. Accept props `onSwitchToJournal` and `onSwitchToPray`.

**Responsive behavior:**
- Desktop (1440px): 4 tabs with icon + full labels, comfortable spacing
- Tablet (768px): 4 tabs with icon + label, adequate spacing
- Mobile ≥ 400px: 4 tabs with icon + short labels ("Devos", "Pray", "Journal", "Meditate")
- Mobile < 400px: 4 tabs icon-only — label text hidden via `hidden min-[400px]:inline`

**Guardrails (DO NOT):**
- DO NOT change the tab bar sticky/frosted glass/shadow behavior
- DO NOT change the animated underline calculation — it auto-adapts via `100 / TABS.length`
- DO NOT unmount tab panels on switch — use `hidden` attribute
- DO NOT change any existing tab content component

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders 4 tabs in correct order | integration | Verify tab buttons: Devotional, Pray, Journal, Meditate |
| defaults to devotional tab | integration | Navigate to `/daily` with no params → devotional tab selected |
| `?tab=pray` still works | integration | Verify backwards-compatible tab selection |
| `?tab=devotional` selects devotional | integration | Verify new tab param works |
| mobile icon-only below 400px | unit | Verify label text has responsive hiding class |
| hero card switches to devotional tab | integration | Click hero devotional card → active tab changes |
| devotional tab shows heading | integration | Verify "What's On Your Soul?" heading renders |

**Expected state after completion:**
- [ ] Daily Hub shows 4 tabs: Devotional (default), Pray, Journal, Meditate
- [ ] Clicking hero devotional card switches to Devotional tab (no navigation)
- [ ] Skeleton DevotionalTabContent renders with heading + squiggle
- [ ] All existing tabs continue to work unchanged
- [ ] Tab bar responsive: icon-only below 400px, icon + label above

---

### Step 2: DevotionalTabContent — Full Content Rendering

**Objective:** Move all devotional content rendering from `DevotionalPage` into `DevotionalTabContent`, including date navigation, all content sections, Related Plan Callout, Share, and Read Aloud.

**Files to create/modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — Full implementation

**Details:**

1. **Props interface:**
   ```typescript
   interface DevotionalTabContentProps {
     onSwitchToJournal?: (topic: string) => void
     onSwitchToPray?: (context: string) => void
   }
   ```

2. **Date navigation**: Port from `DevotionalPage.tsx` lines 30-33, 92-109. Use `useSearchParams` to read/write `?day=` param. `dayOffset` clamped to [-7, 0]. `navigateDay(-1|1)` updates search params, preserving `?tab=devotional`. Import `useSwipe` for mobile swipe gestures.

3. **Structure within the tab content container (BackgroundSquiggle wrapper):**
   ```
   Heading: "What's On Your Soul?" (Caveat pattern)
   Date navigation: ← March 25, 2026 →  [✓ Completed]
   ─────────────────────────────────
   Devotional Title (h3, bold, white)
   Theme tag pill
   ─────────────────────────────────
   Quote section (decorative ", Lora italic)
   ─────────────────────────────────
   Passage section (reference, Lora italic, verse numbers)
   ─────────────────────────────────
   Reflection paragraphs (Inter, text-white/80)
   ─────────────────────────────────
   Closing Prayer (label + Lora italic)
   ─────────────────────────────────
   Reflection Question card (frosted glass callout)
   ─────────────────────────────────
   Related Plan Callout (if applicable)
   ─────────────────────────────────
   Share & Read Aloud row
   ─────────────────────────────────
   Cross-tab CTAs: "Journal about this →" / "Pray about today's reading →"
   Bottom padding
   ```

4. **Content sections**: Copy exact markup from `DevotionalPage.tsx` lines 221-327 into the tab content area. All CSS classes remain identical. The only change is the wrapper: instead of a standalone page, it sits inside the tab content container.

5. **Section dividers**: Use `border-t border-white/10 py-8 sm:py-10` between each section (matching DevotionalPage pattern).

6. **Date navigation position**: Below the heading, above the devotional title. Use exact button styling from `DevotionalPage.tsx` lines 180-216.

7. **Completed badge**: Show `✓ Completed` next to date when `isCompleted && dayOffset === 0` (same as DevotionalPage line 196-201).

8. **Share button**: Port `handleShareClick` from `DevotionalPage.tsx` line 119.

9. **Read Aloud**: Port `useReadAloud` + `buildReadAloudText` + toggle button from `DevotionalPage.tsx` lines 20-27, 128-132.

10. **Related Plan Callout**: Import and render `RelatedPlanCallout` exactly as on DevotionalPage (lines 287-294). Needs `useReadingPlanProgress` and `READING_PLANS`.

11. **Cross-tab CTAs at bottom**: Two link-style buttons:
    - "Journal about this →" — calls `onSwitchToJournal?.(devotional.theme)` (passes the theme of the currently-viewed devotional, not always today's)
    - "Pray about today's reading →" — calls `onSwitchToPray?.(`I'm reflecting on ${devotional.passage.reference}...`)` (passes the passage reference)
    - Use the CTA styling from `PrayTabContent.tsx` line 654: `text-sm font-medium text-primary transition-colors hover:text-primary-light`

12. **Context passing detail**: The CTA passes the CURRENTLY VIEWED devotional's data (if user browsed to day -3, pass that day's theme/passage, not today's).

**Responsive behavior:**
- Desktop (1440px): `max-w-2xl mx-auto`, generous spacing, CTAs horizontal row
- Tablet (768px): `max-w-2xl` centered, `text-2xl` quote, horizontal CTAs
- Mobile (375px): Full-width with `px-4`, `text-xl` quote, stacked CTAs, swipe for day browsing

**Guardrails (DO NOT):**
- DO NOT put date navigation in the hero — it belongs in the tab content area
- DO NOT change the devotional data functions (`getTodaysDevotional`, `formatDevotionalDate`)
- DO NOT use `dangerouslySetInnerHTML` for any content
- DO NOT change the reflection question card styling — exact match from standalone page
- DO NOT remove the `buildReadAloudText` helper — port it exactly

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders devotional title | integration | Verify today's devotional title appears |
| renders quote section | integration | Verify blockquote with attribution |
| renders passage with verse numbers | integration | Verify passage reference and verse text |
| renders reflection paragraphs | integration | Verify reflection content |
| renders closing prayer | integration | Verify "Closing Prayer" label and text |
| renders reflection question card | integration | Verify question in frosted glass card |
| date navigation — left arrow disabled at -7 | unit | Verify disabled state |
| date navigation — right arrow disabled at today | unit | Verify disabled state |
| browsing to previous day updates content | integration | Click left arrow → different devotional |
| RelatedPlanCallout renders when applicable | integration | Verify plan callout appears for matching theme |
| cross-tab CTA "Journal about this" calls handler | unit | Verify callback fires with theme |
| cross-tab CTA "Pray about today's reading" calls handler | unit | Verify callback fires with passage reference |

**Expected state after completion:**
- [ ] Devotional tab displays full devotional content matching standalone page
- [ ] Date navigation works (browse 7 days back)
- [ ] All content sections render with correct styling
- [ ] Share and Read Aloud buttons work
- [ ] Cross-tab CTAs fire correct callbacks
- [ ] Related Plan Callout appears when theme matches

---

### Step 3: Reading Completion + Activity Tracking Integration

**Objective:** Wire up the Intersection Observer for reading completion, add `devotional` to `ActivityType`, and integrate with `recordActivity`.

**Files to create/modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — Add Intersection Observer
- `frontend/src/types/dashboard.ts` — Add `'devotional'` to `ActivityType`
- `frontend/src/constants/dashboard/activity-points.ts` — Add devotional entry
- `frontend/src/pages/DailyHub.tsx` — Refresh `hasReadDevotional` on completion

**Details:**

1. **Intersection Observer** in `DevotionalTabContent`: Port logic from `DevotionalPage.tsx` lines 52-90.
   - Attach to the reflection question div (`questionRef`)
   - Only fires when: `isAuthenticated && dayOffset === 0 && !isCompleted`
   - Threshold: `0.5`
   - On intersection: write today's date to `wr_devotional_reads`, set `isCompleted(true)`, disconnect observer
   - Max 365 entries in array

2. **`ActivityType`** (`types/dashboard.ts` line 15): Add `'devotional'` to the union type.

3. **`ACTIVITY_POINTS`** (`constants/dashboard/activity-points.ts`): Add `devotional: 10` (same as `pray` and `listen` — daily reading is a standard activity).

4. **`ACTIVITY_DISPLAY_NAMES`**: Add `devotional: 'Read devotional'`.

5. **`ACTIVITY_CHECKLIST_NAMES`**: Add `devotional: 'Read devotional'`.

6. **`ALL_ACTIVITY_TYPES`**: Add `'devotional'` to the array.

7. **`MAX_DAILY_BASE_POINTS`**: Update from `145` to `155` (145 + 10).

8. **`MAX_DAILY_POINTS`**: Update from `290` to `310` (155 × 2).

9. **Call `recordActivity('devotional')`** when the devotional is marked as read (inside the Intersection Observer callback, after localStorage write). Import `useFaithPoints` in `DevotionalTabContent`.

10. **DailyHub.tsx — hero checkmark refresh**: The `hasReadDevotional` is computed from localStorage on render. To update it when the user reads the devotional in the tab, either:
    - Lift `isCompleted` state up via callback prop, OR
    - Use a simple state variable in DailyHub that `DevotionalTabContent` can update via callback
    - Add an `onComplete` callback prop to `DevotionalTabContent` that DailyHub uses to re-check localStorage

**Auth gating:**
- Intersection Observer only fires for authenticated users (`useAuth().isAuthenticated`)
- `recordActivity` already no-ops when user is not authenticated
- Logged-out users see all content but no completion tracking occurs

**Guardrails (DO NOT):**
- DO NOT change the Intersection Observer threshold or mechanism
- DO NOT add `devotional` to `DailyCompletion` — it uses its own `wr_devotional_reads` key
- DO NOT fire completion for past days (only `dayOffset === 0`)
- DO NOT create duplicate entries in `wr_devotional_reads`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| logged-in: marks devotional as read on scroll-to-bottom | integration | Simulate intersection → verify localStorage update |
| logged-out: no localStorage write | integration | Simulate intersection when not authenticated → verify no write |
| only fires for today (day=0) | unit | Set dayOffset=-1 → verify observer not attached |
| no duplicate entries | unit | Call completion twice → verify single entry |
| hero checkmark updates on completion | integration | Complete devotional → verify check appears in hero card |
| recordActivity('devotional') fires | unit | Verify useFaithPoints.recordActivity called |
| ActivityType includes 'devotional' | unit | Verify type exists in constants |
| ACTIVITY_POINTS.devotional === 10 | unit | Verify points value |

**Expected state after completion:**
- [ ] Scrolling to bottom of today's devotional marks it as read (logged-in only)
- [ ] Hero checkmark updates immediately
- [ ] `recordActivity('devotional')` fires on completion
- [ ] `ActivityType` includes `'devotional'`
- [ ] Points, display names, and checklist names updated
- [ ] All existing activity tracking unchanged

---

### Step 4: Route Redirect + Link Updates

**Objective:** Redirect `/devotional` to `/daily?tab=devotional`, update all internal links, and remove the standalone route.

**Files to create/modify:**
- `frontend/src/App.tsx` — Replace DevotionalPage route with redirect
- `frontend/src/components/Navbar.tsx` — Update links (lines 27, 631, 908)
- `frontend/src/components/dashboard/TodaysDevotionalCard.tsx` — Update links (lines 43, 50)
- `frontend/src/components/dashboard/MoodRecommendations.tsx` — Update route (line 104)
- `frontend/src/components/DevotionalTeaser.tsx` — Update link (line 18)
- `frontend/src/components/SeasonalBanner.tsx` — Update link (line 72)

**Details:**

1. **App.tsx — Route redirect** (line 135): Replace `<Route path="/devotional" element={<DevotionalPage />} />` with a redirect component that preserves query params:
   ```tsx
   <Route path="/devotional" element={<DevotionalRedirect />} />
   ```
   Create a small `DevotionalRedirect` component (inline or in a utils file) that reads `?day=` and redirects to `/daily?tab=devotional&day=X` using `<Navigate replace />`. This ensures `/devotional?day=-3` → `/daily?tab=devotional&day=-3`. The `replace` flag ensures back button goes to the page before `/devotional`.

2. **App.tsx — Remove DevotionalPage import**: Remove the `DevotionalPage` lazy/direct import (it is no longer rendered by any route). Keep the file for now — it can be deleted later.

3. **Navbar.tsx** (line 27): Change `{ label: 'Daily Devotional', to: '/devotional', icon: Sparkles }` to `{ label: 'Daily Devotional', to: '/daily?tab=devotional', icon: Sparkles }`. Also update lines 631 and 908 (mobile drawer links).

4. **TodaysDevotionalCard.tsx** (lines 43, 50): Change both `to="/devotional"` to `to="/daily?tab=devotional"`.

5. **MoodRecommendations.tsx** (line 104): Change `route: '/devotional'` to `route: '/daily?tab=devotional'`.

6. **DevotionalTeaser.tsx** (line 18): Change `to="/devotional"` to `to="/daily?tab=devotional"`.

7. **SeasonalBanner.tsx** (line 72): Change `to="/devotional"` to `to="/daily?tab=devotional"`.

**Guardrails (DO NOT):**
- DO NOT delete `DevotionalPage.tsx` — the spec says "kept at implementation discretion" and it may be useful as reference
- DO NOT use a redirect that drops query params — `?day=` must be preserved
- DO NOT change the navbar link text or remove it — just update the target
- DO NOT change any component behavior, only link targets

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `/devotional` redirects to `/daily?tab=devotional` | integration | Navigate to /devotional → verify redirect |
| `/devotional?day=-3` redirects with day param | integration | Verify query param preserved |
| redirect uses `replace` (back button works) | integration | Verify history replacement |
| Navbar link points to `/daily?tab=devotional` | unit | Verify href |
| Dashboard card links to `/daily?tab=devotional` | unit | Verify href |
| SeasonalBanner links to `/daily?tab=devotional` | unit | Verify href |
| DevotionalTeaser links to `/daily?tab=devotional` | unit | Verify href |
| MoodRecommendations route points to correct path | unit | Verify route value |

**Expected state after completion:**
- [ ] `/devotional` redirects to `/daily?tab=devotional` preserving `?day=` param
- [ ] All internal links point to `/daily?tab=devotional`
- [ ] Standalone DevotionalPage route removed from router
- [ ] Back button works correctly after redirect

---

### Step 5: Update Existing Tests + Add DevotionalTabContent Tests

**Objective:** Update all existing tests that reference `/devotional` or expect 3 tabs, and add comprehensive tests for the new `DevotionalTabContent`.

**Files to create/modify:**
- `frontend/src/pages/__tests__/DailyHub.test.tsx` — Update for 4 tabs, default tab, hero card
- `frontend/src/pages/__tests__/DevotionalPage.test.tsx` — Update for redirect behavior
- `frontend/src/components/__tests__/Navbar.test.tsx` — Update link assertion
- `frontend/src/components/__tests__/Navbar-seasonal.test.tsx` — Update link assertion
- `frontend/src/components/__tests__/SeasonalBanner.test.tsx` — Update link assertion
- `frontend/src/components/dashboard/__tests__/TodaysDevotionalCard.test.tsx` — Update link assertions
- `frontend/src/components/dashboard/__tests__/MoodRecommendations.test.tsx` — Update link assertion
- `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx` — New test file
- `frontend/src/constants/dashboard/__tests__/activity-points.test.ts` — Update for new activity type

**Details:**

1. **DailyHub.test.tsx**:
   - Update "renders 3 tabs" → "renders 4 tabs" (Devotional, Pray, Journal, Meditate)
   - Update default tab assertion: without `?tab=`, devotional tab should be active
   - Update hero card test: "devotional card links to /devotional" → "devotional card switches to devotional tab"
   - Add test: `?tab=devotional` selects devotional tab

2. **DevotionalPage.test.tsx**: Since the standalone route now redirects, tests should be updated or restructured. Either:
   - Update to test the redirect behavior (navigate to `/devotional` → assert redirect to `/daily?tab=devotional`)
   - Or move content-rendering tests to `DevotionalTabContent.test.tsx`

3. **Navbar tests**: Update assertions from `href="/devotional"` to `href="/daily?tab=devotional"`.

4. **SeasonalBanner test**: Update `href="/devotional"` to `href="/daily?tab=devotional"`.

5. **TodaysDevotionalCard tests**: Update both link assertions to `/daily?tab=devotional`.

6. **MoodRecommendations test**: Update `/devotional` assertion to `/daily?tab=devotional`.

7. **DevotionalTabContent.test.tsx**: New file following the DailyHub test pattern:
   - Mock `useAuth`, `useFaithPoints`, `useReadAloud`, `useReadingPlanProgress`, audio mocks
   - Render helper with `MemoryRouter` + `ToastProvider` + `AuthModalProvider`
   - Tests for all content sections, date navigation, completion tracking, cross-tab CTAs

8. **activity-points.test.ts**: Add `expect(ACTIVITY_POINTS.devotional).toBe(10)`, update total sum assertion.

**Guardrails (DO NOT):**
- DO NOT delete DevotionalPage.test.tsx — update it for redirect behavior
- DO NOT break any existing passing tests

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All existing tests pass with updates | regression | Run full test suite |
| New DevotionalTabContent tests cover all sections | integration | Content rendering verified |
| Activity points test updated | unit | Devotional entry verified |

**Expected state after completion:**
- [ ] `pnpm test` passes with zero failures
- [ ] All link assertions updated
- [ ] DevotionalTabContent has comprehensive test coverage
- [ ] Activity points tests updated

---

### Step 6: CLAUDE.md Route Table Update

**Objective:** Update the route table in CLAUDE.md to reflect the new routing.

**Files to modify:**
- `CLAUDE.md` — Route table entry for `/devotional`

**Details:**

1. Change the `/devotional` route table entry:
   - **From:** `| /devotional | DailyDevotional | Built | Daily devotional with 7-day browse-back |`
   - **To:** `| /devotional | Redirect → /daily?tab=devotional | Built | Legacy redirect |`

2. Update the Daily Hub route entry to mention 4 tabs:
   - **From:** `| /daily | DailyHub | Built | Tabbed: Pray | Journal | Meditate |`
   - **To:** `| /daily | DailyHub | Built | Tabbed: Devotional | Pray | Journal | Meditate |`

3. Update the UX Flows section's "Daily Hub Architecture" to reference 4 tabs with Devotional as default.

**Guardrails (DO NOT):**
- DO NOT change any other route entries
- DO NOT modify implementation phase descriptions

**Expected state after completion:**
- [ ] Route table accurately reflects new routing
- [ ] Daily Hub description mentions 4 tabs

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Tab bar expansion + DevotionalTabContent skeleton |
| 2 | 1 | Full content rendering in DevotionalTabContent |
| 3 | 2 | Reading completion + activity tracking |
| 4 | 1 | Route redirect + link updates |
| 5 | 1, 2, 3, 4 | Test updates + new tests |
| 6 | 4 | CLAUDE.md documentation update |

Steps 2 and 4 can be worked in parallel after Step 1. Step 3 depends on Step 2. Step 5 depends on all prior steps. Step 6 can happen any time after Step 4.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Tab bar expansion + skeleton | [COMPLETE] | 2026-03-25 | Modified: DailyHub.tsx (4 tabs, default=devotional, hero card→button, context handlers, responsive labels), daily-experience.ts (PrayContext.from union). Created: DevotionalTabContent.tsx (skeleton). 4 existing test failures expected—addressed in Step 5. |
| 2 | Full content rendering | [COMPLETE] | 2026-03-25 | Modified: DevotionalTabContent.tsx (full implementation ported from DevotionalPage with date nav, all content sections, RelatedPlanCallout, Share, Read Aloud, cross-tab CTAs, swipe). Completion observer still present for Step 3 wiring. |
| 3 | Reading completion + activity tracking | [COMPLETE] | 2026-03-25 | Modified: dashboard.ts (ActivityType + DailyActivities), activity-points.ts (+devotional entry, MAX_DAILY_BASE_POINTS=155, MAX_DAILY_POINTS=310), useFaithPoints.ts (extractActivities + default state), faith-points-storage.ts (freshDailyActivities + ACTIVITY_BOOLEAN_KEYS), DevotionalTabContent.tsx (Intersection Observer + recordActivity + onComplete), DailyHub.tsx (hasReadDevotional→state, handleDevotionalComplete). PrayContext.from widened to 'pray'|'devotional' in daily-experience.ts. 13 test file type errors remain—fixed in Step 5. |
| 4 | Route redirect + link updates | [COMPLETE] | 2026-03-25 | Modified: App.tsx (DevotionalRedirect component preserving ?day=, removed DevotionalPage lazy import), Navbar.tsx (3 links updated), TodaysDevotionalCard.tsx (2 links), MoodRecommendations.tsx (route), DevotionalTeaser.tsx (link), SeasonalBanner.tsx (link). All /devotional links now point to /daily?tab=devotional. |
| 5 | Test updates + new tests | [COMPLETE] | 2026-03-25 | Updated: DailyHub.test.tsx (4 tabs, default=devotional, hero button, arrow keys, invalid tab), Navbar.test.tsx, Navbar-seasonal.test.tsx, SeasonalBanner.test.tsx, TodaysDevotionalCard.test.tsx, MoodRecommendations.test.tsx, activity-points.test.ts, badge-engine.test.ts, leaderboard.test.ts, faith-points-storage.test.ts, useFaithPoints.test.ts, useNotifications.test.ts, EveningReflection.test.tsx, ActivityChecklist.test.tsx, empty-states.test.tsx, useGettingStarted.test.tsx, useWeeklyGodMoments.test.ts, Churches/Counselors/CelebrateRecovery/LocalSupportEnhancements tests. Created: DevotionalTabContent.test.tsx. 390/391 suites pass (1 pre-existing e2e config). 4290/4290 tests pass. |
| 6 | CLAUDE.md route table update | [COMPLETE] | 2026-03-25 | Updated: CLAUDE.md route table (/daily 4-tab description, /devotional→redirect), 10-ux-flows.md (4 tabs, default=devotional, heading pattern, context passing). |
