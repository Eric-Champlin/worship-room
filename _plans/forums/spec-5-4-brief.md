/spec-forums spec-5-4

# Spec 5.4 — Animation Token Migration (BB-33 Compliance)

**Master plan ID:** `round3-phase05-spec04-animation-tokens`
**Size:** M
**Risk:** Low (per master plan; bumped to Low-Medium by Tailwind config interaction and token extension scope)
**Prerequisites:** 5.3 (2-Line Heading Treatment) ✅
**Tier:** High

---

## 1. Branch discipline (CRITICAL)

**You are on a long-lived working branch named `forums-wave-continued`. Stay on it.**

Eric handles all git operations manually. Claude Code MUST NEVER run any of the following commands in this session, in any phase (recon, plan, execute, verify, review):

- `git checkout`
- `git checkout -b`
- `git switch`
- `git switch -c`
- `git branch`
- `git commit`
- `git commit -am`
- `git push`
- `git stash`
- `git stash pop`
- `git reset` (any flag)
- `git rebase`
- `git cherry-pick`
- `git merge`
- `gh pr create`, `gh pr merge`, `glab mr create`, etc.

If Claude Code believes a git operation is needed, surface it as a recommendation and STOP. Eric will execute manually.

The only acceptable git tooling Claude Code may invoke is read-only inspection: `git status`, `git diff`, `git log --oneline`, `git blame`, `git show <sha>`.

**Note:** Unlike 5.2 and 5.3 (both closed as no-op shipped because Spec 14 absorbed the work), 5.4 is REAL source work. Recon confirmed ~16 Tailwind `duration-*` utility classes across 12 component files plus 5 animation-coupled `setTimeout` calls. This is mechanical pattern migration, not closure recognition.

---

## 2. Tier — High

**Why High (not Standard):**

- **Token mapping is non-trivial** (D1). Master plan listed `200ms` / `300ms` as grep targets; current tokens are 150 / 250 / 400. Direct mapping doesn't exist for 200, 300, or 600. The brief locks in a hybrid strategy (round Tailwind utilities, extend tokens for setTimeout). Standard tier sometimes rounds everything and ships visual regression.
- **Tailwind utility migration approach is a design call** (D2). Three valid paths (config aliases, CSS vars, inline style); each has trade-offs. Brief picks config aliases (cleanest). Standard tier sometimes picks whichever path the executor finds first.
- **Animation-coupled vs UI lifecycle setTimeout distinction** (D3). Some `setTimeout` calls drive animation timing (pulse, whisper, closing transitions); others are UI feedback timing (copy success, submit auto-close). The first category is in scope; the second is NOT. Standard tier sometimes tokenizes everything or nothing.
- **`prefers-reduced-motion` preservation** (W4) is load-bearing. The current `motion-safe:` Tailwind variant and per-component checks must survive migration. Easy to break if Tailwind config is edited carelessly.
- **Token extension to animation.ts itself** (D4) means modifying a shared constants file. Standard tier sometimes adds tokens without considering downstream consumers outside Prayer Wall.
- **BB-33 compliance interpretation** (MPD-5). The spec title references it but the brief treats it as an internal label without verified specifics. Plan recon should confirm.
- Visual regression risk — even "rounding" 200→250 across 16 utilities can subtly change feel.

**Why not xHigh:**

- No new architecture; tokens file already exists
- No schema, no backend, no novel coordination
- The migration is mechanical pattern application after design decisions are settled
- Brief covers all decisions and watch-fors explicitly
- Scope is bounded to `frontend/src/components/prayer-wall/` plus animation.ts and tailwind.config

**Override moments — when to bump to MAX:**

