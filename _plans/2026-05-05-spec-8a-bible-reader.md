# Implementation Plan: Spec 8A — Bible Cluster Reader Validation Errors

**Spec:** `_specs/spec-8a-bible-reader.md`
**Date:** 2026-05-05
**Branch:** `forums-wave-continued` (stay; do NOT create branches, commit, push, stash, reset, or run any branch-modifying git command — user manages all git operations)
**Design System Reference:** `.claude/rules/09-design-system.md` (loaded — `Button variant="subtle"` chrome canon)
**Recon Report:** `_plans/recon/bible-2026-05-05.md` (loaded — line numbers drifted post-Spec-8B from 657/691/858 → 654/688/855, verified 2026-05-05)
**Direction Doc:** `_plans/direction/bible-cluster-2026-05-05.md` (loaded — Decisions 11/12/13 boundary)
**Master Spec Plan:** N/A — this is the third and final sub-spec of the Bible cluster (8B and 8C already shipped)

---

## Affected Frontend Routes

- `/bible/<invalid-book>/1` — book-not-found validation surface (CTA #1: "Browse books")
- `/bible/genesis/<invalid-chapter>` (e.g. `/bible/john/99`) — chapter-not-found validation surface (CTA #2: "Go to Chapter N")
- `/bible/genesis/1` — happy-path regression check (no chrome changes; chapter-mount effect from Spec 8B preserved exactly)
- `/bible/genesis/1` with simulated chapter-load failure — chapter-load-error validation surface (CTA #3: "Try Again"). Reached by mocking `loadChapterWeb` to return `null`.

---

## Architecture Context

### Files involved

- `frontend/src/pages/BibleReader.tsx` (971 lines) — only file with code changes. Three `<button>`/`<Link>` CTAs at lines 651–657, 686–691, 835–858.
- `frontend/src/components/ui/Button.tsx` — read-only reference. Confirms `variant="subtle"` exists, supports `asChild`, and `size="md"` resolves to `min-h-[44px]` + `px-6 py-2.5 text-sm` for subtle. Class string canon: `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px]`.
- `frontend/src/pages/__tests__/BibleReader.test.tsx` — only test file with assertions on the migrated CTAs (3 assertions verified at lines 218 — "Go to Chapter 21" — and the implicit error-state queries at lines 199, 207, 274, 287, 411). No existing test exercises the load-error retry path (CTA #3); none needs to be added per the spec — class-string + role assertions are sufficient.

### Patterns

- **Decision 13 Layout Exception (canonical, in `09-design-system.md`):** BibleReader uses `ReaderChrome` instead of `Navbar`/`SiteFooter`, has its own root-level skip link, and is intentional immersive design. The validation-error pages render on `bg-hero-bg` (NOT `var(--reader-bg)`) and live inside BibleReader.tsx because the validation guards run after the route mounts. The validation-error CTAs are not reader chrome and ARE in scope for the Round 4 visual-consistency rollout.
- **`<Button variant="subtle">` chrome canon:** Mirror PlanBrowserEmptyState's tests at `frontend/src/components/bible/plans/__tests__/PlanBrowserEmptyState.test.tsx:75–107` for the test pattern. Class assertions: `bg-white/[0.07]`, `border-white/[0.12]`, `rounded-full`. Role queries: `getByRole('button', { name: 'Browse books' })` / `getByRole('link', { name: /Go to Chapter \d+/ })`.
- **`asChild` composition pattern:** `<Button variant="subtle" size="md" asChild><Link to="...">...</Link></Button>` — verified in `Button.tsx:68–84`. The Button primitive uses `Children.only(children)` + `cloneElement` to merge styles onto the single child element, so the rendered output is a single `<a>` with the Button class string. Canonical pattern shipped in 8C and earlier (8B and 7).
- **Test mocks already in place** (no provider changes needed): `MemoryRouter` + `AudioProvider` + `AudioPlayerProvider` + `Routes` + `Route path="/bible/:book/:chapter"` (see `BibleReader.test.tsx:136–149`). Mocks: `loadChapterWeb` (returns null for unknown chapter — already drives CTA #2 path; can be extended to drive CTA #3 path if needed via a test-local override).

### Database tables

N/A — pure frontend element migration. No backend changes, no Liquibase changesets, no API changes.

### Auth gating context

**Zero new auth gates** (per spec § "Auth Gating" + `02-security.md` § "Bible Wave Auth Posture"). All three CTAs preserve their existing no-auth-gate behavior:

- CTA #1 click → `bibleDrawer.open()` (no auth)
- CTA #2 click → React Router navigation to `/bible/${book.slug}/${book.chapters}` (no auth)
- CTA #3 click → `loadChapterWeb` retry (no auth)

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Click "Browse books" CTA | No auth gate (preserved) | Step 3 | None — preserves existing posture |
| Click "Go to Chapter N" CTA | No auth gate (preserved) | Step 4 | None — preserves existing posture |
| Click "Try Again" CTA | No auth gate (preserved) | Step 5 | None — preserves existing posture |

**No new auth modal triggers introduced.** The Bible cluster's "free to read, free to recover" posture is preserved exactly.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| `<Button variant="subtle">` | base class string | `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px]` | `Button.tsx:51–52` |
| `<Button size="md">` (subtle) | size class string | `px-6 py-2.5 text-sm` | `Button.tsx:62` |
| Test assertion canon | classNames asserted | `bg-white/[0.07]`, `border-white/[0.12]`, `rounded-full` | `PlanBrowserEmptyState.test.tsx:84–86, 104–106` |
| Test query canon (Pattern 1, button) | role | `getByRole('button', { name: 'Browse books' })` | Spec 8A § Functional Requirement 9 |
| Test query canon (Pattern 2, link via asChild) | role | `getByRole('link', { name: /Go to Chapter \d+/ })` | Spec 8A § Functional Requirement 9 |
| Test query canon (Pattern 3, button) | role | `getByRole('button', { name: 'Try Again' })` | Spec 8A § Functional Requirement 9 |
| FrostedCard wrapper (preserved) | classes | `max-w-md text-center` | `BibleReader.tsx:648, 681, 831` |
| Page wrapper (preserved) | classes | `flex min-h-screen flex-col bg-hero-bg` | `BibleReader.tsx:645, 674` |
| Skip-link (preserved, NOT migrated) | classes (line 730) | `sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white` | `BibleReader.tsx:730` |

**Tap target:** `min-h-[44px]` is provided by the Button primitive's `subtle` variant. Do NOT add `min-h-[44px]` redundantly via `className`.

**Width behavior:** Validation-error CTAs render at content width across all breakpoints. The original `<button>`/`<Link>` did not have `w-full`, so the migrated `<Button>` does NOT add it. No `className="w-full sm:w-auto"` should be passed.

---

## Design System Reminder

Project-specific quirks `/execute-plan` displays before each UI step:

- **Decision 13 boundary is absolute.** Only the three validation-error CTA blocks change. Every other line of BibleReader.tsx — including the chapter-mount effect (`recordChapterVisit` + `markChapterRead` from Spec 8B), focus-mode logic, swipe gesture handlers, audio coordination, AI panels, the skip-to-main-content link's `focus:bg-primary`, reader theme CSS, and SEO metadata — is preserved byte-for-byte.
- **`bg-primary` decorative tints (Decision 11) stay.** `bg-primary/[0.15]` selection background, `bg-primary/[0.6]` left-border accents, and any other `bg-primary/N` decorative tints are NOT CTAs. They are not in this spec's scope.
- **Skip-link `focus:bg-primary` (line 730) stays.** It's the canonical keyboard-focus treatment for the skip-to-main-content link, NOT a CTA.
- **`asChild` composition is canonical.** Use `<Button variant="subtle" size="md" asChild><Link to="...">...</Link></Button>` for the Link-wrapped CTA #2. The Button primitive merges styles onto the single child via `Children.only` + `cloneElement` (`Button.tsx:68–84`). Do NOT wrap a Link inside a Button without `asChild` — that produces a button-inside-link DOM structure with broken semantics.
- **`size="md"` resolves to `min-h-[44px]` automatically.** Do NOT add `min-h-[44px]` to `className`. The original CTAs had it explicitly because they were hand-rolled `<button>` / `<Link>`; the Button primitive adds it via the subtle variant.
- **No `bg-primary` matches inside BibleReader.tsx after this spec lands EXCEPT line 730.** Verified via `grep -n "bg-primary" frontend/src/pages/BibleReader.tsx` returning exactly 1 match.
- **Test class assertions: 3 minimum.** Mirror `PlanBrowserEmptyState.test.tsx:84–86`: assert `bg-white/[0.07]`, `border-white/[0.12]`, `rounded-full`. Do NOT assert `text-white` separately — it's already in the subtle base string and would over-couple the test to the primitive's internal class shape.
- **Role queries are migration-resilient — prefer them.** `getByRole('button', { name: 'Browse books' })` survives future class-string changes. Use class-string assertions only when verifying the chrome migration explicitly succeeded.
- **No new copy.** All user-facing strings preserved exactly: "That book doesn't exist.", "Browse books", "← Back to Bible", "{book.name} only has {book.chapters} chapter(s).", "Go to Chapter {book.chapters}", "Couldn't load this chapter. Check your connection.", "Try Again".
- **No new auth gates, no new tests of new behavior, no new components, no new data structures.**

---

## Shared Data Models (from Master Plan)

N/A — no master plan for the Bible cluster (8B, 8C, 8A are co-equal sub-specs of the cluster direction doc, not children of a master plan). Shared TypeScript interfaces and localStorage keys are unchanged. No new keys, no key reads, no key writes.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| (none) | — | Validation-error CTAs do not read or write localStorage |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | FrostedCard `max-w-md` centered with `flex flex-1 items-center justify-center px-4`. CTA renders at content width within the card. Secondary `<Link>` and `<button>` stack vertically via `flex flex-col items-center gap-3` parent. |
| Tablet | 768px | Same — FrostedCard centered, content-width CTA, vertical stack of secondary links. |
| Desktop | 1440px | Same — FrostedCard `max-w-md` constraint persists; no multi-column layout. Validation-error pages are intentionally minimalist. |

**No responsive breakpoint-specific class changes.** The migration does not add or remove any `sm:` / `md:` / `lg:` modifiers. Original `<button>` / `<Link>` rendered at content width across all breakpoints; migrated `<Button variant="subtle" size="md">` does the same.

---

## Inline Element Position Expectations

N/A — no inline-row layouts in this feature. Each FrostedCard contains a vertical stack (`flex flex-col items-center gap-3`) of:

1. The migrated primary CTA (Button)
2. Optional secondary link (Link or button)
3. Optional tertiary "← Back to Bible" link

All three stack vertically at every breakpoint by design. No horizontal alignment to verify.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Page background → FrostedCard | viewport-centered (`items-center justify-center`) | `BibleReader.tsx:647, 680, 830` |
| Copy `<p>` → CTA stack | `mb-6` (24px) | `BibleReader.tsx:649, 682, 832` |
| CTA → secondary link → tertiary link | `gap-3` (12px) | `BibleReader.tsx:650, 685` |
| FrostedCard padding | `p-6` (FrostedCard default) | `FrostedCard.tsx` |

The migration does NOT change vertical rhythm — only the CTA element type. Spacing classes around the CTA are untouched.

---

## Assumptions & Pre-Execution Checklist

- [ ] Spec 8B (MyBible) is committed and on `forums-wave-continued`. Verify by checking the chapter-mount effect at the appropriate line in BibleReader.tsx exists (`recordChapterVisit` + `markChapterRead` calls).
- [ ] Spec 8C (Reading Plans) is committed and on `forums-wave-continued`. Verify by `grep -rn "ATMOSPHERIC_HERO_BG" frontend/src/components/bible/` returning zero import matches and `grep -n "/reading-plans/" frontend/src/components/bible/` returning only the Step-1 regression-guard test from 8C.
- [ ] All auth-gated actions from the spec are accounted for in the plan — verified zero new auth gates required.
- [ ] Design system values verified — `Button variant="subtle"` source canon at `Button.tsx:51–52, 62`.
- [ ] No `[UNVERIFIED]` values in this plan. Every CSS class string is sourced from `Button.tsx` (live code), `PlanBrowserEmptyState.test.tsx` (live test canon), or `09-design-system.md` (rule canon). The line numbers 654/688/855 are confirmed by `grep -n "bg-primary" frontend/src/pages/BibleReader.tsx` against the current branch.
- [ ] Recon report `_plans/recon/bible-2026-05-05.md` loaded for line-number context (drifted from 657/691/858 → 654/688/855 after Spec 8B's chapter-mount effect added `recordChapterVisit` + `markChapterRead` calls).
- [ ] Frontend test baseline known: 9,470 pass / 1 pre-existing fail (`useFaithPoints — intercession` activity drift). Flaky `useNotifications` test may add a second fail in a tight-timing window — neither is a Spec 8A regression. Per Spec 8C execution log, current actual baseline at the 8C completion was 9,539 pass / 3 pre-existing fails (the same `useNotifications` flaky test plus pre-existing intercession drift) — the test count grew because 8C added 19 new tests minus 9 deletions. **Spec 8A's regression check uses the baseline _at the moment 8A starts_** (re-run `pnpm test --run` once before Step 1 and record the actual pass/fail count). Any NEW failing test file or any increase in pre-existing fail count is a regression.
- [ ] No deprecated patterns introduced (Caveat headings, BackgroundSquiggle, GlowBackground on Daily Hub, animate-glow-pulse, cyan textarea borders, italic Lora prompts, soft-shadow 8px-radius cards, PageTransition).

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Add Button import once at top of file? | Yes — single import statement | Button is not currently imported (verified via `grep` on the live file). Add `import { Button } from '@/components/ui/Button'` immediately after the other `@/components/...` imports for consistent ordering. |
| Use `size="md"`? | Yes | Matches the original `min-h-[44px] px-6 py-2 font-medium` chrome closely (subtle + md → `min-h-[44px] px-6 py-2.5 text-sm`). Spec mandates `size="md"`. |
| Pattern for CTA #2 (Link)? | `asChild` wrapping the existing Link | Spec mandates this pattern. Verified canonical via `Button.tsx:68–84` and `PlanBrowserEmptyState.test.tsx:75–87`. The asChild form preserves React Router routing semantics, emits a single `<a>` element, and applies the subtle Button class string. |
| Skip-link `focus:bg-primary` at line 730? | Preserve unchanged | Decision 13 carve-out — canonical keyboard-focus treatment, NOT a CTA. |
| `bg-primary` decorative tints in ReaderBody / scripture callouts? | Preserve unchanged | Decision 11 carve-out — categorical signals, NOT CTAs. |
| Add a test for CTA #3 retry behavior? | No — only update class-string assertion if existing tests exercise CTA #3 | Spec § Functional Requirement 8 says update existing assertions; no new tests of new behavior. The current `BibleReader.test.tsx` does not exercise the load-error retry path (verified via `grep "Couldn't load this chapter\|loadError"` returning zero matches). Class-string assertion update is unnecessary for an absent test. |
| Refactor existing CTA #2 query (`screen.getByText('Go to Chapter 21').closest('a')`) to role-based? | Yes | Spec § Functional Requirement 9 prefers role queries. The current test at line 218 reads brittlely (`getByText` then `closest('a')`); refactor to `getByRole('link', { name: /Go to Chapter 21/ })` and assert `link.getAttribute('href')` directly. |
| What if Button primitive's class string has drifted since recon? | Re-grep `Button.tsx:51–52, 62` during Step 1 and update the Design System Values table in this plan if values differ. | Drift is unlikely (Button has been stable across 8B/8C); but the live code wins over docs in any disagreement. |
| What if an additional `bg-primary` CTA surfaces in BibleReader.tsx during Step 1? | STOP and report. | The recon and direction docs say there are exactly 3 CTAs + 1 skip-link match. If grep returns a different count, the plan's scope is wrong and needs revisiting before any code change. |

---

## Implementation Steps

### Step 1: Pre-execution recon — verify line numbers, Button import status, test inventory, and baselines

**Objective:** Confirm the spec's premises hold against the live code at the moment of execution. Surface any drift before any code change.

**Files to create/modify:** None (read-only).

**Details:**

Run the following grep commands and verify the expected output:

```bash
# 1. Verify exactly 4 bg-primary matches in BibleReader.tsx — three CTAs (lines ~654/688/855) + one skip-link (line 730)
grep -n "bg-primary" frontend/src/pages/BibleReader.tsx
# Expected: exactly 4 matches at lines 654, 688, 730, 855 (line numbers may drift ±5 from spec's 654/688/730/855 if 8B/8C-tail commits added/removed lines)

# 2. Verify Button is NOT yet imported in BibleReader.tsx
grep -n "from '@/components/ui/Button'" frontend/src/pages/BibleReader.tsx
# Expected: zero matches (if non-zero, skip Step 2 and proceed directly to Step 3)

# 3. Verify Button primitive's subtle + md chrome canon (read-only)
grep -n "variant === 'subtle'" frontend/src/components/ui/Button.tsx
# Expected: matches at lines 51–52 and 61–63
# Class string canon: bg-white/[0.07] border-white/[0.12] rounded-full

# 4. Verify test mocks for loadChapterWeb already include the path that triggers CTA #2 (return null for unknown chapter)
grep -n "loadChapterWeb" frontend/src/pages/__tests__/BibleReader.test.tsx
# Expected: mock at line ~44 returns null for any (book, chapter) other than ('john', 3)

# 5. Verify no test currently exercises CTA #3 (load-error retry)
grep -n "Couldn't load this chapter\|loadError\|Try Again" frontend/src/pages/__tests__/BibleReader*.test.tsx
# Expected: zero matches (confirms no class-string update needed for CTA #3 in existing tests)

# 6. Decision 13 boundary check (pre-spec): record current bg-primary footprint in reader-chrome components for diff vs post-spec
grep -rn "bg-primary" frontend/src/components/bible/reader/ | wc -l
# Record N — must match post-spec count exactly (this spec touches zero reader-chrome files)

# 7. Test baseline — run before any code change
pnpm test --run
# Record actual pass/fail count. Spec expects ~9,470 pass / 1 pre-existing fail (or 9,469/2 in flaky window).
# Per Spec 8C execution log, baseline at 8C completion was 9,539 pass / 3 fails. Use whichever is current.

# 8. Typecheck baseline
pnpm typecheck
# Expected: clean compile.
```

**Decision points emerging from Step 1 grep output:**

- **If item 1 returns ≠ 4 matches:** STOP and report. The plan's scope is wrong.
- **If item 1 returns 4 matches but at different line numbers:** Record actual line numbers; replace 654/688/855 in Steps 3–5 with actual values. Skip-link line is 730 ±5.
- **If item 2 returns ≥ 1 match:** Skip Step 2 entirely (Button is already imported); proceed to Step 3.
- **If item 3 returns no matches at lines 51–52:** Re-read `Button.tsx` to find the current subtle variant location; update the Design System Values table in this plan.
- **If item 6 returns ≠ 0 matches OR matches that look like CTAs (e.g., not just decorative tints):** Inspect each match. If any are CTAs, STOP — those are out of scope for 8A but in scope for a future spec.
- **If item 7 returns NEW failing files vs spec's expected baseline:** STOP and report. We need a clean baseline before this spec's code changes are layered on top.

**Auth gating (if applicable):** N/A — read-only recon.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- DO NOT modify any file in this step.
- DO NOT add any TODO or `console.log` to BibleReader.tsx for "later cleanup."
- DO NOT skip running the test baseline. The post-spec regression check needs a known-good pre-spec baseline.

**Test specifications:** None (read-only step).

**Expected state after completion:**

- [ ] Actual line numbers for the three CTAs recorded (expected 654/688/855 ±5).
- [ ] Button import status confirmed (expected: not yet imported).
- [ ] Button primitive subtle chrome canon confirmed at `Button.tsx:51–52, 62`.
- [ ] Test baseline recorded (e.g., 9,539 pass / 3 pre-existing fail).
- [ ] Typecheck baseline confirmed clean.
- [ ] No surprises in reader-chrome `bg-primary` footprint.

---

### Step 2: Add `Button` import to `BibleReader.tsx`

**Objective:** Add the single import statement so Steps 3–5 can use `<Button>`.

**Files to create/modify:**

- `frontend/src/pages/BibleReader.tsx` — add 1 line at the top

**Details:**

Add the import statement immediately after the existing `@/components/...` import block. The current import order is alphabetized within the `@/components/bible/...` group; add the new line at the right alphabetical location for the `@/components/ui/...` group. Concretely: after the last `@/components/bible/...` import, add:

```tsx
import { Button } from '@/components/ui/Button'
```

The exact insertion line is the line immediately after the SEO/seo, BibleDrawer, ReaderBody/Chrome group at lines 4–16 — pick the line that minimizes diff churn (right before the `useReaderSettings` hook import or right after the last `@/components/...` import). Do NOT reformat existing imports. Do NOT change import order.

**Skip this step entirely if Step 1 grep #2 returned ≥ 1 match.**

**Auth gating (if applicable):** N/A — pure import.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- DO NOT add unrelated imports.
- DO NOT remove or reorder existing imports.
- DO NOT use a default import (`import Button from ...`) — Button is a named export per `Button.tsx:28`.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `pnpm typecheck` | tooling | TypeScript compile clean. The Button import resolves via the `@/` path alias. |

**Expected state after completion:**

- [ ] `import { Button } from '@/components/ui/Button'` appears once at the top of BibleReader.tsx.
- [ ] No other imports added or modified.
- [ ] `pnpm typecheck` passes.

---

### Step 3: Migrate CTA #1 (book not found — "Browse books")

**Objective:** Replace the hand-rolled `<button>` at line 651–657 with `<Button variant="subtle" size="md" type="button" onClick={() => bibleDrawer.open()}>Browse books</Button>`.

**Files to create/modify:**

- `frontend/src/pages/BibleReader.tsx` — modify lines 651–657 only

**Details:**

Within the `if (!book) { return ... }` validation block (line 643), inside the FrostedCard, inside the `<div className="flex flex-col items-center gap-3">` (line 650), replace this block:

```tsx
<button
  type="button"
  onClick={() => bibleDrawer.open()}
  className="min-h-[44px] rounded-lg bg-primary px-6 py-2 font-medium text-white transition-[colors,transform] duration-fast hover:bg-primary-lt active:scale-[0.98]"
>
  Browse books
</button>
```

with:

```tsx
<Button
  variant="subtle"
  size="md"
  type="button"
  onClick={() => bibleDrawer.open()}
>
  Browse books
</Button>
```

**Preservation (byte-for-byte):**

- CTA text: `Browse books`
- onClick handler: `() => bibleDrawer.open()` (no signature change)
- Surrounding `<FrostedCard className="max-w-md text-center">` wrapper
- "That book doesn't exist." `<p>` copy (line 649)
- `<div className="flex flex-col items-center gap-3">` parent stack
- Secondary `<Link to="/bible">&larr; Back to Bible</Link>` (line 658–660) — UNCHANGED
- Page wrapper `<div className="flex min-h-screen flex-col bg-hero-bg">` (line 645)
- SEO `<SEO title="Book Not Found" description="This Bible book doesn't exist." noIndex />` (line 646)
- `<BibleDrawer>` mount + `<DrawerViewRouter>` content (lines 664–666)

**Auth gating (if applicable):** N/A — no auth gate for this CTA.

**Responsive behavior:**

- Desktop (1440px): FrostedCard centered, Button at content width, secondary link below stacked
- Tablet (768px): Same
- Mobile (375px): Same — `min-h-[44px]` tap target preserved by `Button size="md"`

**Inline position expectations:** N/A — vertical stack only.

**Guardrails (DO NOT):**

- DO NOT add `min-h-[44px]` to `className` — Button primitive handles it via the subtle variant.
- DO NOT pass `className` at all unless absolutely needed. The Button primitive's default chrome is sufficient.
- DO NOT change the onClick handler signature, the CTA text, or the surrounding card/wrapper structure.
- DO NOT touch the secondary `<Link to="/bible">` below the CTA.
- DO NOT touch SEO metadata, the BibleDrawer mount, or any line outside 651–657.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `BibleReader.test.tsx — invalid book shows error state` (existing test, line 198) | unit | Asserts `That book doesn't exist.` text is rendered. Preserved unchanged. |
| `BibleReader.test.tsx — invalid book CTA renders Button subtle chrome` (NEW) | unit | Render `/bible/notabook/1`. `getByRole('button', { name: 'Browse books' })`. Assert: `btn.className` contains `bg-white/[0.07]`, `border-white/[0.12]`, `rounded-full`. |
| `BibleReader.test.tsx — invalid book CTA opens BibleDrawer on click` (NEW or extend existing) | unit | Render `/bible/notabook/1`. Click the "Browse books" button via `getByRole('button', { name: 'Browse books' })`. Assert that the BibleDrawer's open state changes. (If the existing mocks make this assertion difficult, this test can be deferred — class-string assertion is the priority.) |

**Expected state after completion:**

- [ ] Lines 651–657 of BibleReader.tsx are now a single `<Button variant="subtle" size="md" type="button" onClick={() => bibleDrawer.open()}>Browse books</Button>` element (formatted across ~6 lines).
- [ ] No other code changes in BibleReader.tsx.
- [ ] Manual eyeball check: `/bible/notabook/1` renders the FrostedCard with the new translucent subtle Button instead of the saturated purple solid-fill button. Click opens the BibleDrawer.
- [ ] `pnpm typecheck` passes.

---

### Step 4: Migrate CTA #2 (chapter not found — "Go to Chapter N", asChild + Link)

**Objective:** Replace the hand-rolled `<Link>` at line 686–691 with `<Button variant="subtle" size="md" asChild><Link to={...}>...</Link></Button>`.

**Files to create/modify:**

- `frontend/src/pages/BibleReader.tsx` — modify lines 686–691 only

**Details:**

Within the `if (isNaN(chapterNumber) || chapterNumber < 1 || chapterNumber > book.chapters) { return ... }` validation block (line 672), inside the FrostedCard, inside the `<div className="flex flex-col items-center gap-3">` (line 685), replace this block:

```tsx
<Link
  to={`/bible/${book.slug}/${book.chapters}`}
  className="min-h-[44px] rounded-lg bg-primary px-6 py-2 font-medium text-white transition-[colors,transform] duration-fast hover:bg-primary-lt active:scale-[0.98]"
>
  Go to Chapter {book.chapters}
</Link>
```

with:

```tsx
<Button variant="subtle" size="md" asChild>
  <Link to={`/bible/${book.slug}/${book.chapters}`}>
    Go to Chapter {book.chapters}
  </Link>
</Button>
```

**Preservation (byte-for-byte):**

- Link's `to` prop: `` `/bible/${book.slug}/${book.chapters}` ``
- CTA text: `Go to Chapter {book.chapters}` (with dynamic `${book.chapters}` interpolation)
- Surrounding `<FrostedCard className="max-w-md text-center">` wrapper
- Chapter-bounds copy `{book.name} only has {book.chapters} chapter{book.chapters !== 1 ? 's' : ''}.` (line 682–684)
- `<div className="flex flex-col items-center gap-3">` parent stack
- Secondary `<button onClick={() => bibleDrawer.open()} className="text-sm text-white/50 ...">` "Browse books" (line 692–698) — **NOT migrated; already canonical** (uses `text-white/50`, not `bg-primary`)
- Tertiary `<Link to="/bible">&larr; Back to Bible</Link>` (line 699–701) — UNCHANGED
- Page wrapper `<div className="flex min-h-screen flex-col bg-hero-bg">` (line 674)
- SEO chapter-not-found metadata (lines 675–679)
- `<BibleDrawer>` mount + `<DrawerViewRouter>` content (lines 705–707)

**`asChild` rendered output:** The Button primitive uses `Children.only(children)` + `cloneElement` to merge the subtle class string onto the Link element directly (`Button.tsx:68–84`). The DOM emits a single `<a href="...">Go to Chapter N</a>` with the subtle Button class string applied. No `<button>` wrapping the `<a>`. No nested interactive elements.

**Auth gating (if applicable):** N/A — no auth gate for this CTA.

**Responsive behavior:**

- Desktop (1440px): FrostedCard centered, Link rendered as content-width subtle pill, secondary "Browse books" button + tertiary "← Back to Bible" Link stacked below
- Tablet (768px): Same
- Mobile (375px): Same — `min-h-[44px]` tap target preserved

**Inline position expectations:** N/A — vertical stack only.

**Guardrails (DO NOT):**

- DO NOT use `<Button onClick={() => navigate(...)}>` instead of `asChild`. The semantic element MUST be `<a>` for routing semantics; only `asChild` produces that.
- DO NOT pass any `className` on the inner `<Link>` — the Button primitive merges the subtle chrome onto the Link via `cloneElement`.
- DO NOT touch the secondary "Browse books" `<button>` (line 692) — it uses `text-white/50` styling, NOT `bg-primary`, so it's already canonical and out of scope per spec § Functional Requirement 2.
- DO NOT touch the tertiary "← Back to Bible" `<Link>` (line 699).
- DO NOT touch SEO, BibleDrawer mount, or any line outside 686–691.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `BibleReader.test.tsx — invalid chapter shows chapter count` (existing test, line 206) | unit | Asserts `John only has 21 chapters.` text is rendered. Preserved unchanged. |
| `BibleReader.test.tsx — invalid chapter has jump-to-last button` (existing test, line 214) — **REFACTOR** | unit | Currently uses `screen.getByText('Go to Chapter 21').closest('a')`. Refactor to `const link = screen.getByRole('link', { name: /Go to Chapter 21/ })` and assert `link.getAttribute('href')` directly. ALSO assert `link.className` contains `bg-white/[0.07]`, `border-white/[0.12]`, `rounded-full` (verifies the asChild composition emitted `<a>` with subtle chrome). |
| `BibleReader.test.tsx — invalid chapter CTA emits a single semantic <a> with subtle chrome` (NEW) | unit | Render `/bible/john/99`. `getByRole('link', { name: /Go to Chapter 21/ })` should match exactly one element. Verify `link.tagName === 'A'`. Verify no `<button>` ancestor wraps the `<a>` (assert `link.closest('button')` is null). |

**Expected state after completion:**

- [ ] Lines 686–691 of BibleReader.tsx are now a `<Button variant="subtle" size="md" asChild>` wrapping the existing `<Link>` (formatted across ~5 lines).
- [ ] No other code changes in BibleReader.tsx.
- [ ] Manual eyeball check: `/bible/john/99` renders the FrostedCard with the new translucent subtle pill (rendered as `<a>`) instead of the saturated purple solid-fill Link. Click navigates to `/bible/john/21`.
- [ ] `pnpm typecheck` passes — `<Button asChild>` wrapping `<Link>` satisfies the primitive's type contract.

---

### Step 5: Migrate CTA #3 (chapter load failed — "Try Again")

**Objective:** Replace the hand-rolled `<button>` at line 835–858 with `<Button variant="subtle" size="md" type="button" onClick={...}>Try Again</Button>`. Preserve the complex inline retry handler exactly.

**Files to create/modify:**

- `frontend/src/pages/BibleReader.tsx` — modify lines 835–858 only (the `<button>` element; the onClick handler body is preserved verbatim)

**Details:**

Within the `loadError` state branch (line 829), inside the FrostedCard (line 831), replace the `<button>` element (lines 835–858) with `<Button variant="subtle" size="md">`. The complex onClick handler body must be preserved byte-for-byte:

Before:

```tsx
<button
  type="button"
  onClick={() => {
    setLoadError(false)
    setIsLoading(true)
    loadChapterWeb(bookSlug!, chapterNumber)
      .then((data) => {
        if (data) {
          setVerses(data.verses)
          setParagraphs(data.paragraphs ?? [])
        } else {
          setLoadError(true)
        }
        setIsLoading(false)
      })
      .catch(() => {
        setLoadError(true)
        setIsLoading(false)
      })
  }}
  className="min-h-[44px] rounded-lg bg-primary px-6 py-2 font-medium text-white transition-[colors,transform] duration-fast hover:bg-primary-lt active:scale-[0.98]"
>
  Try Again
</button>
```

After:

```tsx
<Button
  variant="subtle"
  size="md"
  type="button"
  onClick={() => {
    setLoadError(false)
    setIsLoading(true)
    loadChapterWeb(bookSlug!, chapterNumber)
      .then((data) => {
        if (data) {
          setVerses(data.verses)
          setParagraphs(data.paragraphs ?? [])
        } else {
          setLoadError(true)
        }
        setIsLoading(false)
      })
      .catch(() => {
        setLoadError(true)
        setIsLoading(false)
      })
  }}
>
  Try Again
</Button>
```

**Preservation (byte-for-byte):**

- CTA text: `Try Again`
- Complex onClick handler body — every line within the arrow function, including the `bookSlug!` non-null assertion, the `setLoadError(false)` then `setIsLoading(true)` ordering, the `.then(...)` branches with `data ? setVerses + setParagraphs : setLoadError(true)`, the `setIsLoading(false)` placement, and the `.catch(() => { setLoadError(true); setIsLoading(false) })` block. NO logic changes.
- Surrounding `<FrostedCard className="max-w-md text-center">` wrapper (line 831)
- "Couldn't load this chapter. Check your connection." `<p>` copy (line 832–834)
- Surrounding `<div className="flex items-center justify-center py-16">` (line 830)
- The conditional render structure: `isLoading ? ... : loadError ? ... : <happy-path>` (lines 825–861)

**Auth gating (if applicable):** N/A — no auth gate for this CTA.

**Responsive behavior:**

- Desktop (1440px): FrostedCard centered, Button at content width
- Tablet (768px): Same
- Mobile (375px): Same — `min-h-[44px]` tap target preserved

**Inline position expectations:** N/A — single-element block (no secondary CTAs in the load-error FrostedCard).

**Guardrails (DO NOT):**

- DO NOT change the onClick handler body in any way. Even cosmetic reformatting (e.g., changing `data.paragraphs ?? []` to `data.paragraphs || []`) is forbidden — the spec mandates byte-for-byte preservation.
- DO NOT extract the onClick into a `useCallback` or named function. That would be a behavior-equivalent refactor outside this spec's scope.
- DO NOT touch any code in the `isLoading ? ...` branch (line 825) or the `<happy-path>` branch (lines 861+).
- DO NOT touch the chapter-mount effect from Spec 8B (`recordChapterVisit` + `markChapterRead` calls). Verify post-edit by grepping for both function names.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `BibleReader.test.tsx — load error renders Try Again Button subtle` (NEW) | unit | Mock `loadChapterWeb` to reject (or return null) for a specific (book, chapter). Render that route. Wait for the load-error FrostedCard. Assert `getByRole('button', { name: 'Try Again' })` exists and `btn.className` contains `bg-white/[0.07]`, `border-white/[0.12]`, `rounded-full`. **Note:** This test is the only new behavioral test added by 8A — it's a class-string + role test, not a new behavior test. Per spec § Functional Requirement 8, "no new tests of new behavior." If the existing test infrastructure makes this test difficult to set up (e.g., `loadChapterWeb` mock at line 44 doesn't easily support per-test override), defer it and skip — class-string assertions on CTAs #1 and #2 are sufficient for the chrome migration audit. |
| `BibleReader.test.tsx — load error retry calls loadChapterWeb again` | unit | (Optional, only if added.) Mock `loadChapterWeb` to reject once then resolve, render the route, click Try Again, assert `loadChapterWeb` was called twice. |

**Expected state after completion:**

- [ ] Lines 835–858 of BibleReader.tsx are now a `<Button variant="subtle" size="md" type="button" onClick={...}>Try Again</Button>` element with the onClick body preserved byte-for-byte.
- [ ] No other code changes in BibleReader.tsx.
- [ ] Chapter-mount effect from Spec 8B preserved exactly — `grep -n "recordChapterVisit\|markChapterRead" frontend/src/pages/BibleReader.tsx` returns the same matches as before this spec.
- [ ] Manual eyeball check: simulate a chapter-load failure in dev (e.g., dev tools → block requests on bible JSON), reach the load-error state, click Try Again. Behavior identical to pre-spec; chrome is now the translucent subtle Button.
- [ ] `pnpm typecheck` passes.

---

### Step 6: Update tests + Decision-13 boundary grep audit + full regression

**Objective:** Land the test class-string assertion updates from Steps 3–5, verify the Decision 13 boundary held (no unintended changes outside the three CTA blocks), and confirm the full test + typecheck baselines are intact.

**Files to create/modify:**

- `frontend/src/pages/__tests__/BibleReader.test.tsx` — add/modify tests per Steps 3–5

**Details:**

#### 6a — Test additions/modifications

Apply the test changes specified in Steps 3, 4, and 5:

1. **CTA #1 chrome assertion:** Add a new test "invalid book CTA renders Button subtle chrome" after the existing "invalid book shows error state" test. Pattern: `getByRole('button', { name: 'Browse books' })` then assert `bg-white/[0.07]`, `border-white/[0.12]`, `rounded-full`.
2. **CTA #2 query refactor + chrome assertion:** Modify the existing "invalid chapter has jump-to-last button" test (line 214). Change from `screen.getByText('Go to Chapter 21').closest('a')` to `screen.getByRole('link', { name: /Go to Chapter 21/ })`. Keep the `link.getAttribute('href')` assertion. ADD chrome-class assertions: `link.className` contains `bg-white/[0.07]`, `border-white/[0.12]`, `rounded-full`. ADD a `link.tagName === 'A'` assertion.
3. **CTA #3 chrome assertion (if feasible):** See Step 5 test specs. If the existing `loadChapterWeb` mock setup makes per-test override difficult, defer this test and document the deferral in the Execution Log notes.

Mirror the test patterns in `frontend/src/components/bible/plans/__tests__/PlanBrowserEmptyState.test.tsx:75–107` for canonical assertion shape.

#### 6b — Decision 13 boundary grep audit

Run the following grep audits and verify expected output:

```bash
# B1. Exactly 1 bg-primary match remains in BibleReader.tsx — the skip-link's focus:bg-primary at line ~730
grep -n "bg-primary" frontend/src/pages/BibleReader.tsx
# Expected: exactly 1 match (skip-link). If > 1, a CTA migration was incomplete; if 0, the skip-link was accidentally migrated (regression).

# B2. Reader-chrome components have unchanged bg-primary footprint vs Step 1 baseline
grep -rn "bg-primary" frontend/src/components/bible/reader/ | wc -l
# Expected: matches the Step 1 baseline EXACTLY (this spec touches zero reader-chrome files).

# B3. No new bg-primary matches anywhere else in the codebase
git diff --stat -- frontend/src
# Expected: only frontend/src/pages/BibleReader.tsx and frontend/src/pages/__tests__/BibleReader.test.tsx show as modified. No other source file touched.

# B4. Spec 8B chapter-mount effect preserved
grep -n "recordChapterVisit\|markChapterRead" frontend/src/pages/BibleReader.tsx
# Expected: the same matches as the Step 1 grep (no change).

# B5. Skip-link preserved
grep -n "focus:bg-primary" frontend/src/pages/BibleReader.tsx
# Expected: exactly 1 match (line ~730).

# B6. Decoration-tier bg-primary tints preserved (Decision 11)
grep -rn "bg-primary/" frontend/src/components/bible/ | wc -l
# Expected: ≥ 0 (any decorative tints in reader-chrome / verse-action-sheet / scripture-callouts unchanged).
```

#### 6c — Full regression

```bash
pnpm typecheck   # Expected: clean.
pnpm test --run  # Expected: pass count = (Step 1 baseline pass + 2 to 4 new tests). Fail count = Step 1 baseline fail count exactly. NO new failing test files.
pnpm lint        # Expected: clean (no new lint warnings).
```

#### 6d — Manual eyeball verification

Run the Pre-Execution dev server and verify the three validation surfaces visually:

```bash
pnpm dev  # then visit:
# 1. http://localhost:5173/bible/notabook/1   → "Browse books" subtle pill, click opens BibleDrawer
# 2. http://localhost:5173/bible/john/99      → "Go to Chapter 21" subtle pill (rendered as <a>), click navigates to /bible/john/21
# 3. http://localhost:5173/bible/genesis/1   (with dev tools network throttling to force load failure) → "Try Again" subtle pill, click retries
# 4. http://localhost:5173/bible/genesis/1   (happy path) → reader renders normally; ReaderChrome unchanged; chapter-mount effect fires (verify wr_chapters_visited and wr_bible_progress in localStorage).
```

Verify on each validation surface: translucent white background (`bg-white/[0.07]`), thin white border (`border-white/[0.12]`), white text, rounded-full pill shape. NO purple tint. Tab order: skip-link first (focus indicator with `bg-primary` shows on Tab from address bar), then primary CTA, then secondary link(s). Keyboard Enter on each CTA fires the action. Focus-visible ring renders on each CTA.

**Auth gating (if applicable):** Verify the manual eyeball checks pass logged-out (default state). No auth modal triggers on any of the four manual checks.

**Responsive behavior:**

- Desktop (1440px): All three validation surfaces render with subtle Button at content width inside max-w-md FrostedCard, vertically centered.
- Tablet (768px): Same.
- Mobile (375px): Same. Verify `min-h-[44px]` tap target by inspecting CTA height in dev tools.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- DO NOT update tests for CTA #3 if existing infrastructure can't easily mock `loadChapterWeb` per-test — defer and document in Execution Log.
- DO NOT modify any test file other than `BibleReader.test.tsx`.
- DO NOT skip the `git diff --stat` audit — it's the canonical Decision 13 boundary check.
- DO NOT skip the post-spec test baseline. We need to confirm no NEW failing test files vs Step 1.
- DO NOT commit, push, or run any branch-modifying git command. The user manages all git operations manually.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| All existing BibleReader.test.tsx tests | unit | Pass unchanged (the migration is element-only; behavioral assertions don't change). |
| 2–4 new chrome-class + role-query assertions | unit | Pass on first run. Mirror PlanBrowserEmptyState.test.tsx pattern. |
| Full `pnpm test --run` | unit + integration | Pass count = Step 1 baseline + new tests added in 6a. Fail count = Step 1 baseline exactly. NO new failing test files. |
| `pnpm typecheck` | tooling | Clean compile. |
| `pnpm lint` | tooling | No new warnings. |

**Expected state after completion:**

- [ ] All three CTA migrations land (Steps 3, 4, 5).
- [ ] Test assertions updated for CTAs #1 and #2 (+ optional CTA #3).
- [ ] `grep -n "bg-primary" frontend/src/pages/BibleReader.tsx` → 1 match (skip-link).
- [ ] `grep -rn "bg-primary" frontend/src/components/bible/reader/ | wc -l` → unchanged from Step 1 baseline.
- [ ] `git diff --stat` → only BibleReader.tsx and BibleReader.test.tsx modified.
- [ ] Spec 8B chapter-mount effect preserved.
- [ ] Skip-link preserved.
- [ ] Full regression: pass count = baseline + new tests; fail count = baseline; no new failing test files.
- [ ] Typecheck clean. Lint clean.
- [ ] Manual eyeball: all four surfaces (3 validation errors + 1 happy path) verified.
- [ ] All Spec 8A acceptance criteria checked off.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Pre-execution recon. Read-only. Establishes baseline. |
| 2 | 1 | Add Button import. Skipped if Step 1 finds Button already imported. |
| 3 | 2 | Migrate CTA #1 (book not found). Independent of CTAs #2, #3. |
| 4 | 2 | Migrate CTA #2 (chapter not found, asChild + Link). Independent of CTAs #1, #3. |
| 5 | 2 | Migrate CTA #3 (load error retry). Independent of CTAs #1, #2. |
| 6 | 3, 4, 5 | Tests + Decision 13 boundary audit + full regression. Must run last so all migrations land before grep audits. |

Steps 3, 4, 5 can theoretically run in any order or in parallel. Execute sequentially in the listed order for review clarity.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Pre-execution recon — verify line numbers, Button import status, test inventory, baselines | [COMPLETE] | 2026-05-05 | 4 bg-primary at 654/688/730/855 (exact match). Button not imported. Subtle chrome confirmed at Button.tsx:51–52,62. asChild via Children.only+cloneElement confirmed. No CTA #3 test. Reader-chrome baseline: 13 bg-primary matches. Test baseline: 9,539–9,540 pass / 2–3 fail (useFaithPoints deterministic + Navbar + useNotifications flaky). Typecheck clean. |
| 2 | Add Button import to BibleReader.tsx | [COMPLETE] | 2026-05-05 | Added `import { Button } from '@/components/ui/Button'` at line 34 after FrostedCard import. Unused-import TS6133 error expected at this intermediate state; resolves when Steps 3–5 use the import. |
| 3 | Migrate CTA #1 (book not found — "Browse books") | [COMPLETE] | 2026-05-05 | Replaced `<button>` at line 652–658 with `<Button variant="subtle" size="md" type="button">`. bg-primary removed from CTA #1. TypeScript clean. Surrounding card/link/handler unchanged. Tests deferred to Step 6. |
| 4 | Migrate CTA #2 (chapter not found — "Go to Chapter N", asChild + Link) | [COMPLETE] | 2026-05-05 | Replaced `<Link>` at lines 688–693 with `<Button variant="subtle" size="md" asChild><Link>...</Link></Button>`. Secondary "Browse books" button (text-white/50) and tertiary Back link untouched. TypeScript clean. Tests deferred to Step 6. |
| 5 | Migrate CTA #3 (chapter load failed — "Try Again") | [COMPLETE] | 2026-05-05 | Replaced `<button>` at lines 836–859 with `<Button variant="subtle" size="md" type="button">`. Complex onClick handler preserved byte-for-byte. Exactly 1 bg-primary match remains (skip-link, line 731). Spec 8B chapter-mount effect preserved (lines 597–598). TypeScript clean. Tests deferred to Step 6. |
| 6 | Update tests + Decision-13 boundary grep audit + full regression | [COMPLETE] | 2026-05-05 | Added 3 new tests (CTA #1 chrome, CTA #2 asChild semantics, CTA #3 load-error chrome). Refactored "invalid chapter has jump-to-last button" to role query + chrome assertions. CTA #3 test uses /bible/john/1 (mock returns null for john/1 → triggers load-error state naturally, no mock override needed). Decision-13 boundary grep: exactly 1 bg-primary remains (skip-link line 731). Full suite: 9,542 pass / 3 fail (all pre-existing). Typecheck clean. Playwright visual verification: Surface 1 (/bible/notabook/1) — Browse books button has rounded-full bg-white/[0.07] border-white/[0.12] YES. Surface 2 (/bible/john/99) — Go to Chapter 21 renders as <a> tag, href=/bible/john/21, no button ancestor, full subtle chrome YES. Surface 3 (/bible/genesis/1) — happy path, zero non-skip-link bg-primary CTAs. All checks pass. |
