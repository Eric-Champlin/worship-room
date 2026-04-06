# Devotional Readability — Deep Fix

**Master Plan Reference:** N/A — standalone readability enhancement. Supersedes Spec M's container approach.

---

## Overview

The devotional tab is the longest sustained-reading experience in Worship Room — users come here hurting and stay to read scripture, a quote, multiple reflection paragraphs, and a question. Current typography choices (italic body text, narrow line-height, wide line lengths, dim text, minimal containers) compound into a reading experience that feels cramped rather than restful. This spec applies six compounding fixes — typography, contrast, line-height, line-length, container hierarchy, and ambient noise reduction — to transform the devotional from "web page" to "premium book chapter" comparable to Medium, Substack, or a polished e-book.

## User Story

As a **logged-in user** reading the daily devotional, I want the reading experience to feel calm, spacious, and comfortable so that I can absorb the scripture and reflection without eye strain or visual noise competing for my attention.

## Requirements

### Functional Requirements

1. **Drop italics on body-length text.** Italic body text is measurably slower to read (~15%). Remove `italic` from passage scripture text, reflection body, and any remaining prayer text. Keep italics only on the quote blockquote (brief, literary convention) and verse references.
2. **Brighten body text to full opacity.** All primary reading text (passage, reflection, question) uses `text-white` (full opacity). Reserve `text-white/60`-`text-white/80` for labels, attributions, and secondary micro-copy only.
3. **Increase line height for sustained reading.** Body paragraphs use `leading-[1.75]` to `leading-[1.8]` (the standard for long-form reading interfaces like Medium ~1.7, Substack ~1.75, Apple Books ~1.7-1.8).
4. **Constrain line length to ~65 characters.** The GlowBackground container narrows from `max-w-4xl` (~896px) to `max-w-2xl` (~672px), which at body font size yields roughly 60-75 characters per line — the canonical reading-comfort range.
5. **Promote reflection body to full FrostedCard.** The reflection section is the longest sustained reading on the page and needs the most container support, not the least. Wrap in a full FrostedCard with generous padding.
6. **Reduce glow orb opacity on devotional tab.** The current `glowOpacity={0.30}` creates too much ambient visual noise behind long-form reading content. Dim to approximately `0.18` — still visible but quieter.

### Non-Functional Requirements

- Performance: No new dependencies, no layout shift, no render cost increase. Changes are CSS-only.
- Accessibility: All text changes must maintain or exceed WCAG AAA (7:1) contrast on the dark background. The narrower container improves readability for users with low vision or cognitive disabilities.

## Auth Gating

This spec makes no auth changes. The devotional tab's existing auth behavior is unchanged:

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Read devotional | Full devotional visible | Full devotional visible | N/A |
| Completion tracking | Not tracked | Auto-tracked via IntersectionObserver | N/A |
| Journal CTA button | Switches tab (no save) | Switches tab with context | N/A |
| Pray CTA button | Switches tab (no save) | Switches tab with context | N/A |
| Share devotional | Copies link | Copies link | N/A |
| Read aloud | TTS playback | TTS playback | N/A |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Single column, `max-w-2xl` still applies but content fills available width. All FrostedCards full-width within container. Font sizes slightly smaller (base sizes without `sm:` bump). Touch targets remain 44px minimum. |
| Tablet (640-1024px) | Same single-column layout. `max-w-2xl` constrains width nicely at tablet. `sm:` font bumps apply. |
| Desktop (> 1024px) | `max-w-2xl` centers content at ~672px. Generous whitespace on sides. `sm:` font bumps fully active. |

The narrower container (`max-w-2xl`) actually improves mobile because it was already narrower than `max-w-4xl` on small screens — no breakpoint-specific overflow risk.

## AI Safety Considerations

N/A — This spec makes visual/typographic changes only. No user input fields are added or modified. Crisis detection on the Pray tab textarea and Journal CTA context passing are unaffected.

## Auth & Persistence

- **Logged-out users:** No change — can read the full devotional.
- **Logged-in users:** No change — completion tracking, `wr_devotional_reads` localStorage key, and `recordActivity('devotional')` all preserved.
- **localStorage usage:** No new keys. Existing `wr_devotional_reads` key unchanged.

## Completion & Navigation

No changes to completion or navigation. The IntersectionObserver on the reflection question card, the "Journal about this question" CTA, and the "Pray about today's reading" CTA all remain in place and functional.

## Design Notes

### Section-by-Section Typography Targets

