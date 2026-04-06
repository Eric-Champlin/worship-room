# Devotional Pray Authentic Generation Flow

**Master Plan Reference:** N/A — standalone feature (builds on Spec B, C, N infrastructure already in main)

---

## Overview

The devotional page currently presents a static "Closing Prayer" that users read passively. This spec transforms that passive moment into an active prayer experience: the static prayer is removed and replaced with a CTA that navigates to the Pray tab with a rich, devotional-aware prompt. The mock prayer generator is enhanced to recognize devotional context and produce a thematically appropriate prayer. This creates an authentic, participatory prayer experience that flows naturally from the devotional reading — the user prays guided by the devotional rather than consuming pre-written text.

## User Story

As a **logged-in user** who has just read the daily devotional, I want to **pray about what I've read using the Pray tab's generation flow** so that **my prayer feels personal and connected to the devotional, not pre-written and passive**.

## Requirements

### Functional Requirements

1. **Remove static Closing Prayer section** from the devotional page entirely. The `devotional.prayer` data field remains in the data file but is no longer rendered.
2. **Add "Pray about today's reading" CTA** in the location where the Closing Prayer used to be, styled as a white pill button with intro text.
3. **Remove the duplicate bottom Pray CTA** (the cross-tab CTA at the bottom of the devotional). Only one Pray CTA should exist, positioned where the Closing Prayer was.
4. **CTA constructs a rich prayer context** including the devotional theme, passage reference, and passage text, then navigates to the Pray tab with this context pre-filled in the textarea.
5. **Mock prayer generator detects devotional context** — when the input text contains phrases like "today's devotional" or "devotional on [theme]", `getMockPrayer` returns a devotional-appropriate prayer that references the theme.
6. **Scroll-to-input works correctly** — when arriving at the Pray tab from the devotional CTA, the textarea scrolls into viewport center (not the footer). Apply a 100ms delay if `requestAnimationFrame` alone doesn't fire due to tab panel visibility transition.
7. **Non-devotional Pray input is unchanged** — standard category-matching logic continues to work for direct Pray tab usage.

### Non-Functional Requirements

- Performance: No additional network requests. Devotional context is constructed client-side from already-loaded data.
- Accessibility: CTA button meets 44px minimum touch target. Button text is descriptive for screen readers.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View devotional content | Can read devotional fully | Can read devotional fully | N/A |
| Click "Pray about today's reading" CTA | Navigates to Pray tab with pre-filled context; "Help Me Pray" button triggers auth modal | Navigates to Pray tab with pre-filled context; prayer generates normally | "Sign in to generate a prayer" |
| "Help Me Pray" on Pray tab | Auth modal | Generates devotional-aware prayer | "Sign in to generate a prayer" |

Auth gating for "Help Me Pray" is handled by existing Pray tab infrastructure (unchanged by this spec).

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | CTA section centered, full-width padding. Button is full-width-ish (auto width with `px-6`). Intro text above button. |
| Tablet (640-1024px) | Same as mobile — centered column layout. |
| Desktop (> 1024px) | Same — centered column layout within the `max-w-2xl` devotional container. |

The CTA section is a simple centered column (`flex-col items-center`), so it adapts naturally across all breakpoints. No breakpoint-specific layout changes needed.

## AI Safety Considerations

The Pray tab's existing crisis keyword detection (`CrisisBanner`) applies to the pre-filled devotional context text. Since the pre-filled text is constructed from devotional data (theme, passage reference, verse text), it will not contain crisis keywords. If the user edits the textarea to include crisis language before clicking "Help Me Pray", the existing `CrisisBanner` component detects and displays crisis resources — no changes needed.

## Auth & Persistence

- **Logged-out users:** Can view the devotional and click the CTA. The Pray tab pre-fills the textarea (React state only, no persistence). "Help Me Pray" triggers auth modal.
- **Logged-in users:** Full flow works. Prayer generation uses mock data (Phase 2). Completion tracking unchanged — `markPrayComplete()` fires after prayer generation as before.
- **localStorage usage:** No new keys. Existing `wr_prayer_draft` may be overwritten when devotional context pre-fills the textarea. Existing `wr_daily_completion` tracks pray completion as before.

## Completion & Navigation

- **Completion signal:** Pray tab completion tracking is unchanged. `markPrayComplete()` fires after the user generates a prayer via "Help Me Pray", regardless of whether they arrived from the devotional CTA or directly.
- **Cross-tab CTA flow:** Devotional tab → (click CTA) → Pray tab with pre-filled context. One-way. No return CTA back to devotional from Pray tab.
- **Context passing:** Uses existing `onSwitchToPray(theme, customPrompt)` infrastructure from Spec B. The `customPrompt` now carries richer content (theme + passage reference + verse text).

## Design Notes

- **CTA button style:** White pill button matching existing cross-tab CTAs (Spec N style): `rounded-full bg-white text-primary font-semibold min-h-[44px]`. Arrow suffix (`&rarr;`).
- **CTA section:** `border-t border-white/[0.08]` for visual separation from the section above. `py-6 sm:py-8` vertical padding. Centered layout.
- **Intro text:** `text-sm text-white/60` — "Ready to pray about today's reading?" above the button.
- **Section removal:** The Closing Prayer section (dimmed card with "Closing Prayer" label and italic prayer text) is fully removed. No replacement card — just the CTA section.
- **Design system recon:** Reference `_plans/recon/design-system.md` for exact devotional tab spacing and card patterns. The CTA should sit naturally in the devotional's vertical rhythm.

## Out of Scope

- Multiple devotional prayer templates (start with one; add variants in a follow-up if repetitive)
- Draft conflict dialog when devotional context overwrites an existing Pray tab draft (future enhancement)
- Backend AI prayer generation (Phase 3)
- Modifying the `devotional.prayer` field in `devotionals.ts` data
- Changes to Journal tab CTA behavior (handled by Spec O)

## Acceptance Criteria

- [ ] Static Closing Prayer section (dimmed card with "Closing Prayer" label and italic `devotional.prayer` text) is NOT visible on the devotional tab
- [ ] `devotional.prayer` field is no longer referenced in DevotionalTabContent rendering
- [ ] New "Pray about today's reading" CTA section appears where the Closing Prayer used to be
- [ ] CTA section has intro text "Ready to pray about today's reading?" in `text-sm text-white/60`
- [ ] CTA button uses white pill style: `rounded-full bg-white text-primary font-semibold`, min-height 44px
- [ ] CTA button text is "Pray about today's reading" with arrow suffix
- [ ] Clicking the CTA navigates to `/daily?tab=pray`
- [ ] Pray textarea is pre-filled with text containing the devotional theme, passage reference, and passage verse text
- [ ] Textarea scrolls into viewport center (not footer) when arriving from devotional CTA
- [ ] No duplicate "Pray about today's reading" button exists at the bottom of the devotional page
- [ ] Clicking "Help Me Pray" with devotional context produces a devotional-appropriate prayer (references the theme, thanks for God's word, prayer for change)
- [ ] The generated prayer is NOT a copy of `devotional.prayer` — it comes from the mock generator's devotional template
- [ ] Navigating directly to `/daily?tab=pray` and typing non-devotional input (e.g., "I'm anxious about work") still returns category-matched prayers from the existing mock library
- [ ] `devotional.prayer` field remains in `devotionals.ts` data file (not deleted)
- [ ] All existing Pray tab functionality unchanged: auth gating, crisis banner, starter chips, audio pill, KaraokeText
- [ ] Pray completion tracking (`markPrayComplete()`) fires as before
- [ ] CTA section has `border-t border-white/[0.08]` visual separator
