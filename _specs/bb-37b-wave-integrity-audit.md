# BB-37b: Bible Wave Integrity Audit

**Branch:** `bible-redesign` (no sub-branch — all work commits directly here)

**Depends on:**
- BB-37 (Code health + Playwright full audit) — BB-37's final state document is the starting point
- Every spec in the wave from BB-30 through BB-46 except the FCBH-blocked audio cluster (BB-26, BB-27, BB-28, BB-29, BB-44)
- BB-36 (performance baseline) and BB-35 (accessibility baseline) as reference points

**Hands off to:**
- Follow-up specs BB-37b identifies as necessary but out of scope
- The Audio Wave (BB-26-29, BB-44) when the FCBH API key arrives (tentatively BB-37c)
- Future wave planning informed by BB-37b's findings

---

## Overview

BB-37b is the closing ceremony for the BB-30 through BB-46 feature wave. It audits the entire wave as a system rather than as individual specs — verifying that every spec shipped what it promised, that specs integrate cleanly with each other without seams, that shared contracts (URL patterns, localStorage schemas, reactive store patterns, typography tokens, animation tokens, accessibility patterns) are used consistently, and that the end-to-end user experience hangs together as a coherent whole. After BB-37b ships, the wave is declared complete and the codebase is in a known-good state with a documented final audit record.

This is a wave-level verification spec, not a code change spec. The primary output is a comprehensive audit document that confirms the wave met its goals. The secondary output is a short list of targeted fixes for any integrity issues discovered during the audit.

## User Story

As the **project maintainer**, I want a comprehensive system-level audit of the entire Bible wave so that I can certify the wave as complete with a documented record of what shipped, what integrates correctly, what's known-limited, and what needs follow-up.

## Requirements

### Five Audit Workstreams

#### 1. Cross-Spec Integration Audit (`_plans/recon/bb37b-integration-audit.md`)

**Shared URL contracts (BB-38, BB-40):**
1. `/bible/<book>/<chapter>?verse=<n>` — used by deep links, search results, echoes, notification clicks. Verify every consumer produces this format correctly.
2. `/bible?mode=search&q=<query>` — BB-38's search URL contract, used by BB-42's full-text search. Verify cold-loading this URL runs the search and renders results.
3. `/daily?tab=<devotional|pray|journal|meditate>` — BB-18's Daily Hub tabs, referenced by notification click handlers and echo cards. Verify every tab URL loads the correct tab state.
4. Canonical URL usage from BB-40. Verify every page's canonical URL tag matches the shipped URL structure.

**Shared localStorage schemas (BB-7, BB-17, BB-19, BB-43, BB-45, BB-46, BB-41):**
1. `wr_bible_highlights` — consumed by BB-43 (chapter coverage), BB-45 (memorization card creation), BB-46 (echo sources). Verify all three consumers handle the shipped schema correctly.
2. `wr_bible_streak` — consumed by BB-43 (heatmap data), BB-46 (recency bonus in echo scoring), BB-41 (streak reminder trigger logic). Verify all three consumers handle the schema.
3. `wr_chapters_visited` — added by BB-43, consumed by BB-46. Verify the format matches and both specs agree on it.
4. `wr_memorization_cards` — owned by BB-45, consumed by BB-46. Verify the schema.
5. `wr_push_subscription`, `wr_notification_prefs`, `wr_notification_prompt_dismissed` — BB-41's three keys. Verify consistency across Settings page, BibleReader contextual prompt, and scheduler.
6. `wr_first_run_completed` — BB-34's first-run key. Verify trigger logic handles deep-linked arrivals correctly.

**Shared reactive store patterns:**
Every store should follow the same pattern: in-memory cache, listeners, write-through to localStorage, reactive React hook for consumers. Verify BB-7 (highlights), BB-17 (streak), BB-43 (chapter visits), BB-45 (memorization), BB-46 (echoes) all have proper `subscribe` methods, that React components consume stores via hooks (not local state mirrors), and that the BB-45 truth divergence anti-pattern (local useState mirroring store data) doesn't exist anywhere.

**Shared animation tokens (BB-33):**
Verify no component uses hardcoded `duration-200`, `duration-300`, `ease-out`, `ease-in-out`, or spring cubic-bezier curves. Every animation should use BB-33's token system (`duration-fast`, `duration-base`, `duration-slow`, `ease-decelerate`, etc.). Grep for violations.

**Shared accessibility patterns (BB-35):**
Verify every icon-only button has `aria-label`, every decorative icon has `aria-hidden="true"`, every form field has a label, every dialog has `role="dialog"` and `aria-modal="true"`, every page has a skip-to-main-content link (or documented exception like BibleReader), and every dynamic content update has an `aria-live` region.

**Shared typography patterns:**
Verify scripture text uses Lora (serif), UI chrome uses Inter (sans-serif), logo uses Caveat. Grep for violations.

**Shared layout container widths:**
Verify My Bible, Dashboard, Daily Hub, Settings, and Accessibility pages all use the same max-width container. Any page using a different width needs documented justification.

