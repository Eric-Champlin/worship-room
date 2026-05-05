# Local Support Migration — Direction Document

**Created:** 2026-05-04
**Status:** Locked decisions for Spec 5
**Branch:** forums-wave-continued
**Save location:** `_plans/direction/local-support-2026-05-04.md`

This is a decision document, not a spec. It captures the locked design
decisions for the Local Support visual migration. Spec 5 references
this document. Decisions here are LOCKED.

## Context

Local Support is a 3-route surface (Churches, Counselors, Celebrate
Recovery) backed by one shared 462-LOC shell + 9 child components.
~3,019 LOC in scope. Recon at
`_plans/recon/local-support-2026-05-04.md` (full audit).

Critical user-emotional context: Local Support is the surface users
visit during difficult moments — finding a counselor when struggling,
a CR group when battling addiction, a church when spiritually
disconnected. Visual treatment must honor this emotional weight.
Calm, supportive, trustworthy. Not flashy or attention-seeking.
Restraint is the dominant virtue.

## Locked decisions

### Structural

**1. Atmospheric layer: Multi-bloom BackgroundCanvas.** Add to all
three Local Support routes via the shared LocalSupportPage shell.
GlowBackground (current treatment) is removed.

Rationale: BackgroundCanvas is the dominant inner-page atmospheric
pattern (Dashboard, BibleLanding, /bible/plans, DailyHub via subtle
blooms). Local Support joining that family creates visual continuity
when users navigate from Dashboard → Local Support, reducing context
switching cost. The blooms are gentle enough to not distract from
serious browsing of support resources.

Important: the BackgroundCanvas opacity values used elsewhere may need
slight reduction here. Local Support is a longer-dwell utility surface
(users scroll and read carefully) — atmospheric blooms that work on a
quick-scan Dashboard could feel too active during a 5-minute counselor
search. CC verifies during execution and tunes if needed.

**2. ListingCard chrome migrates to FrostedCard default.** Per system
standards. Same migration pattern as DashboardCard.

Card content (photo, info, actions row, expanded details) preserved.
Only the wrapping chrome changes: `rounded-xl border border-white/10
bg-white/[0.06]` → `<FrostedCard variant="default">`. Hover lift and
shadow upgrade come for free.

Selected-state ring (when listing is selected from map marker click)
preserved with adjustment: `ring-2 ring-violet-400/60` instead of
`ring-2 ring-primary`.

**3. ListingSkeleton matches new chrome.** Loading skeleton shape
must match the populated state's chrome (FrostedCard default), not
the old rolls-own. Otherwise the loading-to-loaded transition feels
jarring.

**4. White-pill CTAs all migrate to subtle Button.** Four direct
instances (Use My Location, Search, Try Again, Get Directions) plus
the tab/view-toggle pattern (3 instances of active=white-pill).

Important nuance: tab/view-toggles get the system's tab pattern, NOT
the subtle Button. Active state becomes
`bg-violet-500/[0.13] border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]`.
Inactive stays `text-white/50 hover:text-white/80 hover:bg-white/[0.04]`.

This is the canonical tab pattern from DailyHub. Local Support's tabs

- mobile view-toggles all align with this single pattern.

**5. ListingShareDropdown migrates from light theme to dark theme.**

Currently the dropdown panel renders as `bg-white border border-gray-200
shadow-lg` with `text-text-dark` items — a pre-Round-3 leftover that's
now the only light-themed dropdown in the app.

Migrates to: `bg-hero-mid/95 backdrop-blur-md border border-white/10
rounded-xl shadow-frosted-base` (matching navbar dropdown convention).
Items become `text-white/80 hover:text-white hover:bg-white/[0.05]`.

Inline social icons (Facebook, X) keep their brand-color SVGs since
they're brand identifiers, but the icon containers align with the
dark surface.

### Pattern decisions

**6. All `text-primary` ghost links migrate to `text-white/80`.** Same
treatment as Dashboard. Affected: ResultsMap popup links, any other
ghost-style links across LocalSupportPage children.