**Passage section (scripture callout):**
- Font: `font-serif` (Lora), NOT italic, larger size (`text-lg sm:text-xl`)
- Line height: `leading-[1.75]`
- Text color: `text-white` (full opacity)
- Container: `border-l-4 border-l-primary/60` callout with slightly stronger background (`bg-white/[0.04]`) and more padding
- Verse number superscripts: brighter than current (`text-white/50` with `font-medium`)
- Reference label: brighter contrast (currently `text-primary-lt`, should be `text-white/80`)

**Quote section (FrostedCard):**
- Font: `font-serif` (Lora), italic preserved (brief literary quotation — appropriate use)
- Line height: `leading-[1.6]` (explicit, consistent)
- Quote mark decoration: slightly brighter (`text-white/25`)
- Attribution: brighter (`text-white/80` instead of current `text-white/70`)
- Remove outer `border-t` separator (FrostedCard's own border provides separation)

**Reflection body (promote to FrostedCard):**
- Currently: bare text between `border-t` and `border-b` dividers — no container
- Target: Full FrostedCard wrapper with generous padding
- Font: Inter (sans-serif), NOT italic, slightly larger (`text-[17px] sm:text-lg`)
- Line height: `leading-[1.8]` (most generous — this is the longest reading content)
- Paragraph spacing: `space-y-5` (wider gaps between paragraphs as micro-rest points)
- Text color: `text-white` (full opacity, already correct)

**Reflection question card (existing FrostedCard):**
- Label treatment: uppercase tracked (`font-medium uppercase tracking-widest`), brighter (`text-white/70`)
- Label text: simplify "Something to think about today:" to "Something to think about"
- Question text: larger (`text-xl sm:text-2xl`), with `leading-[1.5]`

**Pray CTA section:**
- No visual changes needed — the current centered CTA treatment is clean.

### Glow Orb Dimming

The GlowBackground component already has a `glowOpacity` prop. The devotional tab currently passes `glowOpacity={0.30}`. Lower this to approximately `0.18` to reduce ambient visual noise behind long-form reading. Other tabs (Pray, Journal, Meditate) are unaffected.

### Consistent Section Spacing

All major sections should use consistent vertical padding: `py-6 sm:py-8`. Remove the `border-t` / `border-b` dividers between sections — the FrostedCards and callout containers provide sufficient visual separation.

### Existing Components Referenced

- `GlowBackground` — existing, already has `glowOpacity` prop
- `FrostedCard` — existing, used for quote and question cards, will also wrap reflection body
- `VerseLink` — existing, used for passage reference link
- `SharePanel` — existing, used for passage sharing
- `RelatedPlanCallout` — existing, at bottom of devotional

## Out of Scope

- No new functionality (no new buttons, states, or interactions)
- No changes to date navigation, swipe handlers, completion tracking, or share/read-aloud
- No changes to other Daily Hub tabs (Pray, Journal, Meditate)
- No changes to the DailyHub hero section (greeting, VOTD banner)
- No changes to SongPickSection or SiteFooter
- No new localStorage keys
- No backend/API changes (all frontend CSS/class changes)
- Light mode support (Phase 4)

## Acceptance Criteria

- [ ] Devotional GlowBackground container uses `max-w-2xl` (not `max-w-4xl`)
- [ ] Devotional glow opacity is dimmer than other tabs (~0.18 vs 0.30)
- [ ] Passage scripture text is NOT italic, uses `font-serif text-lg sm:text-xl leading-[1.75] text-white`
- [ ] Passage container uses `bg-white/[0.04]` and generous padding (`px-5 py-6 sm:px-7 sm:py-7` or similar)
- [ ] Passage verse superscripts are brighter than current (at least `text-white/50`)
- [ ] Passage reference label has better contrast than current purple-on-dark (`text-white/80` or brighter)
- [ ] Quote text retains italic (appropriate for short quotation)
- [ ] Quote attribution is brighter (`text-white/80`)
- [ ] Outer border-t dividers between sections are removed (FrostedCards provide separation)
- [ ] Reflection body is wrapped in a full FrostedCard (not bare text between dividers)
- [ ] Reflection body uses `text-[17px] sm:text-lg leading-[1.8] text-white` and `space-y-5`
- [ ] Reflection question label uses uppercase tracked treatment and brighter text (`text-white/70`)
- [ ] Reflection question text is larger (`text-xl sm:text-2xl`)
- [ ] All other Daily Hub tabs (Pray, Journal, Meditate) visually unchanged
- [ ] Mobile layout works at 375px with no horizontal overflow
- [ ] Line lengths fall in 60-75 character range at desktop body font size
- [ ] All existing functionality preserved: date navigation, swipe gestures, share, read-aloud, completion tracking, Journal CTA, Pray CTA
- [ ] "Meditate on this passage" link still present and functional
- [ ] Reading experience feels comfortable and spacious, not cramped