#### 2. Voice and Consistency Audit (`_plans/recon/bb37b-voice-audit.md`)

**Anti-pressure voice checks:**
1. No shaming language ("you missed", "don't break your streak", "you haven't read in N days")
2. No gamified celebration ("great job!", "keep going!", "you unlocked!")
3. No urgency language ("act now", "limited time", "don't miss")
4. No fake metrics ("87% of users" statistics that aren't real)
5. No instructional bossiness ("click here", "do this next")

**Empty state copy checks (BB-34):**
1. Every empty state uses warm, second-person, specific language
2. No generic "No data" or "Nothing here" placeholders
3. CTAs in empty states are optional (not forced)
4. Copy names the specific feature

**Notification copy checks (BB-41):**
1. Daily verse notifications use BB-18's VOTD data correctly
2. Streak reminders use approved gentle messages
3. No streak numbers in reminder bodies
4. No exclamation points
5. All notifications deep-link correctly per BB-38's URL contract

**SEO metadata checks (BB-40):**
1. Every page title matches BB-40's approved list
2. Every page description is in voice
3. Canonical URLs match shipped structure
4. OG card titles match metadata titles

**Button label checks:**
1. Primary CTAs use white pill pattern consistently
2. Labels are specific ("Save verse to memorize" not "Save")
3. Destructive actions have confirmation

**Feature-specific copy checks:**
- BB-34 first-run welcome: greeting, description, option labels match approved version; dismissible, not a gate
- BB-45 memorization deck: warm empty state, gentle remove confirmation
- BB-46 echo cards: natural language relative labels, specific echo reasons

#### 3. Metrics Reconciliation (`_plans/recon/bb37b-metrics-reconciliation.md`)

**Performance metrics:**
- Lighthouse Performance score on every major page (target: 90+ from BB-36)
- Lighthouse Accessibility score on every major page (target: 95+ from BB-35)
- Core Web Vitals (LCP, INP, CLS)
- Bundle size
- Service worker precache size (BB-39)

**Test coverage:**
- Total test count
- Failing tests (should be 0 per BB-37)
- Explicitly skipped tests with documented reasons

**Lint health:**
- Total lint problems (should be 0 per BB-37)
- Explicitly disabled rules with reasons

**TypeScript strictness:**
- Number of `any` types
- Number of `@ts-ignore` / `@ts-expect-error` directives
- Untyped third-party interactions with justification

**Spec completion:**
- Every spec BB-30 through BB-46 marked as shipped or explicitly deferred (audio cluster)
- Acceptance criteria verified against shipped state
- Unmet criteria documented as known issues

#### 4. Known Issues List (`_plans/recon/bb37b-known-issues.md`)

Consolidated from:
1. Every spec's "What this does NOT do" / "Out of Scope" section
2. BB-37's final state document follow-up items
3. BB-37's debt audit skipped items
4. BB-33's animation exemptions (shimmer, breathing, etc.)
5. BB-35's BibleReader layout exception
6. BB-34's first-run welcome deep-link bypass
7. BB-41's local-fallback notification limitations
8. BB-42's lack of phrase search and fuzzy matching
9. BB-43's anti-pressure decision to omit percentages
10. BB-45's single-verse-only memorization cards
11. BB-46's freshness penalty being session-only
12. Any other documented limitations

#### 5. Final Audit Document (`_plans/recon/bb37b-final-audit.md`)

1. **Executive summary** — what the wave built, which specs shipped, which deferred
2. **Integration audit results** — summary of cross-spec verification
3. **Voice and consistency audit results** — summary of copy audit
4. **Metrics reconciliation summary** — table of end-of-wave metrics vs targets
5. **Known issues list** — reference to separate document
6. **Follow-up items** — issues requiring work beyond BB-37b's scope
7. **Wave certification statement** — formal sign-off

### Targeted Fixes

Small issues discovered during audit (copy inconsistencies, missed `aria-hidden`, animation token violations, localStorage key inconsistencies) are fixed inline and documented in the final audit. Issues requiring >30 minutes per item are flagged as follow-up.

## AI Safety Considerations

N/A — This spec does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** N/A — audit is invisible to users
- **Logged-in users:** N/A — no user-facing changes
- **Route type:** N/A — no routes added
- **localStorage:** No new keys. Audit verifies existing keys only.

## Responsive Behavior

N/A — No UI changes. Audit documents only.

## Design Notes

- No visual changes to any page
- Reference BB-33's animation token system and BB-35's accessibility patterns for verification
- Reference BB-34's empty state patterns and BB-40's SEO metadata for voice audit

## What BB-37b Explicitly Does NOT Do

- **No new features.** Pure verification and targeted cleanup.
- **No major refactors.** Structurally suboptimal implementations are documented as follow-ups.
- **No scope expansion for the audio cluster.** BB-26-29, BB-44 remain deferred.
- **No changes to spec-approved copy.** Approved strings stay exactly as shipped.
- **No changes to design tokens.** BB-33's animation tokens, color palette, typography system preserved.
- **No changes to BB-37's resolution decisions.** Skipped tests with reasons are respected.
- **No reopening of closed decisions.** Prior specs' decisions are locked.
- **No re-running BB-37's Playwright full-audit sweep.** Spot-checks only.
- **No automated testing infrastructure additions.**
- **No new npm packages.**
- **No changes to the BB-37 process lessons document.**
- **No new localStorage keys, no new auth gates, no new user-facing surfaces.**
- **No user-facing behavior changes from BB-37-shipped state.**

## Out of Scope

- Audio cluster (BB-26-29, BB-44) — separate BB-37c audit when FCBH key arrives
- New features or feature enhancements
- Major refactors or architecture changes
- CI/CD infrastructure additions (performance budgets, etc.)
- Test additions beyond verifying BB-37's resolution
- Database schema changes (precautionary — still localStorage-only)

## Pre-Execution Checklist

1. BB-37 is shipped and committed (debt audit, Playwright report, final state document, process lessons)
2. BB-37's final state document reviewed; follow-ups understood as starting point
3. All four audit documents produced at `_plans/recon/` BEFORE any targeted fixes begin
4. Every audit item has a proposed resolution (verified, fixed, accepted, deferred)
5. Final audit's wave certification statement drafted during recon
6. Follow-up items list drafted with clear scope
7. Audio cluster explicitly noted as deferred
8. Stay on `bible-redesign` branch — no new branch, no merge
9. Zero new auth gates, localStorage keys, npm packages
10. End-of-wave metrics measured with same tools/profiles as BB-36 (mobile emulation, 4x CPU throttle, Slow 4G)
11. BB-37 process lessons reviewed as input but not modified

## Notes for Execution

- **Audits are the load-bearing steps.** All four audit documents must exist before any targeted fixes begin. Without audits, BB-37b becomes random spot fixes missing systemic issues.
- **Charter: verify, fix small things, defer large things.** Scope creep risk is enormous. Reject anything beyond "small fix or flag as follow-up."
- **Cross-spec integration audit is highest-value.** This is where wave-level quality emerges or fails.
- **Voice audit needs real reading, not just grep.** Read every user-facing string and judge it against brand voice.
- **Metrics reconciliation uses actual measurements.** Run Lighthouse, measure bundle, count tests/lint problems. Don't trust "should be zero" without verification.
- **Targeted fixes committed with audit, not separately.** Single atomic pass.
- **Wave certification statement is real.** If audit finds significant issues, certification includes caveats honestly.
- **After BB-37b ships, the wave is complete.** No more polish specs, features, or cleanup.

## Acceptance Criteria

- [ ] Cross-spec integration audit document exists at `_plans/recon/bb37b-integration-audit.md`
- [ ] Voice and consistency audit document exists at `_plans/recon/bb37b-voice-audit.md`
- [ ] Metrics reconciliation document exists at `_plans/recon/bb37b-metrics-reconciliation.md`
- [ ] Consolidated known issues document exists at `_plans/recon/bb37b-known-issues.md`
- [ ] Final audit document exists at `_plans/recon/bb37b-final-audit.md`
- [ ] Every shared URL contract verified across every consumer
- [ ] Every shared localStorage schema verified across every dependent spec
- [ ] Reactive store pattern verified consistent across BB-7, BB-17, BB-43, BB-45, BB-46 (no local state mirrors)
- [ ] BB-33's animation tokens verified consistent (no hardcoded durations/easings in Bible wave code)
- [ ] BB-35's accessibility patterns verified consistent (aria-labels, aria-hidden, form labels, dialog ARIA, skip links)
- [ ] Typography verified: Lora for scripture, Inter for chrome, Caveat for logo only
- [ ] Layout container widths verified consistent across major pages
- [ ] Every user-facing string verified to match brand voice (anti-pressure, warm, second-person, specific)
- [ ] Every empty state copy from BB-34 verified
- [ ] Every notification copy from BB-41 verified
- [ ] Every SEO title and description from BB-40 verified
- [ ] End-of-wave Lighthouse Performance scores meet 90+ target on every major page
- [ ] End-of-wave Lighthouse Accessibility scores meet 95+ target on every major page
- [ ] End-of-wave Core Web Vitals within BB-36's baseline thresholds
- [ ] End-of-wave bundle size documented
- [ ] `pnpm lint` returns zero problems
- [ ] `pnpm test` returns zero failing tests beyond explicit skips
- [ ] All small issues discovered during audit are fixed and committed
- [ ] All large issues documented as follow-up items with clear scope
- [ ] Wave formally certified via sign-off statement in final audit document
- [ ] Audio cluster (BB-26-29, BB-44) explicitly noted as deferred
- [ ] No new features, auth gates, localStorage keys, or npm packages shipped
- [ ] No user-facing behavior changes from BB-37-shipped state
- [ ] BB-37 process lessons document not modified