**7. Tonal Icon Pattern application.**

Per direction doc Decision 11 from Dashboard's direction doc, applied
to Local Support's iconography:

| Surface                                  | Icon         | Tonal color                                                | Rationale                                                  |
| ---------------------------------------- | ------------ | ---------------------------------------------------------- | ---------------------------------------------------------- |
| StarRating (rating display)              | Star         | amber-400                                                  | Universal rating color, preserved                          |
| Bookmark (when bookmarked)               | Bookmark     | emerald-300                                                | Saving/keeping/growth                                      |
| Bookmark (unbookmarked)                  | Bookmark     | white/50                                                   | Affordance, not state                                      |
| VisitButton (when visited)               | MapPin       | amber-300                                                  | Warmth of showing up                                       |
| VisitButton (unvisited)                  | MapPin       | white/50                                                   | Affordance, not state                                      |
| SearchControls "Use My Location"         | MapPin       | sky-300                                                    | Navigation/wayfinding                                      |
| Search button icon                       | Search       | white/80                                                   | Within subtle Button — neutral                             |
| ListingCard address                      | MapPin       | white/50                                                   | Utility metadata, not categorical                          |
| ListingCard phone                        | Phone        | white/50                                                   | Utility metadata, not categorical                          |
| ListingCard ExternalLink (website)       | ExternalLink | white/50                                                   | Utility metadata                                           |
| ChevronDown (expand toggle)              | Chevron      | white/60                                                   | Affordance                                                 |
| Loader2 (loading)                        | Loader2      | white/60                                                   | Status                                                     |
| ListingCTAs (Pray, Journal, Prayer Wall) | tile icons   | matching Quick Actions tile colors (pink/blue/violet/cyan) | Consistency with Dashboard QuickActions categorical colors |
| AlertCircle (error)                      | AlertCircle  | text-danger (existing)                                     | Preserve semantic error color                              |
| SearchX (no results)                     | SearchX      | white/40                                                   | Empty state, muted                                         |
| ImageOff (placeholder)                   | ImageOff     | white/30                                                   | Placeholder/missing state                                  |

The hero has no icon — the gradient text headline carries the visual
energy alone.

**8. Form input chrome stays.** Text input + select dropdowns currently
use `bg-white/[0.06] border-white/10 focus:border-primary
focus:ring-2 focus:ring-primary/20`. KEEP this pattern — it's the
quieter "utility input" idiom, distinct from the violet-glow textarea
pattern used in DailyHub Pray/Journal.

Reasoning: Pray/Journal violet-glow textareas signal "this is an
emotional/expressive input." Local Support's location input and
sort/filter selects are utility — the user is filtering data, not
expressing a feeling. Quieter chrome is correct here.

The `VisitNote` textarea (where users journal about their support
visit) is a borderline case. I'm leaving it on the utility idiom for
now — visits are typically private logging, not the same emotional
register as morning Pray/Journal sessions. If user feedback flags
this as feeling cold, it migrates to violet-glow in a follow-up.

**9. Range slider stays.** Native `<input type="range">` with
`accent-primary` and mile markers below. This pattern works well —
no change needed for visual migration.

### Anti-pressure and emotional care

**10. Disclaimer (Counselors page) preserved AS-IS.** Amber warning
chrome (`bg-amber-900/20 border-amber-500/30 text-amber-200`) stays
exactly as it is.

Rationale: this disclaimer is a regulatory/safety boundary ("Worship
Room is not a substitute for professional mental health care").
Migrating to FrostedCard would soften its visual urgency. The
amber-warning treatment correctly signals "important — read this."
Different semantic purpose than other cards on the page; deserves
different chrome.

This is a deliberate exception to the FrostedCard pattern, parallel
to GrowthGarden's deliberate earth-tone exception on Dashboard.

**11. Saved-tab empty state migrates to FeatureEmptyState.**
Consistency with the page's other empty states (idle, no-results,
filtered-empty all use FeatureEmptyState). The current rolls-own
"No saved {category} yet. Bookmark listings to see them here."
gets replaced with proper empty-state component, soft Bookmark
icon, similar copy.