- During /plan or /execute, if CC tokenizes UI lifecycle setTimeouts (W7 / D3 violation)
- If CC rounds animation-coupled timing (300ms PrayerCard pulse → 400ms slow) producing visual regression on the pulse feel (W5)
- If CC breaks `prefers-reduced-motion` by removing `motion-safe:` variants (W4)
- If CC modifies setTimeout calls in test files (W6 violation)
- If CC adds tokens to animation.ts but doesn't update tailwind.config consumers (D2 violation)
- If CC ships without verifying Lighthouse Performance 90+ on Prayer Wall pages (W12 / AC #4)

---

## 3. Visual verification — REQUIRED

**Run `/verify-with-playwright` after `/code-review` passes.**

This is a refactor with expected visual-and-temporal parity. The user should not feel anything different about animation timing or transition smoothness.

Verification surface:

1. **Tailwind `duration-*` utilities migrated to token aliases**:
   - All `duration-200` / `duration-300` instances across the 12 components now use `duration-fast` / `duration-base` / `duration-slow` (or whatever the tailwind.config aliases are named per D2)
   - Hover transitions on pills, cards, buttons still feel the same
   - `transition-all duration-* ease-*` patterns preserved as composition

2. **Animation-coupled setTimeout values use named tokens**:
   - `PrayerCard.tsx:62` — pulse animation cleanup at `DURATION_MS.pulse` (300ms)
   - `InteractionBar.tsx:90-92` — whisper-pulse cleanup at `DURATION_MS.ceremony` (600ms)
   - `DeletePrayerDialog.tsx`, `AuthModal.tsx`, `ReportDialog.tsx` closing transitions use named tokens (likely `DURATION_MS.base` or `slow` per D4 mapping)

3. **UI lifecycle setTimeout values UNCHANGED** (W7):
   - `ShareDropdown.tsx:125` — copy success duration (2000ms) STAYS as raw value
   - `ReportDialog.tsx:101` — submit auto-close (likely 1500-2000ms) STAYS as raw value
   - These are feedback durations, not animation; tokenizing them confuses two concerns

4. **`prefers-reduced-motion` still works** (W4):
   - System reduced-motion toggle disables `motion-safe:animate-card-pulse` per existing pattern
   - Tailwind `motion-safe:` and `motion-reduce:` variants survive the migration
   - The global `0.01ms` reduced-motion technique (referenced in `ComposerChooser.tsx:36` comment) continues to function

5. **`tailwind.config.{ts,js}` extends duration tokens**:
   - Plan recon confirms config file location and current shape
   - Config adds duration aliases consuming `DURATION_MS` from `constants/animation.ts`
   - Naming convention: `fast` / `base` / `slow` plus new `pulse` / `ceremony` (per D2 / D4)
   - Config import is type-safe (no string duplication)

6. **`constants/animation.ts` extended with new tokens**:
   - Existing tokens unchanged: `instant: 0`, `fast: 150`, `base: 250`, `slow: 400`
   - New tokens added: `pulse: 300`, `ceremony: 600` (or whatever D4 settles on)
   - Existing EASING tokens unchanged
   - Type exports updated if needed

7. **`cubic-bezier(` count in components/prayer-wall/ remains zero**:
   - Already 0 per recon
   - Migration should NOT introduce any (verify post-migration grep)

8. **No regression on visual interactions**:
   - All hover states still feel responsive (no perceptible slowdown)
   - Card pulse animation still fires on prayer count tick (PrayerCard pulse)
   - Whisper sound + pulse still coordinated (InteractionBar)
   - Dialog open/close transitions still smooth (Auth, Report, Delete dialogs)
   - Composer reveal/collapse transitions still smooth (InlineComposer, ComposerChooser, QotdComposer, CommentsSection, SaveToPrayersForm)

9. **Lighthouse Performance score on Prayer Wall pages remains 90+** (AC #4):
   - Run Lighthouse on `/prayer-wall`, `/prayer-wall/dashboard`, `/prayer-wall/profile/[id]`, `/prayer/[id]`
   - Performance score 90 or higher on each
   - Animation-related metrics (CLS, INP) unchanged or improved

10. **No hardcoded animation ms in Prayer Wall components** (AC #1 — reinterpreted per MPD-1):
    - Grep `frontend/src/components/prayer-wall/*.tsx` (excluding `__tests__/`) for `duration-\d` returns ZERO matches
    - Grep same scope for `setTimeout(.*, \d+)` returns ONLY matches that are UI lifecycle (per D3 / W7); animation-coupled setTimeouts all use named tokens

11. **Existing tests pass**:
    - Component tests for the 12 affected files pass without modification
    - Test files NOT migrated; `vi.advanceTimersByTime(N)` calls stay as raw numbers (W6)
    - `__tests__/ComposerChooser.test.tsx:164` assertion `expect(dialog.className).toContain('transition-[transform,opacity]')` may need update if Tailwind classes change form

12. **`/verify-with-playwright` exercises animation surfaces**:
    - Prayer card click → pulse animation visible
    - Whisper interaction → coordinated pulse + sound
    - Dialog open/close → smooth transitions
    - Composer reveal → smooth grow/collapse
    - Pill hover → fast color change (no jank)

Minimum 12 Playwright scenarios.

<!-- CHUNK_BOUNDARY_1 -->

---

## 4. Master Plan Divergence

Master plan body for 5.4 lives at `_forums_master_plan/round3-master-plan.md` lines ~4686–4706. Several drift items.

### MPD-1 — AC #1 reinterpreted: "no hardcoded ms" scoped to animation contexts only

Master plan body AC #1 says:

> No hardcoded `ms` durations in Prayer Wall component files

Literal reading: every `setTimeout(fn, 2000)` for copy success or submit auto-close is a violation. That conflates two distinct concerns:

1. **Animation timing** — transitions, pulses, CSS animations. These benefit from token consistency (visual hierarchy across the app).
2. **UI feedback duration** — how long the "Copied!" message stays visible. This is UX timing per surface; tokenizing it across the app would homogenize feedback durations that should vary by content (a toast vs a copy confirmation).

**Brief scopes AC #1 to animation contexts only** (D3 / W7). UI lifecycle setTimeouts stay as raw values. The grep verification clause is rewritten:

> Grep `frontend/src/components/prayer-wall/*.tsx` (excluding `__tests__/`) for `setTimeout(.*, \d+)` returns ONLY UI-lifecycle matches (copy success, submit auto-close); all animation-coupled setTimeouts use named `DURATION_MS.*` tokens.

Plan recon enumerates each setTimeout call and categorizes (D3 table).

### MPD-2 — AC #3 reinterpreted: "import from animation.ts" doesn't mean every consumer imports literally

Master plan body AC #3 says:

> All animations import from `constants/animation.ts`

Literal reading: every component that uses a `duration-200` Tailwind class must `import { DURATION_MS } from '@/constants/animation'`. That's awkward because Tailwind utilities are class strings, not values.

**Brief reinterprets**: the SOURCE OF TRUTH is `constants/animation.ts`. Tailwind utilities consume this source via `tailwind.config.{ts,js}` extending duration aliases (D2). Components use named utility classes (`duration-fast`, `duration-base`, `duration-slow`) which resolve to the same source values. Animation-coupled setTimeouts DO literally import from `constants/animation.ts`.

Net effect: single source of truth, two consumption paths (Tailwind config alias vs TS import), AC #3's intent satisfied without forcing literal imports in every component.

### MPD-3 — Token mapping doesn't exist for 200, 300, 600

Master plan body lists `200ms`, `300ms` as grep targets but current tokens are 150 / 250 / 400. The 600ms value (InteractionBar whisper) isn't even in the master plan grep targets but exists in source.

**Brief's hybrid mapping** (D1):

- Tailwind `duration-200` → `duration-base` (250ms, +50ms rounding; imperceptible for hover transitions)
- Tailwind `duration-300` → `duration-slow` (400ms, +100ms rounding; noticeable for visual transitions like reveal/collapse)
- Animation-coupled setTimeout 300 (PrayerCard pulse) → new `DURATION_MS.pulse` (300ms, exact)
- Animation-coupled setTimeout 600 (InteractionBar whisper) → new `DURATION_MS.ceremony` (600ms, exact)
- Closing-transition setTimeouts (Auth/Report/Delete dialogs) → plan recon verifies values; most likely 200ms (rounded to `base`) or 300ms (rounded to `slow` OR using new `pulse` if exact preservation matters)

**Rounding trade-off**: 200→250 is imperceptible. 300→400 is noticeable on visual transitions but not jarring. Animation-coupled setTimeouts MUST preserve exact timing because they pair with CSS animation duration; tokenizing 300→slow (400) would desync the pulse class removal from the animation completion.

The new tokens `pulse: 300` and `ceremony: 600` extend animation.ts (D4). Existing tokens unchanged.

### MPD-4 — `transition-duration` / `animation-duration` weren't found by recon

Master plan body lists these as grep targets. Recon for explicit `transition-duration:` or `animation-duration:` CSS-in-JS strings in components/prayer-wall/ returned 0 matches. These targets are vestigial — the codebase uses Tailwind utility classes (`duration-N`), not explicit CSS property assignments. AC items mentioning these can be considered satisfied by absence.

### MPD-5 — BB-33 reference is an internal compliance label

Master plan body title: "Animation Token Migration (BB-33 Compliance)". Recon for `BB-33` across `/Users/eric.champlin/worship-room/` returned 200+ matches but mostly in CLAUDE.md, audits, and recon docs without clarifying surrounding context. The brief treats BB-33 as an internal compliance/standards reference — likely a Worship Room internal ticket or rule ID.

**Plan recon clarifies BB-33** by reading the relevant CLAUDE.md section or the `.claude/rules/` files. If BB-33 specifies particular tokens or naming conventions beyond what this brief assumes, the planner updates accordingly. If BB-33 is just a generic "use canonical tokens" reference, this brief satisfies it.

### MPD-6 — Files-to-modify list is incomplete

Master plan body says:

> Files to modify: All files in `frontend/src/components/prayer-wall/` matching the grep

But the migration also requires touching:

- `frontend/src/constants/animation.ts` (token extension per D4)
- `frontend/tailwind.config.{ts,js}` (alias extension per D2)

These are NOT in `components/prayer-wall/` but ARE in scope. Brief makes this explicit (Section 10).

<!-- CHUNK_BOUNDARY_2 -->

---

## 5. Recon Ground Truth (2026-05-11)

Verified on disk at `/Users/eric.champlin/worship-room/`.

### R1 — animation.ts current state

`frontend/src/constants/animation.ts`:

```typescript
/** Canonical animation duration tokens (ms). All standard UI animations must use these. */
export const DURATION_MS = {
  instant: 0,
  fast: 150,
  base: 250,
  slow: 400,
} as const

/** Canonical animation easing tokens. Match Material Design standard curves. */
export const EASING = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
} as const
```

Plus two additional exports (likely type exports for `DurationMs` and `Easing`). Plan recon confirms.

### R2 — Tailwind `duration-*` utility count

Recon-grep on `frontend/src/components/prayer-wall/*.tsx` for `duration-` returned ~16 matches across 12 component files:

- `InlineComposer.tsx` (2 instances at lines 389, 524)
- `CategoryBadge.tsx` (1 instance at line 18)
- `RoomSelector.tsx` (1 instance at line 96)
- `WaysToHelpPicker.tsx` (1 instance at line 64)
- `QotdComposer.tsx` (1 instance at line 69)
- `InteractionBar.tsx` (1 instance at line 49)
- `ComposerChooser.tsx` (2 instances at lines 68, 116)
- `CommentsSection.tsx` (1 instance at line 58)
- `CategoryFilterBar.tsx` (3 instances at lines 72, 92, 115)
- `SaveToPrayersForm.tsx` (1 instance at line 60)
- `CommentInput.tsx` (1 instance at line 55)

**Search snippets truncated the exact duration values.** Plan recon reads each file and confirms the actual N in `duration-N`. Most are likely `duration-200` (Tailwind default-ish), some `duration-300`. The brief assumes both values exist; if only one is found, the migration is simpler.

One test file reference: `__tests__/ComposerChooser.test.tsx:165` has an assertion that includes `duration-` — likely asserting on class composition. May need update if Tailwind class names change form.

### R3 — setTimeout call inventory in source files

Recon-grep on `frontend/src/components/prayer-wall/*.tsx` (excluding `__tests__/`) for `setTimeout(`:

| File | Line | Value | Category | In scope? |
| ---- | ---- | ----- | -------- | --------- |
| PrayerCard.tsx | 62 | 300ms | Animation-coupled (after `motion-safe:animate-card-pulse` class added) | YES |
| InteractionBar.tsx | 90-92 | 600ms | Animation-coupled (after `playSoundEffect('whisper')` + `triggerPulse?.()`) | YES |
| DeletePrayerDialog.tsx | 24 | ? | Closing transition (after `setIsClosing(true)`) | YES |
| AuthModal.tsx | 89 | ? | Closing transition | YES |
| ReportDialog.tsx | 60 | ? | Closing transition | YES |
| ShareDropdown.tsx | 125 | ? (likely 2000ms) | UI feedback (after `setCopied(true)`) | NO (W7) |
| ReportDialog.tsx | 101 | ? (likely 1500-2000ms) | UI feedback (after `setSubmitted(true)`) | NO (W7) |
| ScriptureReferenceInput.tsx | 68 | (no fixed value visible; lookup debounce timing) | Possibly NOT animation; verify | TBD |

**Plan recon reads each setTimeout's full context** and confirms the duration value. The closing-transition dialogs (Delete, Auth, Report) likely all use the same value matching their CSS transition duration. The ScriptureReferenceInput debounce is probably a fixed value coupled to the input debounce — likely NOT animation, so NOT in scope, but plan verifies.

### R4 — cubic-bezier presence

Recon-grep on `frontend/src/components/prayer-wall/` for `cubic-bezier(` returned 0 matches. Already clean (Spec 14 era cleanup). AC for `cubic-bezier` is satisfied by absence.

### R5 — transition-duration / animation-duration presence

Not recon'd literally during brief authorship, but expected to be 0 matches based on R2 finding (Tailwind utilities are the convention, not explicit CSS-in-JS). Plan recon confirms.

### R6 — tailwind.config.{ts,js} location

Not recon'd during brief authorship. Plan recon identifies whether config is `.ts` or `.js`, its current shape, and where duration tokens should be added.

Most likely structure:

```typescript
// tailwind.config.ts (expected)
import type { Config } from 'tailwindcss'
import { DURATION_MS } from './src/constants/animation'

export default {
  // ...
  theme: {
    extend: {
      // ...
      transitionDuration: {
        fast: `${DURATION_MS.fast}ms`,
        base: `${DURATION_MS.base}ms`,
        slow: `${DURATION_MS.slow}ms`,
        pulse: `${DURATION_MS.pulse}ms`,   // new
        ceremony: `${DURATION_MS.ceremony}ms`, // new
      },
    },
  },
} satisfies Config
```

Plan recon confirms file location, existing structure, and whether the import path needs adjustment.

### R7 — `prefers-reduced-motion` patterns in source

Recon found:

- `PrayerCard.tsx:60` — `el.classList.add('motion-safe:animate-card-pulse')` (Tailwind `motion-safe:` variant)
- `ComposerChooser.tsx:36` — code comment referencing the global `0.01ms` reduced-motion technique

The `motion-safe:` Tailwind variant is automatically gated on `prefers-reduced-motion: no-preference`. The migration preserves these patterns intact.

**Watch (W4)**: if tailwind.config edits accidentally remove the `motion-safe` or `motion-reduce` variant configuration, accessibility regresses. Plan recon verifies current variant config and preserves it.

### R8 — Tailwind config import constraints

Tailwind config runs at build time. If it imports from `constants/animation.ts` (TS source), the build tooling must support TS in config files. Most likely viable (Tailwind v3+ supports TS configs natively), but plan recon verifies by checking `package.json` Tailwind version and existing config file extension.

If TS imports in tailwind.config don't work in the project's setup, fallback option: duplicate the values in tailwind.config with a comment pointing to the canonical source. Less clean but functional.

### R9 — Existing component tests with timing assertions

Recon found one assertion that may need update:

- `__tests__/ComposerChooser.test.tsx:164-165` — asserts `expect(dialog.className).toContain('transition-[transform,opacity]')` followed by what appears to be a duration class assertion

Plan recon reads the full assertion and updates the expected class string if the migration changes the class form (e.g., `duration-300` → `duration-slow`).

Other test files in `components/prayer-wall/__tests__/` contain `vi.advanceTimersByTime(N)` calls with raw numbers (PrayCeremony, ScriptureReferenceInput, ComposerChooser). These are TEST CODE describing time passage, NOT source animation values. They stay as raw numbers (W6).

### R10 — Pre-existing token consumers outside Prayer Wall

Plan recon greps `frontend/src/` (excluding `components/prayer-wall/`) for `DURATION_MS` and `EASING` imports. This catalog matters for D4 (token extension):

- If `pulse: 300` and `ceremony: 600` names are already taken by other consumers (different meanings), pick different names
- If existing tokens are widely consumed, the migration shouldn't break their callers

Most likely: tokens are consumed in ~5-15 places across the codebase (other components, utility hooks). Adding new tokens is safe; modifying existing is risky. Brief assumes existing tokens stay unchanged.

### R11 — BB-33 reference — unverified

Search for `BB-33` returned 200+ matches but tool truncation made surrounding context unreadable. Locations include:

- `CLAUDE.md` lines 29, 79, 123
- `_audits/2026-04-28-doc-reality-proposed-edits.md` (referencing CLAUDE.md content)
- `_plans/recon/grow-2026-05-04.md:502`
- Multiple other files

Plan recon clarifies BB-33's actual meaning by:

1. Opening `CLAUDE.md` around the BB-33 references and reading surrounding text
2. Checking `.claude/rules/` for a file matching `BB-33` or `bb-33` naming
3. Searching `_audits/` for the canonical BB-33 definition

If BB-33 specifies particular tokens, naming conventions, or migration order beyond this brief's assumptions, plan adjusts accordingly. If BB-33 is just a generic compliance reference, brief's approach satisfies it as-is.

<!-- CHUNK_BOUNDARY_3 -->

---

## 6. Phase 3 Execution Reality Addendum gates — applicability

5.4 is pure-frontend visual refactor. None of the Phase 3 backend gates apply.

| # | Gate | Applies to 5.4? |
| - | ---- | --- |
| 1-13 | All Phase 3 backend gates | N/A |
| 17 | Universal Rule 17 axe-core (from 4.8) | Indirect — migration must not introduce new accessibility violations |
| 18 | Visual parity gate (from 5.1) | Applies — visual-temporal parity is the primary deliverable |
| 19 | Brand voice gate (from 5.3) | N/A — no new copy |

**New addendum gate introduced by 5.4:**

**Gate 20: `prefers-reduced-motion` preservation gate.** The `motion-safe:` / `motion-reduce:` Tailwind variant configuration must survive migration. Verify via:

- DevTools toggle reduced-motion ON → PrayerCard pulse animation disabled
- DevTools toggle reduced-motion OFF → PrayerCard pulse animation enabled
- ComposerChooser open/close still respects the global `0.01ms` reduced-motion technique

**Gate 21: Lighthouse Performance gate.** Per master plan AC #4. Lighthouse Performance score 90+ on `/prayer-wall`, `/prayer-wall/dashboard`, `/prayer-wall/profile/[id]`, `/prayer/[id]`. If score drops below 90 post-migration, investigation required before merge.

---

## 7. Decisions and divergences

### D1 — Hybrid token mapping: round Tailwind utilities; preserve animation-coupled timing

Per MPD-3. The migration uses two strategies depending on context:

**Tailwind utility migration — round to existing tokens:**

| Source value | Target token | Token ms | Delta | Perceptible? |
| ------------ | ------------ | -------- | ----- | ------------ |
| `duration-200` | `duration-base` | 250 | +50ms | No (hover/transition feel) |
| `duration-300` | `duration-slow` | 400 | +100ms | Slight (reveal/collapse) |
| `duration-150` (if any) | `duration-fast` | 150 | 0ms | Exact |

**setTimeout migration — preserve exact timing via new tokens:**

| Source value | Target token (new) | Token ms | Rationale |
| ------------ | ------------------ | -------- | --------- |
| `setTimeout(_, 300)` PrayerCard pulse | `DURATION_MS.pulse` | 300 (exact) | Must match CSS animation duration; tokenizing to 400 would desync |
| `setTimeout(_, 600)` InteractionBar whisper | `DURATION_MS.ceremony` | 600 (exact) | Coordinates with sound effect timing; rounding breaks coordination |
| `setTimeout(_, ?)` dialog closings | per plan recon | TBD | Plan reads actual values; if 200 → base, if 300 → slow, if exact preservation matters → new token |

**Why hybrid over uniform:** Tailwind utilities drive visual transitions where ±100ms is rarely noticed. SetTimeout calls coordinate with discrete animations or sound effects where timing offsets break the feel.

If plan recon discovers that 300ms Tailwind utilities are NOT rare and the +100ms rounding feels off on critical surfaces (e.g., dialog reveal), the planner can propose using new `pulse` token for `duration-pulse` as well. Eric reviews before execute.

### D2 — Tailwind config aliases as the migration mechanism

Per MPD-2. The Tailwind utility classes consume tokens via `tailwind.config.{ts,js}` extending `transitionDuration`:

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'
import { DURATION_MS } from './src/constants/animation'

export default {
  // ... existing config
  theme: {
    extend: {
      // ... existing extends
      transitionDuration: {
        fast: `${DURATION_MS.fast}ms`,
        base: `${DURATION_MS.base}ms`,
        slow: `${DURATION_MS.slow}ms`,
        pulse: `${DURATION_MS.pulse}ms`,
        ceremony: `${DURATION_MS.ceremony}ms`,
      },
    },
  },
} satisfies Config
```

Components use `duration-fast`, `duration-base`, `duration-slow`, `duration-pulse`, `duration-ceremony` as utility classes. Tailwind generates the CSS at build time.

**Why this approach over CSS variables:**

- No runtime cost (compile-time substitution)
- Single source of truth (`DURATION_MS` in TS)
- Matches Tailwind idiom (extend theme; use utility classes)
- Type-safe at the source
- No `style={{}}` props cluttering components

**Why this over inline style:**

- Tailwind composition pattern preserved (`cn()` continues to work)
- No regression on existing class strings (they just resolve to the same values)
- Visual review easier (class names self-document the timing tier)

**Fallback if TS import in tailwind.config doesn't work** (R8): duplicate values in tailwind.config with a comment pointing to the canonical source. Acceptable but uglier. Plan recon picks the cleanest viable path.

### D3 — Animation-coupled vs UI-lifecycle setTimeout: scope to animation only

Per MPD-1 / W7. The migration tokenizes ONLY animation-coupled setTimeouts. UI lifecycle setTimeouts stay as raw values.

**Animation-coupled (in scope):**

- Pulse animation cleanup (PrayerCard 300ms)
- Sound-effect-coordinated pulse (InteractionBar 600ms)
- Dialog closing transitions (Auth, Report, Delete — plan verifies values)

**UI lifecycle (OUT of scope):**

- Copy success message clear (ShareDropdown ~2000ms)
- Submit confirmation auto-close (ReportDialog post-submit ~1500-2000ms)
- Scripture lookup debounce (ScriptureReferenceInput — verify by plan; if it's debounce timing not animation, OUT of scope)

**The test:** is the setTimeout value coordinated with a CSS animation duration or audio effect duration? If yes, tokenize. If it's just "how long should this feedback be visible" or "how long to wait before debounce," leave it raw.

**Why not tokenize everything?** UI feedback durations are per-surface UX decisions, not consistent across an app. The 2000ms "Copied!" message and a 1500ms toast aren't the same concern; they should be tunable independently. Tokenizing them forces homogenization of unrelated UX timing.

### D4 — Token extension: add `pulse: 300` and `ceremony: 600`

New tokens added to `constants/animation.ts`:

```typescript
export const DURATION_MS = {
  instant: 0,
  fast: 150,
  base: 250,
  slow: 400,
  pulse: 300,    // new — PrayerCard pulse animation
  ceremony: 600, // new — InteractionBar whisper-pulse coordination
} as const
```

**Naming rationale:**

- `pulse` names a specific UI behavior (the prayer-card pulse on tick). Used in PrayerCard.tsx setTimeout AND potentially the Tailwind config (if `duration-300` rounds-up feels off, can switch to `duration-pulse`).
- `ceremony` names a longer ritual-feeling timing for the whisper interaction. Used in InteractionBar.tsx setTimeout.

**Alternative names considered:**

- `medium: 300` — too generic; doesn't communicate purpose. Rejected.
- `accent: 300` — conflicts with `variant="accent"` semantics. Rejected.
- `ritual: 600` — too on-the-nose religious framing. Rejected (Worship Room avoids overtly religious noun-coding).

**Risk of breakage** (R10): if other consumers of `DURATION_MS` outside Prayer Wall already use `pulse` or `ceremony` keys with different meanings, conflict. Plan recon verifies. Most likely safe.

### D5 — EASING tokens not touched

The master plan body lists `cubic-bezier(` as a grep target. Recon found 0 matches in `components/prayer-wall/`. EASING tokens in animation.ts (standard / decelerate / accelerate / sharp) already exist but aren't consumed in Prayer Wall components.

**Brief's scope:** 5.4 does NOT add new easing tokens or migrate any easing values. The EASING tokens stay as-is.

If plan recon discovers Tailwind `ease-*` utilities with non-standard easings (e.g., `ease-[cubic-bezier(...)]`), surface as a follow-up but don't migrate in 5.4.

### D6 — Test files NOT migrated

Per R9. Test files in `components/prayer-wall/__tests__/` use raw ms values in `vi.advanceTimersByTime(N)` and timing-related test setup. These describe TEST timing, not source animation values. They stay as raw numbers.

Exception: if a test asserts on a class name that changes (e.g., `expect(className).toContain('duration-300')` becomes invalid after migration), update the assertion to match the new class form. This is test maintenance, not migration.

One known assertion to verify: `__tests__/ComposerChooser.test.tsx:164-165` may have a duration assertion.

### D7 — Migration order

Recommended sequence (mechanical; each step is a logical commit):

1. **Extend `constants/animation.ts`** with `pulse: 300` and `ceremony: 600` (D4). Tests for animation.ts (if any) verify new tokens.
2. **Extend `tailwind.config.{ts,js}`** with duration aliases consuming the tokens (D2). Verify build still passes.
3. **Migrate Tailwind utilities** across the 12 components from `duration-200` → `duration-base`, `duration-300` → `duration-slow` (D1). One commit per component OR one commit for all (Eric's call).
4. **Migrate animation-coupled setTimeouts** in PrayerCard, InteractionBar, and the 3 closing-transition dialogs (D3). Import `DURATION_MS` from animation.ts, replace raw ms.
5. **Run test suite** — component tests should pass without modification; update the one ComposerChooser assertion if needed.
6. **Run Lighthouse** on Prayer Wall pages, verify Performance 90+ (Gate 21).
7. **Manual visual review** — Eric checks pulse, whisper, dialog transitions, hover states.

### D8 — NO visual regression test infrastructure setup

Per 5.1 D9 / 5.3 D10. 5.4 inherits the manual-visual-review approach. No screenshot baselines.

### D9 — Scope strictly bounded to `components/prayer-wall/` + animation.ts + tailwind.config

Per MPD-6. Files modified:

- ~12 files in `components/prayer-wall/` (Tailwind utility migrations)
- 5 files in `components/prayer-wall/` for setTimeout migrations (PrayerCard, InteractionBar, AuthModal, ReportDialog, DeletePrayerDialog)
- `frontend/src/constants/animation.ts` (token extension)
- `frontend/tailwind.config.{ts,js}` (alias extension)

Files NOT modified:

- Test files (W6)
- Other source files outside Prayer Wall (master plan's literal scope)
- Pages files (`PrayerWallDashboard.tsx`, `PrayerWall.tsx`, `PrayerDetail.tsx`, `PrayerWallProfile.tsx`) — not in master plan's scope; if they have Tailwind `duration-*` utilities, file follow-up for 5.5 or a future spec
- Other components in the codebase that use `DURATION_MS` (R10) — unchanged unless plan recon discovers a conflict

<!-- CHUNK_BOUNDARY_4 -->

---

## 8. Watch-fors

### W1 — 5.3 must be ✅ before 5.4 starts

Verify spec-tracker.md shows 5.3 ✅. If 5.3 is still ⬜, complete that first.

### W2 — Don't round animation-coupled setTimeouts to existing tokens

Per D1 / D3. The 300ms PrayerCard pulse and 600ms InteractionBar whisper MUST preserve exact timing. Rounding them to existing tokens (300→slow=400, 600→? no equivalent) breaks animation coordination.

If CC tries to map `setTimeout(_, 300)` to `setTimeout(_, DURATION_MS.slow)` because 300 isn't a token name yet, reject. Add the `pulse` token first (D4), then use `DURATION_MS.pulse`.

### W3 — Don't introduce new `cubic-bezier(` strings

Recon confirmed 0 matches in `components/prayer-wall/`. Migration should NOT introduce any. If CC inlines a cubic-bezier as part of a transition definition, use existing EASING tokens or, if a specific easing is needed, add to EASING (with Eric's review).

### W4 — Don't break `prefers-reduced-motion`

Per R7. The `motion-safe:` and `motion-reduce:` Tailwind variants must continue to work. If tailwind.config edits accidentally:

- Remove the `screens` or `variants` config that defines `motion-safe`
- Override the default `prefers-reduced-motion` media query
- Change the `motion-safe:animate-card-pulse` class to a non-variant form

...accessibility regresses. Plan recon verifies current variant config before editing tailwind.config.

**Verification:** DevTools → Rendering tab → Emulate CSS prefers-reduced-motion: reduce → PrayerCard pulse should NOT animate.

### W5 — Don't ship visual regression on pulse / whisper feel

The PrayerCard pulse at 300ms and InteractionBar whisper at 600ms are sensitive to exact timing. If CC rounds them to `slow` (400ms) or any other token that desyncs from the paired CSS animation / sound effect, the user notices.

Manual visual review must check:

- PrayerCard pulse cleanly completes its animation arc before class is removed
- InteractionBar whisper sound effect fully plays before the pulse class is removed

If either feels "cut short" or "lingers," the migration broke timing.

### W6 — Don't migrate test files

Per D6. Test files in `components/prayer-wall/__tests__/` use raw ms values in `vi.advanceTimersByTime(N)`. These are TEST CODE describing time passage. They stay as raw numbers.

If CC migrates `vi.advanceTimersByTime(600)` to `vi.advanceTimersByTime(DURATION_MS.ceremony)`, reject. Tests describe expected wall-clock progression; tokens describe canonical UI timing. The two are correlated but not coupled.

Exception: class-string assertions that depend on Tailwind class form may need updates (e.g., `expect(className).toContain('duration-300')` → `expect(className).toContain('duration-slow')`). This is test maintenance, NOT scope violation.

### W7 — Don't tokenize UI lifecycle setTimeouts

Per D3 / MPD-1. The 2000ms copy success in ShareDropdown and the submit auto-close in ReportDialog stay as raw values. They're UX feedback timing, not animation.

If CC creates a new `DURATION_MS.feedback` or `DURATION_MS.success` token to tokenize them, reject — that homogenizes feedback timing across surfaces that should be independently tunable.

If in the future Worship Room introduces a global notification system with consistent feedback timing, THAT system would justify a `feedback: N` token. Not now.

### W8 — Don't migrate Scripture lookup debounce (if it's debounce, not animation)

Per R3. `ScriptureReferenceInput.tsx:68` has a `setTimeout(`. Plan recon verifies whether this is debounce timing (input → lookup delay) or animation. If debounce, leave as raw value. If animation-coupled, tokenize.

Most likely: debounce. Probably ~300-500ms. Leave raw.

### W9 — Don't modify EASING tokens

Per D5. Existing EASING tokens (standard / decelerate / accelerate / sharp) stay as-is. 5.4 is about durations, not curves.

If CC adds new easing tokens or changes existing ones, reject. Easing migration is a separate concern.

### W10 — Don't migrate files outside `components/prayer-wall/` or the 2 config files

Per D9. The migration scope is bounded. Pages files, other component directories, hooks, utilities — all out of scope.

If plan recon discovers Tailwind `duration-*` utilities in `pages/PrayerWallDashboard.tsx` (a likely candidate), file as follow-up for 5.5 or a future spec. Don't fold in.

### W11 — Don't break TS imports in tailwind.config

Per R8. If `tailwind.config.ts` (or `.js`) imports from `./src/constants/animation`, the build tooling must support it. Most projects do, but if the existing config doesn't import any TS sources, this is the first time.

Verification: `npm run build` (or `pnpm build`) succeeds after the edit. If it doesn't, fall back to duplicating values with a comment.

### W12 — Don't ship without verifying Lighthouse Performance 90+

Per AC #4. Animation token changes shouldn't affect Performance score (no new JS, no new CSS bloat), but verify. If score drops below 90, investigate before merge.

Likely cause of regression: accidental introduction of large CSS via Tailwind config (e.g., extending `transitionDuration` with 50 keys when 5 suffice). Plan recon picks minimal token set.

### W13 — Don't introduce new dependencies

5.4 is pure refactor. No new npm packages.

### W14 — Don't relocate animation.ts or rename tokens

The canonical path is `frontend/src/constants/animation.ts`. The canonical token names are `DURATION_MS` and `EASING` (per R1). Don't rename to `ANIMATION_DURATION` or move to `frontend/src/tokens/`.

### W15 — Don't change component public APIs

Migrating internal animation tokens does NOT change component props. If `<PrayerCard prayer={p} ... />` props are unchanged, they stay unchanged.

If CC adds new props for animation timing (e.g., `<PrayerCard pulseDuration={...} />`), reject. Timing comes from the canonical token, not per-instance configuration.

### W16 — Don't preempt Spec 5.5 (Deprecated Pattern Purge — remainder)

5.5 cleans up remaining deprecated patterns across Prayer Wall. If 5.4's migration touches a file with deprecated chrome patterns (e.g., inline frosted strings post-5.1 in `pages/PrayerWallDashboard.tsx:722`), don't "fix them along the way." Stay scoped.

### W17 — Don't introduce TypeScript errors

If `pulse` and `ceremony` tokens conflict with existing type exports (e.g., a `Duration = 'fast' | 'base' | 'slow'` literal type elsewhere), TypeScript compilation fails. Plan recon checks consumers of `DURATION_MS` types and updates them if a typed exhaustive list exists.

If CC bypasses with `as any`, reject.

### W18 — Don't change the `0.01ms` reduced-motion technique reference

Per R7. `ComposerChooser.tsx:36` has a code comment referencing the global `0.01ms` reduced-motion technique. The technique is a CSS-level pattern (setting all transitions to 0.01ms for users with reduced-motion preference). 5.4 does NOT migrate or alter this.

The `0.01ms` value isn't a candidate for tokenization — it's a CSS technique, not a UI animation duration.

### W19 — Don't fold pages-level inline patterns into 5.4

If plan recon discovers `pages/PrayerWallDashboard.tsx:722` has an inline frosted pattern (`rounded-xl border border-white/10 bg-white/[0.06] p-5`), file follow-up for 5.5. Don't migrate as part of 5.4. That's chrome, not animation.

### W20 — Don't add `instant` token usage

The existing `DURATION_MS.instant: 0` is a special token for cases where animation needs to be programmatically disabled (e.g., during testing or for users who explicitly opted out). 5.4 doesn't migrate any value TO `instant` — there's no current 0ms hardcoded value in Prayer Wall components.

If CC uses `DURATION_MS.instant` for places that should be `fast` (150ms), reject. Different intents.

---

## 9. Test specifications

Target: ~5-8 tests (small surface; migration is mechanical with expected behavioral parity).

### New tests

**`frontend/src/constants/__tests__/animation.test.ts`** (UPDATE if exists; CREATE if not — ~2 tests):

- All 6 DURATION_MS tokens exist with correct values (instant=0, fast=150, base=250, slow=400, pulse=300, ceremony=600)
- All 4 EASING tokens exist and unchanged

### Updated tests

**`frontend/src/components/prayer-wall/__tests__/ComposerChooser.test.tsx`** (potentially 1-2 update):

- Line 164-165 assertion `expect(dialog.className).toContain('duration-300')` (or similar) updates to match new Tailwind class form after migration

**Other component tests** (no required changes):

- PrayerCard.test.tsx, InteractionBar.test.tsx, AuthModal.test.tsx, ReportDialog.test.tsx, DeletePrayerDialog.test.tsx — if any have setTimeout-related assertions that depend on raw values, they may need updates. Plan recon checks.

### Manual verification (no test code)

- `prefers-reduced-motion` behavior verified manually (Gate 20)
- Lighthouse Performance verified manually (Gate 21)
- Visual feel verified manually (pulse, whisper, dialog transitions)

### Total test budget

- animation.test.ts: 2 new (or updates if existing tests are there)
- Component tests: 0-2 small updates per file (likely just ComposerChooser assertion)
- Manual verification: reduced-motion + Lighthouse + visual review

**Total: ~3-5 test changes.** Bounded; migration is mechanical with parity goal.

---

## 10. Files to Create / Modify / NOT to Modify / Delete

### Files to Create

**Tests:**

- `frontend/src/constants/__tests__/animation.test.ts` — if not already existing, create with 2 tokens-exist tests

### Files to Modify

**Constants:**

- `frontend/src/constants/animation.ts` — add `pulse: 300` and `ceremony: 600` to DURATION_MS (D4)

**Tailwind config:**

- `frontend/tailwind.config.{ts,js}` — extend `transitionDuration` with `fast`/`base`/`slow`/`pulse`/`ceremony` aliases consuming `DURATION_MS` (D2)

**Prayer Wall components — Tailwind utility migration (~12 files):**

- `frontend/src/components/prayer-wall/InlineComposer.tsx` (lines 389, 524)
- `frontend/src/components/prayer-wall/CategoryBadge.tsx` (line 18)
- `frontend/src/components/prayer-wall/RoomSelector.tsx` (line 96)
- `frontend/src/components/prayer-wall/WaysToHelpPicker.tsx` (line 64)
- `frontend/src/components/prayer-wall/QotdComposer.tsx` (line 69)
- `frontend/src/components/prayer-wall/InteractionBar.tsx` (line 49)
- `frontend/src/components/prayer-wall/ComposerChooser.tsx` (lines 68, 116)
- `frontend/src/components/prayer-wall/CommentsSection.tsx` (line 58)
- `frontend/src/components/prayer-wall/CategoryFilterBar.tsx` (lines 72, 92, 115)
- `frontend/src/components/prayer-wall/SaveToPrayersForm.tsx` (line 60)
- `frontend/src/components/prayer-wall/CommentInput.tsx` (line 55)

**Prayer Wall components — setTimeout migration (~5 files):**

- `frontend/src/components/prayer-wall/PrayerCard.tsx` (line 62 — 300ms → `DURATION_MS.pulse`)
- `frontend/src/components/prayer-wall/InteractionBar.tsx` (lines 90-92 — 600ms → `DURATION_MS.ceremony`)
- `frontend/src/components/prayer-wall/DeletePrayerDialog.tsx` (line 24 — closing transition; value TBD)
- `frontend/src/components/prayer-wall/AuthModal.tsx` (line 89 — closing transition; value TBD)
- `frontend/src/components/prayer-wall/ReportDialog.tsx` (line 60 — closing transition; value TBD)

**Component test files (potentially):**

- `frontend/src/components/prayer-wall/__tests__/ComposerChooser.test.tsx` — line 164-165 duration assertion update

**Operational:**

- `_forums_master_plan/spec-tracker.md` — flip 5.4 from ⬜ to ✅ AFTER successful merge AND manual visual review confirms parity

### Files NOT to Modify

- `frontend/src/constants/animation.ts` EASING block — unchanged (D5)
- All `__tests__/*.tsx` `vi.advanceTimersByTime(N)` calls — stay as raw numbers (W6)
- `frontend/src/components/prayer-wall/ShareDropdown.tsx` setTimeout (UI feedback, W7)
- `frontend/src/components/prayer-wall/ReportDialog.tsx` line 101 setTimeout (UI feedback / submit auto-close, W7)
- `frontend/src/components/prayer-wall/ScriptureReferenceInput.tsx` setTimeout (likely debounce, W8)
- Pages files (`PrayerWallDashboard.tsx` etc.) — out of scope (W10)
- Other component directories outside `prayer-wall/` — out of scope
- `frontend/src/components/prayer-wall/PrayerCard.tsx:60` `motion-safe:animate-card-pulse` line — unchanged (W4)
- `frontend/src/components/prayer-wall/ComposerChooser.tsx:36` code comment about `0.01ms` — unchanged (W18)
- All backend files — pure frontend spec

### Files to Delete

(none)

---

## 11. Acceptance criteria

**Token extension:**

- [ ] `frontend/src/constants/animation.ts` exports `DURATION_MS` with new tokens `pulse: 300` and `ceremony: 600`
- [ ] Existing tokens (`instant`, `fast`, `base`, `slow`) unchanged
- [ ] EASING tokens unchanged (D5)
- [ ] Type exports updated if needed (W17)
- [ ] No TypeScript errors

**Tailwind config:**

- [ ] `frontend/tailwind.config.{ts,js}` extends `transitionDuration` with `fast`/`base`/`slow`/`pulse`/`ceremony`
- [ ] Config imports values from `constants/animation.ts` (or fallback to duplicated values with comment per R8)
- [ ] Build succeeds (`npm run build` or equivalent)
- [ ] `motion-safe:` and `motion-reduce:` Tailwind variants still work (W4)

**Tailwind utility migration:**

- [ ] All ~16 instances of `duration-200` → `duration-base` across the 12 component files
- [ ] All instances of `duration-300` → `duration-slow` (per D1 default; plan can override per surface)
- [ ] All instances of `duration-150` (if any) → `duration-fast`
- [ ] Grep `frontend/src/components/prayer-wall/*.tsx` (excluding `__tests__/`) for `duration-\d` returns ZERO matches

**Animation-coupled setTimeout migration:**

- [ ] `PrayerCard.tsx:62` uses `DURATION_MS.pulse` (300ms)
- [ ] `InteractionBar.tsx:90-92` uses `DURATION_MS.ceremony` (600ms)
- [ ] `DeletePrayerDialog.tsx:24` uses named token matching its CSS transition duration (plan resolves)
- [ ] `AuthModal.tsx:89` uses named token (plan resolves)
- [ ] `ReportDialog.tsx:60` uses named token (plan resolves)
- [ ] All animation-coupled setTimeouts import `DURATION_MS` from `@/constants/animation`

**UI lifecycle setTimeout preservation:**

- [ ] `ShareDropdown.tsx:125` (copy success) UNCHANGED — raw value preserved (W7)
- [ ] `ReportDialog.tsx:101` (submit auto-close) UNCHANGED — raw value preserved (W7)
- [ ] `ScriptureReferenceInput.tsx:68` (debounce, if confirmed) UNCHANGED (W8)

**Visual parity:**

- [ ] Manual visual review by Eric: every Prayer Wall surface feels temporally the same as before
- [ ] PrayerCard pulse animation completes cleanly (no cut-off or lingering, W5)
- [ ] InteractionBar whisper coordinates with sound effect (W5)
- [ ] Dialog open/close transitions feel the same
- [ ] Composer reveal/collapse feels the same
- [ ] Pill hover transitions feel the same

**Accessibility:**

- [ ] `prefers-reduced-motion: reduce` correctly disables `motion-safe:animate-card-pulse` (Gate 20)
- [ ] ComposerChooser open/close respects reduced-motion preference
- [ ] Universal Rule 17 axe-core tests still pass (no regressions)

**Performance:**

- [ ] Lighthouse Performance score ≥ 90 on `/prayer-wall` (Gate 21)
- [ ] Lighthouse Performance score ≥ 90 on `/prayer-wall/dashboard`
- [ ] Lighthouse Performance score ≥ 90 on `/prayer-wall/profile/[id]`
- [ ] Lighthouse Performance score ≥ 90 on `/prayer/[id]`
- [ ] CLS and INP metrics unchanged or improved

**Hardcoded values check:**

- [ ] No `cubic-bezier(` in `components/prayer-wall/*.tsx` (excluding `__tests__/`)
- [ ] No `transition-duration:` CSS-in-JS in `components/prayer-wall/`
- [ ] No `animation-duration:` CSS-in-JS in `components/prayer-wall/`

**No regressions:**

- [ ] Frontend test suite passes (10,000+ tests; per recent 5.3 baseline)
- [ ] All existing component tests pass with at most minor class-name assertion updates
- [ ] No TypeScript errors
- [ ] No build failures
- [ ] No new dependencies introduced
- [ ] BB-33 compliance reference satisfied (plan recon confirms what BB-33 specifies)

**Out of scope verification:**

- [ ] Test files NOT migrated (W6 — raw ms values in vi.advanceTimersByTime preserved)
- [ ] UI lifecycle setTimeouts NOT tokenized (W7)
- [ ] EASING tokens NOT modified (D5 / W9)
- [ ] Pages files NOT touched (W10)
- [ ] No new component props for animation timing (W15)
- [ ] PrayerWallDashboard:722 inline frosted NOT migrated (W19 — defer to 5.5)

**Operational:**

- [ ] `_forums_master_plan/spec-tracker.md` 5.4 row flipped from ⬜ to ✅ AFTER manual visual review + Lighthouse passes

---

## 12. Out of scope

Explicit deferrals — do NOT include any of these in 5.4:

- **UI lifecycle setTimeout tokenization** — W7; per-surface UX decisions, not animation
- **EASING token migration or extension** — D5 / W9; durations only
- **`cubic-bezier(` migration** — already clean per recon
- **Test file migration** — W6; test timing stays raw
- **Pages-level animation migration** (`PrayerWallDashboard.tsx`, etc.) — W10; master plan scope is components only
- **Inline frosted pattern at PrayerWallDashboard.tsx:722** — W19; defer to 5.5
- **New component props for animation control** — W15
- **Visual regression test infrastructure** — D8; manual review only
- **animation.ts relocation or token rename** — W14
- **`instant` token usage** — W20; no current 0ms candidates
- **`0.01ms` reduced-motion technique changes** — W18; CSS-level, not migration target
- **Token consumers outside Prayer Wall** — unchanged unless conflicts (R10)
- **Lighthouse improvements beyond preserving 90+** — not the goal; parity is the goal
- **Adding more easing curves** — D5
- **Switching from Tailwind to a different styling system** — architectural; not 5.4
- **Animation library introduction (Framer Motion, etc.)** — not the goal
- **CSS variable migration** — D2 prefers Tailwind config aliases

---

## 13. Brand voice quick reference

5.4 introduces no new copy. No brand voice surface.

**The only naming concern is token names** (D4):

- `pulse` — ok; describes UI behavior
- `ceremony` — ok; aligns with Worship Room's calm tone without overt religious framing

If plan recon proposes alternative names, the test is whether they describe UI behavior calmly without:

- Religious literalism ('prayer', 'amen', 'worship') — too on-the-nose for an internal token name
- Marketing voice ('snappy', 'punchy', 'zip') — transactional
- Gamification ('combo', 'streak') — wrong frame

The existing tokens (`fast`, `base`, `slow`) are calm and descriptive. New tokens should match that voice.

---

## 14. Tier rationale

Run at **High**. Justifications:

**Why not Standard:**

- Token mapping is non-trivial (D1, MPD-3). Standard tier rounds everything.
- Tailwind utility migration approach is a design call (D2). Standard tier picks the first viable path.
- Animation-coupled vs UI lifecycle setTimeout distinction (D3) is judgment work. Standard tier tokenizes everything or nothing.
- `prefers-reduced-motion` preservation is load-bearing (W4). Standard tier breaks it via tailwind.config edits.
- Visual regression risk on pulse / whisper feel (W5). Standard tier rounds and ships.
- BB-33 compliance interpretation (MPD-5). Standard tier ignores or assumes.

**Why not xHigh:**

- No new architecture; tokens file already exists
- No schema, no backend, no novel coordination
- Migration is mechanical after design settled
- ~17 file changes; bounded
- Brief covers all 20 watch-fors explicitly

**Override moments — when to bump to MAX:**

- During /plan or /execute, if CC tokenizes UI lifecycle setTimeouts (W7)
- If CC rounds animation-coupled timing breaking visual feel (W5)
- If CC breaks `prefers-reduced-motion` (W4)
- If CC modifies test files' raw timing (W6)
- If Lighthouse Performance drops below 90 post-migration (Gate 21)
- If CC introduces new dependencies (W13)
- If CC migrates files outside scope (W10)

---

## 15. Recommended planner instruction

Paste this as the body of `/spec-forums spec-5-4`:

```
/spec-forums spec-5-4

Write a spec for Phase 5.4: Animation Token Migration (BB-33 Compliance). Read /Users/eric.champlin/worship-room/_plans/forums/spec-5-4-brief.md as the source of truth. Treat the brief as binding. Where the master plan body and the brief diverge, the brief wins.

Tier: High.

Branch: stay on `forums-wave-continued`. Do not run any git mutations. Eric handles git manually.

This spec migrates hardcoded animation timing values in Prayer Wall components to consume canonical tokens from `frontend/src/constants/animation.ts`. Two surfaces:

1. Tailwind `duration-*` utility classes (~16 across 12 components) migrate to named aliases via tailwind.config extension
2. Animation-coupled `setTimeout` calls (~5) migrate to import DURATION_MS from animation.ts

UI lifecycle setTimeouts (copy success, submit auto-close) stay as raw values — they're UX feedback timing, not animation.

Prerequisites:
- 5.3 (2-Line Heading Treatment) must be ✅ in spec-tracker.md
- If 5.3 is still ⬜, STOP. Don't proceed.

Recon checklist (re-verify on disk before starting; brief recon was on date 2026-05-11):

1. `frontend/src/constants/animation.ts` — confirm DURATION_MS and EASING shapes; read additional exports
2. `frontend/tailwind.config.{ts,js}` — identify file extension; read current theme.extend structure; confirm `motion-safe:` and `motion-reduce:` variant configuration; verify Tailwind version supports TS imports if config is `.ts`
3. Each of the 12 component files with `duration-` utilities — read the FULL class string at each line number to confirm the actual N value (200, 300, etc.); the recon greps were truncated
4. Each of the 5 animation-coupled setTimeout files — read the FULL line to confirm the actual ms value (especially the 3 closing-transition dialogs; the 300 and 600 are confirmed)
5. `ShareDropdown.tsx:125`, `ReportDialog.tsx:101`, `ScriptureReferenceInput.tsx:68` — confirm these are UI lifecycle / debounce (NOT animation) per D3 / W7 / W8 categorization
6. CLAUDE.md or `.claude/rules/` — read BB-33 specification (if it exists); confirm brief's interpretation is correct
7. Other token consumers — grep `frontend/src/` outside `components/prayer-wall/` for `DURATION_MS` and verify no naming conflicts with new `pulse` / `ceremony` tokens (R10)
8. `__tests__/ComposerChooser.test.tsx:164-165` — read full assertion; plan class-name assertion update if needed
9. `__tests__/animation.test.ts` (if exists) — plan updates for new tokens
10. EASING token usage in Prayer Wall components — grep `ease-` to confirm no migration needed (D5 / W9)

Spec output structure:

- Title and metadata (size M, risk Low, prerequisites 5.3, branch forums-wave-continued)
- Goal — Migrate hardcoded animation timing in Prayer Wall components to canonical tokens from constants/animation.ts; extend tokens with `pulse: 300` and `ceremony: 600`; extend tailwind.config with named duration aliases
- Approach — Two-phase: extend animation.ts + tailwind.config first; then migrate Tailwind utilities (round to existing tokens) and animation-coupled setTimeouts (preserve exact timing via new tokens). UI lifecycle setTimeouts stay raw. Tests preserved.
- Files to create / modify / NOT to modify (per brief Section 10)
- Acceptance criteria (per brief Section 11)
- Test specifications (per brief Section 9 — ~3-5 changes)
- Out of scope (per brief Section 12)
- Out-of-band notes for the executor:
  - Hybrid token mapping: round Tailwind utilities, preserve setTimeout exact timing (D1 / MPD-3)
  - Tailwind config aliases consume DURATION_MS (D2)
  - Animation-coupled vs UI lifecycle setTimeout distinction (D3 / W7)
  - New tokens `pulse: 300` and `ceremony: 600` (D4)
  - EASING tokens NOT touched (D5 / W9)
  - Test files NOT migrated (D6 / W6)
  - `prefers-reduced-motion` preserved (W4 / Gate 20)
  - Lighthouse Performance 90+ verified (W12 / Gate 21)
  - BB-33 reference verified (MPD-5 / R11)
  - All 20 watch-fors must be addressed

Critical reminders:

- Use single quotes throughout TypeScript and shell.
- Test convention: `__tests__/` colocated with source files.
- Tracker is source of truth. Eric flips ⬜→✅ after merge AND manual visual review + Lighthouse passes.
- Eric handles all git operations manually.
- This is a pure refactor; visual-temporal output must feel IDENTICAL before/after for most surfaces; pulse and whisper timing must be EXACTLY preserved.
- Brand voice on token names is sensitive but minimal scope (just `pulse` and `ceremony` names).
- This is a pure-frontend spec; no backend changes.

After writing the spec, run /plan-forums spec-5-4 with the same tier (High).
```

---

## 16. Verification handoff

After /code-review passes, run:

```
/verify-with-playwright spec-5-4
```

The verifier exercises Section 3's 12 visual scenarios. Verifier writes to `_plans/forums/spec-5-4-verify-report.md`.

If verification flags any of:
- Tailwind utilities still have hardcoded numbers (AC #11, AC #15)
- Animation-coupled setTimeouts still hardcoded (AC #16-20)
- UI lifecycle setTimeouts tokenized (W7 violation)
- EASING tokens modified (D5 / W9)
- `prefers-reduced-motion` broken (W4 / Gate 20)
- Pulse / whisper visual feel changed (W5)
- Lighthouse Performance drops below 90 (Gate 21)
- Test files' raw timing modified (W6)
- Files outside scope modified (W10)
- New dependencies introduced (W13)
- TypeScript errors (W17)
- Build failures (W11)

Abort and bump to MAX. Those are the canonical override moments.

**Manual visual review by Eric is required before merge.** Three distinct review surfaces:

1. **Pulse and whisper timing** — click prayer cards, trigger whisper interactions; verify timing feels coordinated (W5)
2. **Dialog transitions** — open/close Auth, Report, Delete dialogs; verify smoothness
3. **Hover and reveal transitions** — hover pills, reveal composers, expand/collapse comment sections; verify all feel responsive without lag

Plus:

4. **Reduced-motion test** — DevTools toggle ON, verify pulse disabled (Gate 20)
5. **Lighthouse** — 4 Prayer Wall routes scored 90+ (Gate 21)

If any of the above fail, iterate.

---

## Prerequisites confirmed (as of 2026-05-11 brief authorship)

- ✅ Phase 4 complete (4.1–4.8 all ✅ per spec-tracker)
- ✅ 5.1 (FrostedCard Migration) shipped
- ✅ 5.2 (BackgroundCanvas) shipped via Spec 14
- ✅ 5.3 (2-Line Heading Treatment) shipped — closed as no-op with axe-core dashboard route addition
- ✅ `animation.ts` exists at `frontend/src/constants/animation.ts` (R1)
- ✅ DURATION_MS has `instant`, `fast: 150`, `base: 250`, `slow: 400` (R1)
- ✅ EASING has Material Design tokens (R1)
- ✅ 16 Tailwind `duration-*` utilities across 12 component files (R2)
- ✅ 5 animation-coupled setTimeout calls identified (R3)
- ✅ 0 `cubic-bezier(` strings in components/prayer-wall/ (R4)
- ✅ `prefers-reduced-motion` patterns documented (R7)
- ✅ Universal Rule 17 axe-core test infrastructure from 4.8 + `/prayer-wall/dashboard` route from 5.3
- ⬜ Tailwind config file location and TS-import support — plan recon confirms (R6 / R8)
- ⬜ BB-33 specification — plan recon clarifies (R11 / MPD-5)
- ⬜ Token consumer audit across `frontend/src/` — plan recon confirms no naming conflicts for `pulse` / `ceremony` (R10)
- ⬜ Exact setTimeout values in closing-transition dialogs — plan recon reads (R3)
- ⬜ Exact `duration-N` values per file — plan recon reads (R2)

**Brief authored:** 2026-05-11, on Eric's work laptop. Third real Phase 5 brief (5.0 closed without ceremony; 5.1 first; 5.2 shipped via Spec 14; 5.3 closed as no-op; 5.4 is real source work). Companion to Spec 4.3, 4.4, 4.5, 4.6, 4.6b, 4.7, 4.7b, 4.8, 5.1, 5.3 briefs. Phase 5 progresses through 5.4 → 5.5 (deprecated pattern purge — remainder, partial-shipped via Spec 14 Step 7) → 5.6 (Redis Cache Foundation — infrastructure spec, tonally different from visual specs; warrants own brief-planning session).

The master plan re-review pass (60–90 min Claude Desktop session, targeted patches, bump to v3.0) remains deferred. Natural moment is between 5.4 and 5.5 (after Phase 5's visual specs close but before infrastructure work begins), or after Phase 5 closes entirely.

**End of brief.**