Copy adjustment for healthier framing:

- Current: "No saved {category} yet. Bookmark listings to see them here."
- New heading: "Your saved {category}"
- New body: "Bookmark places to find them again later."
- No CTA needed (the bookmark interaction lives on listing cards)

Less transactional, more declarative. The bookmark icon shown in the
empty-state graphic teaches the affordance.

**12. Search remains open to logged-out users. Code is correct;
documentation gets updated.**

Per `02-security.md:23`, "Local Support search" was listed as
auth-gated. Code does not gate it. Per CC's recommendation and product
analysis: open search is the correct behavior.

Rationale: forcing a logged-out user to sign in just to look up local
churches/counselors/CR groups is hostile and contradicts Worship Room's
positioning as a low-friction support resource. Especially for crisis-
adjacent surfaces (Counselors, CR), removing barriers to discovery is
a moral imperative, not just a UX preference.

Documentation update in spec scope:

- Update `02-security.md:23` to clarify: "Local Support search and
  results display are public. Bookmark and Visit-recording actions
  are auth-gated."

**13. Pre-existing test failures (4 of 11) get fixed in this spec.**

The "logged-out mock listing cards" tests fail because they assert
gated behavior that doesn't exist in code. Tests are wrong; code is
correct. Update tests to match actual behavior.

This resolves 4/11 baseline test failures — meaningful CI cleanup
alongside visual migration.

**14. ListingCTAs route to /daily and /prayer-wall correctly.**

The `?template=cr-buddy` parameter on the Prayer Wall link doesn't
appear to be consumed by the Prayer Wall route currently. CC verifies
during execution. Three options:

- (a) Remove the parameter (clean URL, but loses semantic intent)
- (b) Keep and ignore (no harm, future-proofs for when Prayer Wall
  templates are wired)
- (c) Wire up the Prayer Wall consumer (out of scope; defer)

Default: (b) keep and ignore. The parameter is harmless and signals
intent for future implementation. CC may flag during execution if a
clearer path emerges.

### Cleanup

**15. `wr_bookmarks_<category>` localStorage keys get documented.**

Add to `11-local-storage-keys.md`:

```
### wr_bookmarks_<category>
Schema: string[] of LocalSupportPlace IDs
Variants: wr_bookmarks_churches, wr_bookmarks_counselors, wr_bookmarks_celebrate-recovery
Persistence: only when user is authenticated
Purpose: client-side bookmark state for Local Support listings
Eviction: none (manual user action only)
```

**16. Hero gradient text headline preserved.** The white-to-purple
gradient text style on the `<h1>` stays as-is. It's working visually
and it's the page's primary visual anchor. No change.

**17. Hero `extraContent` slot for CR page preserved.** The "What is
Celebrate Recovery?" frosted mini-card on the CR route stays. Aligns
chrome with FrostedCard subdued variant.

Currently: `bg-white/10 px-6 py-4 backdrop-blur-sm rounded-xl
text-white/80`.

Migrates to: `<FrostedCard variant="subdued" className="mt-4
mx-auto max-w-2xl text-left text-sm text-white/80">`.

## What's NOT in scope for Spec 5

For clarity, none of the following land in Spec 5:

- Leaflet bundle size optimization (`manualChunks` config) — deferred
  follow-up; document for later
- ResultsMap visual redesign beyond chrome alignment — the Leaflet
  map's internal styling stays as-is
- ListingCTAs deep-link wiring on Prayer Wall side — out of scope
- Auth gate restoration on search — Decision 12 keeps search open
- New atmospheric variants for HorizonGlow vs BackgroundCanvas
  experiments — Decision 1 locks BackgroundCanvas
- API/backend changes
- Offline-mode redesign — OfflineMessage component stays as-is
- New disclaimer primitive — Decision 10 keeps disclaimer as one-off

## Decision lock

This document represents locked decisions as of 2026-05-04. Spec 5
references these decisions. Changes require explicit update to this
document with rationale.
