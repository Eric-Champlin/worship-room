# Forums Wave: Spec 5.5 — Deprecated Pattern Purge and Visual Audit

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 5.5 (lines ~4708–4732). Master plan body says **PARTIAL-SHIPPED VIA SPEC 14** — only the `PrayerWallHero` typography portion (font-script "Wall", font-serif italic subtitle) shipped via Spec 14 Step 7. Everything else remains in scope for this spec.
**Source Brief:** `_plans/forums/spec-5-5-brief.md` (authored 2026-05-11 — **brief is binding for design intent; brief wins over master plan body where they diverge; this spec's Recon Reality Overrides win over brief where brief's recon (R2/R5) is wrong on disk; the canonical Visual Rollout patterns in `09-design-system.md` win over both brief and spec where any opacity, color, or variant value conflicts**).
**Branch:** `forums-wave-continued` (long-lived working branch — Eric handles all git operations manually; CC must NOT run any git mutations at any phase).
**Date:** 2026-05-11.

---

## Affected Frontend Routes

The four Prayer Wall routes and (regression-only) two Daily Hub routes are exercised by `/verify-with-playwright`. Section 3 of the brief defines 18–22 scenarios across them.

- `/prayer-wall` (feed, logged-out and logged-in)
- `/prayer-wall/:id` (single prayer detail, logged-out and logged-in)
- `/prayer-wall/dashboard` (own dashboard, logged-in only)
- `/prayer-wall/user/:userId` (another user's profile — note the actual route is `/prayer-wall/user/:id`, NOT `/prayer-wall/profile/:userId` as brief Section 3 wrote; confirmed in `12-project-reference.md` route table and in `PrayerWallProfile.tsx`)
- `/daily` (regression — confirm no visual drift from Daily Hub during 5.5)
- `/daily?tab=pray` (regression — confirm Pray-tab textarea retains canonical violet glow)

Out of scope (W22): every non-Prayer-Wall surface (Daily Hub other than regression, Bible, Music, Local Support, Ask, Grow, Routines, Homepage, Landing, Auth Modal as a standalone surface).

---

## Metadata

- **ID:** `round3-phase05-spec05-deprecated-pattern-purge`
- **Phase:** 5 (Prayer Wall Visual Migration — fifth real Phase 5 spec; 5.0 closed without ceremony, 5.1 ✅ shipped, 5.2 ✅ shipped via Spec 14, 5.3 ✅ closed as no-op, 5.4 ✅ shipped, 5.5 is the final visual unification gate before Phase 5 closes)
- **Size:** L (brief upgraded from master plan M; this spec preserves L given the post-recon scope-extension into `components/prayer-wall/` text-button color migration and the PrayerCard tier-prop addition surfaced by R-OVR3)
- **Risk:** Medium (brief upgraded from master plan Low; this spec preserves Medium — visual change is intentional and noticeable, the manual audit is the safety net, and the scope-extension findings amplify the surface-miss risk)
- **Tier:** xHigh (per brief Sections 2 and 14 — brand-defining work; the "Prayer Wall feels like Daily Hub" acceptance criterion is a curator's judgment that requires the spec to enumerate surfaces exhaustively and the plan to catalog canonical patterns exhaustively)
- **Prerequisites:**
  - **5.4 (Animation Token Migration) ✅** — verified in `_forums_master_plan/spec-tracker.md` row 76 on 2026-05-11 (the brief was authored when 5.4 was still ⬜ pending; 5.4 has since shipped, so 5.5 execution is unblocked).
  - **5.1 (FrostedCard Migration) ✅** — row 73. PrayerCard composition is `<FrostedCard variant="default" as="article" className={cn(getPerTypeChromeClass(prayer.postType), ...)}>` (verified on disk per R-OVR-R10). The per-type chrome path 5.5 needs to normalize is exactly the constants file 5.1 created.
  - **5.2 (BackgroundCanvas at Prayer Wall Root) ✅** — row 74, shipped via Spec 14 Step 6. `PrayerWall.tsx` already wraps in `<BackgroundCanvas>`; 5.5 inherits this and does not modify it.
  - **5.3 (2-Line Heading Treatment) ✅** — row 75, closed as no-op per spec-tracker notes (PrayerWallHero typography shipped via Spec 14; PrayerWallDashboard has no qualifying section headers).
  - **FrostedCard primitive** — verified at `frontend/src/components/homepage/FrostedCard.tsx`. Variants `accent | default | subdued` confirmed (R-OVR-R7). Supports `as: 'div' | 'button' | 'article' | 'section'` and `type: 'button' | 'submit' | 'reset'` for form-submission safety on `as="button"`. Children prop accepted.
  - **FeatureEmptyState primitive** — verified at `frontend/src/components/ui/FeatureEmptyState.tsx`. Props: `icon: LucideIcon, iconClassName?, heading, description, ctaLabel?, ctaHref?, onCtaClick?, children?, compact?, className?`. Already in use at `PrayerWallProfile.tsx:402`, `PrayerWallDashboard.tsx:612/636/671/709`, and `PrayerWall.tsx:850` (R-OVR-R4 — far more usage than brief R4 noted).

---

## Recon Reality Overrides (2026-05-11)

**This section overrides the brief's Section 5 (Recon Ground Truth) wherever the brief is wrong on disk. The codebase wins on facts; Eric (via the brief) wins on direction. D-decisions and W-watch-fors in the brief survive verbatim except where R-OVR explicitly supersedes them.**

Pattern follows Spec 3.7 § Recon R1/R2/R3 and Spec 5.4 § Recon Reality Overrides — "Files already exist (do NOT recreate)" / "facts don't match the brief" override pattern.

### R-OVR-R1 — `post-type-chrome.ts` current state — VERIFIED MATCHES BRIEF

Brief R1 is **correct**. Verified `frontend/src/constants/post-type-chrome.ts` on 2026-05-11:

```ts
import type { PostType } from '@/constants/post-types'

/**
 * Per-type accent layer for Prayer Wall cards. Layered on top of
 * `<FrostedCard variant="default">` via the `className` prop. Provides ONLY
 * the border tint and background tint; the frosted glass base chrome
 * (rounded-3xl, backdrop-blur, default surface opacity) is provided by
 * FrostedCard itself.
 *
 * Lifted verbatim from PrayerCard.tsx's per-type switch (Spec 5.1, 2026-05-11).
 * Opacities are NOT to be normalized — per Spec 5.1 W8, the migration preserves
 * the per-type accent opacity values exactly as they were in the inline switch.
 */
export const PER_TYPE_CHROME: Record<PostType, string> = {
  prayer_request: '',
  testimony: 'border-amber-200/10 bg-amber-500/[0.04]',
  question: 'border-cyan-200/10 bg-cyan-500/[0.04]',
  discussion: 'border-violet-200/10 bg-violet-500/[0.04]',
  encouragement: 'border-rose-200/10 bg-rose-500/[0.04]',
}

export function getPerTypeChromeClass(postType: PostType): string {
  return PER_TYPE_CHROME[postType]
}
```

The 5.1 W8 freeze comment block is intact. 5.5's central correction (W-OVERRIDE-5.1) reverses it.

### R-OVR-R2 — Pages-level inline frosted patterns — VERIFIED, with verbatim drift

Brief R2 listed 8 sites. Verified comprehensively on 2026-05-11:

| File | Line | Pattern on disk | Use | Brief R2 wording |
| ---- | ---- | --------------- | --- | ---------------- |
| `pages/PrayerWallDashboard.tsx` | 381 | `rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1 text-xl font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` | Display name input | matches |
| `pages/PrayerWallDashboard.tsx` | 418 | `w-full resize-none rounded-lg border border-white/10 bg-white/[0.06] p-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` | Bio textarea | matches |
| `pages/PrayerWallDashboard.tsx` | 600 | `rounded-xl border border-white/10 bg-white/[0.06] p-4` | Comment list item (My Comments tab) | matches |
| `pages/PrayerWallDashboard.tsx` | 722 | `rounded-xl border border-white/10 bg-white/[0.06] p-5` | Notification preferences card (Settings tab) | matches |
| `pages/PrayerDetail.tsx` | 330 | `rounded-xl border border-white/10 bg-white/[0.06] p-8 text-center` | "Prayer not found" empty state | matches |
| `pages/PrayerWallProfile.tsx` | 214 | `rounded-xl border border-white/10 bg-white/[0.06] p-8 text-center` | "User not found" empty state | matches |
| `pages/PrayerWallProfile.tsx` | 412 | `rounded-xl border border-white/10 bg-white/[0.06] p-4` | Comment list item (Replies tab — flag-off branch) | matches |
| `pages/PrayerWall.tsx` | 822, 838 | `rounded-lg border border-white/30 bg-white/10 px-8 py-3 font-medium text-white backdrop-blur-sm transition-[colors,transform] duration-fast hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent active:scale-[0.98]` (L822) and identical sans `duration-fast` and `active:scale-[0.98]` (L838) | "Share something" hero CTA — logged-in (L822) and logged-out (L838) variants | **minor drift:** brief said `backdrop-blur`, actual is `backdrop-blur-sm`; migration target unchanged |

All 8 sites confirmed. The PrayerWall.tsx logged-in/logged-out CTAs are two SEPARATE rendered branches in `PrayerWallHero`'s `action` prop (verified at L809–844) — both need migration in 5.5.

### R-OVR-R3 — Brief R5's "already-satisfied-by-absence" claim is PARTIALLY WRONG

Brief R5 claimed seven master plan AC items are satisfied by absence as of 2026-05-11. **Two of the seven are wrong:**

**Wrong: `font-serif italic` is NOT absent on Prayer Wall.**

Brief R5 said: "`font-serif italic` (only one negative test assertion verifying cleanup)". Verified 2026-05-11 — two production-rendered violations:

| File | Line | Use |
| ---- | ---- | --- |
| `pages/PrayerWallProfile.tsx` | 275 | `<p className="mt-2 max-w-md font-serif italic text-white/70">{profileChrome.bio}</p>` — bio paragraph on a profile (read-only view) |
| `pages/PrayerWallDashboard.tsx` | 438 | `<p className="max-w-md font-serif italic text-white/70">{bio || 'Add a bio...'}</p>` — bio fallback paragraph when not editing |

Both bio paragraphs render `font-serif italic` on user-supplied (or placeholder) text. The master plan AC item "No `font-serif italic` on Prayer Wall labels" is **NOT** satisfied by absence; 5.5 must migrate both. Mapping (per `09-design-system.md` § "Deprecated Patterns" row `font-serif italic` on Journal prompts → `font-sans` Inter, no italic, white text): change to `font-sans` (default — drop `font-serif`), drop `italic`, keep `text-white/70` (or per readability standard, consider `text-white/80` — but stay tight to the surrounding tone; the surrounding profile prose uses `text-white/60` for descriptions). Plan-time CC resolves the exact replacement (drop italic vs. keep one but not the other).

**Wrong: `BackgroundSquiggle` claim is correct, but verify the rest at plan time.**

The grep for `BackgroundSquiggle | GlowBackground | animate-glow-pulse` in `frontend/src/components/prayer-wall/` and `frontend/src/pages/Prayer*.tsx` returned ZERO matches on 2026-05-11. Five of brief R5's seven items confirmed satisfied by absence: `Caveat`/`font-script`, `BackgroundSquiggle`, `GlowBackground`, `animate-glow-pulse`, `line-clamp-3` in `components/prayer-wall/`, `cubic-bezier(` in `components/prayer-wall/`. The cyan textarea glow grep is the brief's seventh claim — also verified absent post-recon (`grep -rnE 'glow-cyan|shadow.*cyan' frontend/src/{pages,components}/prayer-wall* frontend/src/pages/Prayer*.tsx` returned zero matches; the only cyan in scope is the `cyan-200` / `cyan-500` per-type chrome for the `question` post type, which is intentional and survives 5.5 with normalized opacities).

**Brief R5's seventh "satisfied by absence" item — `font-serif italic` — is WRONG and is added to the migration list.**

### R-OVR-R4 — FeatureEmptyState is far more widely adopted than brief R4 noted

Brief R4 said FeatureEmptyState is imported and used at `pages/PrayerWallProfile.tsx:14` (import) and `:349` (use). Verified 2026-05-11:

| File | Import line | Use lines |
| ---- | ----------- | --------- |
| `pages/PrayerWallProfile.tsx` | 14 | 402 (replies tab flag-on branch) — actual brief reference of `:349` is a different `FeatureEmptyState` instance for the prayers-tab not-found case |
| `pages/PrayerWallDashboard.tsx` | 17 (already imported) | 612 (comments empty), 636 (bookmarks error), 671 (bookmarks empty), 709 (reactions empty), plus inline at 587 (compact dashboard widget) |
| `pages/PrayerWall.tsx` | (separate import line — `FeatureEmptyState` imported from `@/components/ui/FeatureEmptyState`) | 850 (feed fetch-error fallback), 860+ (empty feed cases per fetch result) |
| `pages/PrayerDetail.tsx` | (NOT yet imported) | (NOT yet used — the brief is CORRECT that the L330 "Prayer not found" card needs to migrate to FeatureEmptyState AND `PrayerDetail.tsx` needs to add the import) |

**Implication:** D7's migration scope shrinks — `PrayerWallProfile.tsx` and `PrayerWallDashboard.tsx` already import the primitive. Only `PrayerDetail.tsx` needs a new import. The "User not found" card at `PrayerWallProfile.tsx:214` and the "Prayer not found" card at `PrayerDetail.tsx:330` are the two migration sites. The brief's third site — "PrayerWallProfile.tsx:412 comment list item" — is a card-pattern migration to `<FrostedCard variant="default">`, NOT a FeatureEmptyState migration (it's a comment item, not an empty state); brief D7 conflated the two. 5.5 migrates the two empty-state cards to FeatureEmptyState and the four comment/notification-prefs cards to FrostedCard.

### R-OVR-R5 — PrayerCard tier elevation requires a `tier` prop, NOT a wrapper change

Brief D2 says PrayerDetail's main prayer card is Tier 1 accent. PrayerCard's current composition (`PrayerCard.tsx:99–224`) is:

```tsx
<FrostedCard
  variant="default"
  as="article"
  aria-label={articleAriaLabel}
  className={cn(
    getPerTypeChromeClass(prayer.postType),
    'lg:hover:shadow-md lg:hover:shadow-black/20 transition-shadow motion-reduce:transition-none',
  )}
>
```

PrayerCard is rendered by `pages/PrayerWall.tsx` (feed cards), `pages/PrayerWallDashboard.tsx` (prayers / bookmarks / reactions tabs), `pages/PrayerWallProfile.tsx` (prayer history list), and `pages/PrayerDetail.tsx:363` (single prayer with `showFull` prop).

The variant is hardcoded to `"default"` inside PrayerCard. Brief D2 wants PrayerDetail's main card to render as `variant="accent"`. Brief W24 says "Don't refactor Spec 5.1's `<FrostedCard>` migrations inside `components/prayer-wall/`" — these two directives conflict.

**Override moment per brief Section 2 / Section 14 — Advisor decision needed.** Three resolution paths, ranked by surgical minimalism:

1. **(RECOMMENDED) Add a `tier?: 'feed' | 'detail'` prop to PrayerCard** that selects `variant="default"` (feed/dashboard/profile) vs `variant="accent"` (detail). Default value: `'feed'` so feed/dashboard/profile renders unchanged. `PrayerDetail.tsx:363` passes `tier="detail"`. This is a minimal extension consistent with Universal Rule 16 ("Existing components are extended, not rebuilt"). It does NOT refactor the FrostedCard migration — it extends PrayerCard's API to expose the variant choice that 5.1 made internally. **Recommended path: extends, doesn't refactor.**
2. **Render PrayerDetail's main card without PrayerCard.** Inline a Tier-1-accent FrostedCard composition in `PrayerDetail.tsx`. Preserves PrayerCard verbatim but duplicates ~120 lines of card-shape JSX. Rejected — duplication is a regression vector.
3. **Skip the Tier-1-accent treatment on PrayerDetail entirely.** Keep PrayerCard at `variant="default"` for all consumers; rely on the per-type chrome overlay + comment cards at `variant="default"` to provide visual structure. Rejected — brief D2 explicitly asks for Tier 1 accent on the detail-page anchor.

**Resolution:** path 1. Plan-time CC implements the `tier` prop, defaults to `'feed'`, and `PrayerDetail.tsx:363` passes `tier="detail"`. This is the minimum extension to PrayerCard that satisfies D2 without violating W24's spirit (W24 forbids re-migration of 5.1's FrostedCard composition; adding a tier prop preserves the composition and exposes the existing variant choice).

If plan-time CC produces a Daily Hub Canonical Pattern Catalog entry that contradicts path 1 (e.g., reveals a different tier-elevation pattern), the spec consumes the corrected ranking per the R-OVR pattern.

### R-OVR-R6 — `text-primary` text-button and `ring-primary` focus-ring are widespread in `components/prayer-wall/` — SCOPE EXTENSION QUESTION

Brief R14 grep targets include `text-primary` and `ring-primary`. Recon found these are NOT confined to the 8 pages-level sites — they're widespread in `components/prayer-wall/`. Verified 2026-05-11:

**`text-primary` sites in `components/prayer-wall/`:**

| File | Lines | Use |
| ---- | ----- | --- |
| `CommentItem.tsx` | 38, 45, 98 | @-mention author link, @-mention inline pill, reply-button hover |
| `CommentInput.tsx` | 129, 160, 172 | Submit-button enabled state, helper-text buttons |
| `CommentsSection.tsx` | 79, 98, 105 | "Show comments" link, expand-all buttons |
| `InteractionBar.tsx` | 146, 172, 202, 203, 214 | Active state for praying button, animated count text, bookmark active, share button hover |
| `AuthModal.tsx` | 338, 390, 592, 690, 701 | Close-button focus ring, "switch mode" links — note that AuthModal already uses `text-purple-400 hover:text-purple-300` for the action text; the `text-primary` here is only on focus rings — distinct concern |
| `ReportDialog.tsx` | 211 | Textarea focus ring |

**`ring-primary` sites in `components/prayer-wall/`:** widespread (CommentItem, CommentInput, ReportDialog, AuthModal, InteractionBar, others — focus-visible ring color).

**`text-primary` sites in pages files:**

| File | Lines | Use |
| ---- | ----- | --- |
| `PrayerWallDashboard.tsx` | 401, 442, 605, 737 | Hover state for edit-name/edit-bio icons, "View prayer" link inside comment cards, notification checkbox accent |
| `PrayerWallProfile.tsx` | 417 | "View prayer" link inside comment cards |

**Canonical replacement per `09-design-system.md` § "Deprecated Patterns" row `text-primary` text-button on dark:** `text-violet-300 hover:text-violet-200` for text-button (WCAG AA fix per Spec 10A audit). For focus rings, `ring-primary` is also deprecated — `09-design-system.md` § "Focus indicators" recommends `focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-hero-bg` as the canonical pattern, with `ring-violet-400/60` as the canonical selected-card ring. For Prayer Wall component focus rings, the muted-white halo is the canonical post-Spec-10A treatment.

**Scope question for Eric:** Brief Section 10's "Files to Modify" list is page-level only. Brief W24 authorizes scope-creep into `components/prayer-wall/` for inline frosted patterns 5.1 missed, but is silent on whether color-token migrations (text-primary → text-violet-300, ring-primary → white-halo) qualify. Three options:

1. **(RECOMMENDED) Fold component-level text-primary / ring-primary migration into 5.5 scope.** Rationale: 5.5's acceptance criterion is "Prayer Wall feels like Daily Hub"; Daily Hub uses `text-violet-300` for text-buttons on dark. Leaving `text-primary` text-buttons across 6 `components/prayer-wall/` files means the feel-like-Daily-Hub gate fails even if every pages-level pattern migrates correctly. Files added: `CommentItem.tsx`, `CommentInput.tsx`, `CommentsSection.tsx`, `InteractionBar.tsx`, `AuthModal.tsx` (focus-ring only, NOT the `text-purple-400` action text), `ReportDialog.tsx`. Per W24, log each one explicitly.
2. **Defer to a separate follow-up spec.** Rationale: 5.5 stays close to brief Section 10's pages-level scope; the color migration is its own concern. Risk: the manual visual audit fails on "feels like Daily Hub," forcing a re-open.
3. **Migrate only the text-button color (`text-primary` → `text-violet-300`), defer the focus-ring migration.** Rationale: text-button is a Visual Rollout / Spec 10A canonical violation today; focus-ring is a more contextual call (the canonical pattern uses white-halo as the safe default but some surfaces benefit from a violet ring). 5.5 takes the unambiguous fix.

**Default resolution: option 1.** Plan-time CC enumerates every site, the spec acceptance criteria lists each, and execute-time CC migrates them. If Eric prefers option 2 or 3 at spec review, the plan adjusts. **This is the largest scope deviation from the brief.** Without it, the AC "Prayer Wall feels like Daily Hub" is unverifiable.

### R-OVR-R7 — FrostedCard variant CSS — VERIFIED

`frontend/src/components/homepage/FrostedCard.tsx` verified 2026-05-11. Variant class strings:

```ts
const VARIANT_CLASSES: Record<FrostedCardVariant, VariantClassSet> = {
  accent: {
    base: 'bg-violet-500/[0.08] backdrop-blur-md md:backdrop-blur-[12px] border border-violet-400/70 rounded-3xl p-6 shadow-frosted-accent relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.10] before:to-transparent before:rounded-t-3xl before:pointer-events-none',
    hover: 'hover:bg-violet-500/[0.13] hover:shadow-frosted-accent-hover hover:-translate-y-0.5',
  },
  default: {
    base: 'bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12] rounded-3xl p-6 shadow-frosted-base',
    hover: 'hover:bg-white/[0.10] hover:shadow-frosted-hover hover:-translate-y-0.5',
  },
  subdued: {
    base: 'bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5',
    hover: 'hover:bg-white/[0.04]',
  },
}
```

Confirms:

- Default radius: `rounded-3xl` (D4 satisfied automatically when FrostedCard is consumed).
- Computed `border-radius`: 24px (Tailwind `rounded-3xl`).
- Default surface: `bg-white/[0.07]` (Visual Rollout post-rollout value — NOT the deprecated `bg-white/[0.06]`).
- Default border: `border-white/[0.12]` (Visual Rollout — NOT the deprecated `border-white/10`).
- Accent surface: `bg-violet-500/[0.08]` (Visual Rollout — NOT the deprecated `[0.04]`).
- Accent border: `border-violet-400/70` (Visual Rollout — NOT the deprecated `/45`).
- Subdued surface: `bg-white/[0.05]`, border `border-white/[0.10]`, padding `p-5`.
- Prop signature: `children, onClick, className, as: 'div' | 'button' | 'article' | 'section', tabIndex, role, onKeyDown, variant, eyebrow, eyebrowColor, type, 'aria-label', 'aria-labelledby', style`.
- `type` prop only meaningful when `as="button"` — defaults to `"button"` to prevent accidental form submission (relevant for D10 path 2).
- Hover semantics fire only when `onClick` is set (`isInteractive` boolean) — meaningful for the "Share something" CTA migration (D10): if path 2 is chosen, `onClick` triggers the variant's hover state automatically.

### R-OVR-R8 — FeatureEmptyState props — VERIFIED

Verified at `frontend/src/components/ui/FeatureEmptyState.tsx`:

```ts
interface FeatureEmptyStateProps {
  icon: LucideIcon
  iconClassName?: string  // Override the default `text-white/30` icon color
  heading: string
  description: string
  ctaLabel?: string
  ctaHref?: string
  onCtaClick?: () => void
  children?: React.ReactNode  // Renders below description, above CTA
  compact?: boolean  // Use compact padding for dashboard widgets
  className?: string
}
```

Default rendering:

- Container: `mx-auto flex max-w-sm flex-col items-center px-6 text-center`, padding `py-12` (or `py-6` when `compact`).
- Icon: `mb-3 h-10 w-10 sm:h-12 sm:w-12 text-white/30` (overridable via `iconClassName`).
- Heading: `<h3 className="text-lg font-bold text-white/70">`.
- Description: `<p className="mt-1 text-sm text-white/60">`.
- CTA (when `ctaLabel + ctaHref` OR `ctaLabel + onCtaClick`): `mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]`.

**Note for the spec author and future-self auditing:** FeatureEmptyState's CTA button is the Pattern 1 inline white-pill CTA (`09-design-system.md` § "White Pill CTA Patterns"). It currently renders `text-primary` for the text color. Per `09-design-system.md`, Pattern 1's canonical text color is `text-primary` (intentional — distinct from Pattern 2 which uses `text-hero-bg`). The "text-primary" deprecation in `09-design-system.md` § "Deprecated Patterns" applies to `text-primary` used as a TEXT-BUTTON COLOR on dark surfaces (e.g., a bare `text-primary` link), NOT to its use as the text color of a white-pill button (the button's background is white, not dark, so contrast applies against white — `text-primary` reads correctly on white). FeatureEmptyState's CTA is canonical as-is.

**For 5.5:** When migrating "Prayer not found" and "User not found" cards to FeatureEmptyState, use the default rendering. No `iconClassName` override needed (the brief did not specify a color override for these empty states). No CTA needed (the empty states are informational — "this prayer/user doesn't exist"; offering a CTA back to the feed is reasonable but optional. Plan-time CC decides per UX judgment).

### R-OVR-R9 — Daily Hub Canonical Pattern Catalog — see Section 5 below

The full catalog is the central deliverable of plan-time recon and is recorded as **Section 5** of this spec (prefixed before the Goal section). Every D-decision in Section 7 of the brief and every Acceptance Criterion in this spec references a catalog item.

### R-OVR-R10 — PrayerCard composition — VERIFIED

Brief R10 was substantially correct. Verified at `frontend/src/components/prayer-wall/PrayerCard.tsx:99–113`:

```tsx
<FrostedCard
  variant="default"
  as="article"
  aria-label={articleAriaLabel}
  className={cn(
    getPerTypeChromeClass(prayer.postType),
    'lg:hover:shadow-md lg:hover:shadow-black/20 transition-shadow motion-reduce:transition-none',
  )}
>
```

Confirms:

- Variant: `"default"` for ALL feed cards. Per-type chrome layered via `className`. This is the composition pattern 5.5's D8 preserves.
- `as="article"` for semantic correctness.
- `aria-label` switch by post type.
- `lg:hover:shadow-md lg:hover:shadow-black/20` — additional desktop-only hover shadow on top of FrostedCard's own hover shadow.
- `pulseTimeoutRef` + `ANIMATION_DURATIONS.pulse` already imported and consumed (verified — 5.4 shipped).
- No tier escalation logic; ALL consumers (feed/dashboard/profile/detail) get `variant="default"`. **R-OVR-R5 proposes adding a `tier` prop to expose the choice.**

### R-OVR-R11 — PrayerWallHero `action` prop — VERIFIED

Verified at `frontend/src/components/prayer-wall/PrayerWallHero.tsx:1–30`:

```tsx
interface PrayerWallHeroProps {
  /** CTA button rendered below the subtitle */
  action?: ReactNode
}

export function PrayerWallHero({ action }: PrayerWallHeroProps) {
  return (
    <section
      aria-labelledby="prayer-wall-heading"
      className="relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased"
    >
      <CinematicHeroBackground />
      <h1 id="prayer-wall-heading" className="..." style={GRADIENT_TEXT_STYLE}>Prayer Wall</h1>
      <p className="relative z-10 mx-auto max-w-xl text-base leading-relaxed text-white sm:text-lg">
        You&apos;re not alone.
      </p>
      {action && <div className="relative z-10 mt-6">{action}</div>}
    </section>
  )
}
```

- `action: ReactNode` — consumer renders any element.
- Wrapped in `<div className="relative z-10 mt-6">` — provides spacing and z-stacking; no chrome applied to the wrapped element.
- Hero already uses `CinematicHeroBackground` (Spec 14 Step 7 — verified) and `pt-[145px] pb-12` per the canonical Cinematic Hero Pattern.

**Implication for D10:** The migration target receives no chrome from the hero — whatever element is passed via `action` carries its own button affordances. D10 path 2 (`<FrostedCard as="button" type="button">`) renders the FrostedCard chrome directly as a button. Path 3 (thin `<button>` with FrostedCard classes inline) does the same with raw classes.

### R-OVR-R12 — Existing Button variants — VERIFIED; NO `frosted` variant

Verified at `frontend/src/components/ui/Button.tsx:13–14`:

```ts
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'light' | 'gradient' | 'subtle'
  // ...
}
```

- **No `frosted` variant exists in Button.tsx.** D10 path 1 (`<Button variant="frosted">`) is **unavailable.**
- **No `alertdialog` variant exists in Button.tsx**, despite `09-design-system.md` mentioning it. This is documented intent that hasn't shipped yet. **Out of scope for 5.5** — if Spec D11 wants the muted destructive treatment, it uses the muted destructive class string applied inline (`bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40`) without invoking a variant.
- Available variants relevant to 5.5:
  - `subtle` — canonical secondary CTA on dark per Visual Rollout. Class string: `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px]`. Use sizing `size="lg"` for `px-8 py-3 text-base`. **This is a very close match to the migration target's intent: frosted-glass button on dark, matches feed-card surface tone, supports hover elevation.** Recommended for D10.
  - `gradient` — canonical emotional-peak (the Pray-tab "Help Me Pray" pill). Wrong tone for "Share something" — that CTA is structural/navigational, not emotional-peak.
  - `light` — homepage primary white pill. Wrong tone for a frosted-glass surface.

**D10 resolution:** path 1 is unavailable. Choose between path 2 (`<FrostedCard as="button" type="button" onClick={...}>`) and path 3 (`<Button variant="subtle" size="lg">`).

**Recommended: path 3 — `<Button variant="subtle" size="lg">`.** Rationale:

- `Button variant="subtle"` is Visual Rollout's canonical secondary CTA on dark; using it here aligns Prayer Wall with the same Button discipline that the rest of the app applies.
- It produces a pill (`rounded-full`), which differs from FrostedCard's `rounded-3xl` card-shape — but a pill is what readers expect for a hero CTA, not a card. The migration target IS "a hero CTA," not "a feed card."
- `Button variant="subtle"` already includes hover lift, border emphasis, and the matching frosted surface tone (`bg-white/[0.07] border-white/[0.12]`). It IS the canonical "feed-card-tone button."
- It supports the existing onClick handler, type="button" by default (no accidental form submit), and standard focus ring.
- The existing CTA's `rounded-lg` (card-radius) is the deprecated shape for a hero pill; the pill (`rounded-full`) is canonical for the homepage primary CTA pattern (white pill) AND the Visual Rollout secondary CTA pattern. **Migration: shape changes from `rounded-lg` → `rounded-full` along with chrome.**

If at plan time the Daily Hub Canonical Pattern Catalog (Section 5) shows a contrasting canonical for "frosted button-card hero CTA" (e.g., a `FrostedCard as="button"` example), the spec consumes the corrected ranking and switches to path 2. Until then, path 3 is the resolution.

### R-OVR-R13 — Single-line input canonical chrome — PARTIAL-RESOLVED via plan-time recon

Daily Hub canonical input patterns: looking at the rule files, Daily Hub doesn't have a dedicated single-line input pattern (the JournalInput and PrayerInput are textareas, not single-line inputs). The closest analog is:

- The journal mode toggle button group (rolls-own muted-white pill active state).
- The Pray/Journal textarea pattern (violet glow — but for a 1-line input, the `shadow-[0_0_40px...]` second stop is too tall).

**Resolution for D9 single-line input chrome** (PrayerWallDashboard.tsx:381 display name input):

The canonical post-Visual-Rollout input chrome for a single-line input on dark, based on the rule files, is:

```
rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-white placeholder:text-white/40
focus:border-violet-400/30 focus:outline-none focus:ring-2 focus:ring-violet-400/30
```

Rationale:

- `rounded-lg` is appropriate for a single-line input (NOT `rounded-3xl` — that's card shape).
- `border-white/[0.12]` matches the Visual Rollout border-opacity unification.
- `bg-white/[0.04]` matches the textarea canonical surface from the textarea glow pattern.
- `placeholder:text-white/40` matches the textarea canonical placeholder color.
- Focus state inherits the textarea pattern's violet ring (lighter shadow than the textarea's two-stop glow — single-line inputs are short and don't need the full glow).
- No `shadow-[...rgba(167,139,250...)]` glow — that's reserved for the canonical Pray/Journal textareas which are emotionally weighted writing surfaces. A display-name input is utility, not emotional-peak; the lighter chrome is appropriate.

**This is a proposal, not a derived canonical.** Plan-time CC reads Daily Hub source one more time to confirm no single-line input exists with different canonical chrome; if one does (e.g., on a Settings sub-route), the spec adopts that. If none, the spec adopts the proposal above and records it as "intentional new canonical pattern for single-line inputs on dark," surfaceable to Eric at spec review.

### R-OVR-R14 — Comprehensive grep — additional surfaces beyond R2

Beyond the 8 pages-level sites in R2, recon found:

- **`font-serif italic` on bio paragraphs** (R-OVR-R3) — 2 sites, both pages-level.
- **`text-primary` text-button color** widespread in `components/prayer-wall/` (6 files) and pages-level (2 files) — R-OVR-R6.
- **`ring-primary` focus-ring color** widespread in `components/prayer-wall/` and pages-level — R-OVR-R6.
- **`rounded-2xl` inside ComposerChooser.tsx:115** on the inner type-card buttons. **Out of scope per W24** — these are `<button>` elements not card-shaped chrome, and 5.1's D6/D7 preserved them deliberately. `rounded-2xl` here is small-button shape, not deprecated card radius.
- **`shadow-md` on PrayerCard:108** as desktop-only hover shadow. **Out of scope** — this is an additional hover shadow layered on top of FrostedCard's own hover shadow; FrostedCard's shadow is canonical, the extra `shadow-md` is a desktop emphasis that doesn't conflict with master plan AC "no soft-shadow 8px-radius cards" (which targets pre-FrostedCard pre-Round-3 light-theme cards, not Round-3 FrostedCard cards with additional hover emphasis).
- **`shadow-md` on PrayerWall.tsx:903** for sticky filter bar. **Out of scope** — sticky-bar shadow is a different concern than the master plan AC.
- **`shadow-xl shadow-black/40` on ShareDropdown.tsx:143** for the dropdown menu shadow. **Out of scope** — dropdown menus have their own shadow canonical and `shadow-xl` is a deep modal-equivalent shadow, not the deprecated soft-8px shadow.

The R2 inventory + R-OVR-R3 (2 bio paragraphs) + R-OVR-R6 (text-primary/ring-primary in 6+ component files and 2 pages files) is the comprehensive migration scope.

### R-OVR-R15 — D11 destructive treatment class string drift

Brief D11 says: `bg-red-950/30 border-red-500/40`.

Canonical per `09-design-system.md` § "AlertDialog Pattern" + Deprecated Patterns table: `bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40`.

**Resolution:** Use the canonical (`border-red-400/30 text-red-100 hover:bg-red-900/40`) — the brief's class string is missing the text color and hover state and uses `/40` border opacity instead of canonical `/30`. The canonical wins per the rule of source-of-truth precedence stated at the top of this spec.

**Scope:** Plan-time CC greps for `bg-red-7` and `bg-red-8` in `frontend/src/pages/Prayer*.tsx` and `frontend/src/components/prayer-wall/`. Verified 2026-05-11 — no matches. Master plan AC "saturated `bg-red-700` / `bg-red-800`" is already satisfied by absence. **D11 thus becomes a verify-by-absence AC item.** If plan-time grep finds any saturated destructive buttons added between brief and execute, migrate per the canonical above.

---

## Section 5 — Daily Hub Canonical Pattern Catalog (Plan-Time Recon Deliverable)

This is the shared language for every migration decision in 5.5. Each catalog entry is referenced by the spec's D-decisions, W-watch-fors, and Acceptance Criteria via the catalog-item number (C1–C12). Brief Section 7's D-decisions are PRESERVED VERBATIM; this catalog confirms or refines the canonical they reference.

Sources read end-to-end at plan time:

- `frontend/src/pages/DailyHub.tsx` — canonical page composition; imports `BackgroundCanvas`, `CinematicHeroBackground`, `GRADIENT_TEXT_STYLE`, `SongPickSection`, all tab content components.
- `frontend/src/components/daily/PrayTabContent.tsx` — closest analog to a Prayer Wall content surface (a writing/interaction surface on dark with a CTA).
- `frontend/src/components/SongPickSection.tsx` — canonical FrostedCard-adjacent composition; no card wrapper, transparent surface.
- `frontend/src/components/homepage/FrostedCard.tsx` — the primitive (R-OVR-R7).
- `frontend/src/components/PageHero.tsx` — canonical hero treatment (now post-Cinematic-Hero-Rollout).
- `.claude/rules/09-design-system.md` § "Round 3 Visual Patterns", § "FrostedCard Tier System", § "BackgroundCanvas Atmospheric Layer", § "Cinematic Hero Pattern", § "White Pill CTA Patterns", § "Textarea Glow Pattern", § "Border Opacity Unification", § "AlertDialog Pattern", § "Deprecated Patterns" — the canonical source of truth.

### C1 — Card composition

Daily Hub composes cards using the **`FrostedCard` primitive at the appropriate variant tier** (R-OVR-R7). Three tiers:

- **Tier 1 (`variant="accent"`)**: Primary anchor on a surface. Eyebrow + violet leading dot + `text-violet-300` label. Used for the devotional reflection body, the devotional question card on the Devotional tab. The accent variant has a violet base (`bg-violet-500/[0.08]`), violet border (`border-violet-400/70`), and an internal top-edge gradient line (`before:` pseudo-element). Hover elevation when interactive.
- **Tier `variant="default"`**: General content. White-tinted base (`bg-white/[0.07]`), `border-white/[0.12]`, no eyebrow by default but supports it. Used for the saint quote card on Devotional tab, for navigable secondary cards.
- **`variant="subdued"`**: Quieter content. Reduced surface opacity (`bg-white/[0.05]`), tighter padding (`p-5`). Used for nested low-key context inside a parent article. CommentsSection on PrayerWall uses this variant per Spec 5.1.

Per-type chrome on PrayerCard (5.1's pattern) layers per-type accent CLASS STRINGS via `className` on top of `variant="default"` — NOT a 4th variant. This is the "5 per-type accents to 3 variants" composition decision from 5.1 D2 / brief D8. 5.5 preserves the composition and normalizes the opacities.

**Canonical pattern (verbatim):**

```tsx
<FrostedCard variant="accent" eyebrow="..." eyebrowColor="violet">  // Tier 1
<FrostedCard variant="default">                                     // Tier 2
<FrostedCard variant="subdued">                                     // Subdued
<FrostedCard variant="default" className={cn(getPerTypeChromeClass(...))}> // Per-type overlay
```

**Out of pattern (deprecated):**

```tsx
<div className="rounded-2xl border-white/10 bg-white/5 backdrop-blur-sm">  // rolls-own
<div className="rounded-xl border-white/10 bg-white/[0.06] p-X">           // rolls-own
```

### C2 — Color palette

- **Primary palette**: white-on-dark for body content, violet for accents. Daily Hub heavily uses `text-white` for reading content (post Spec T) and `text-white/70` / `text-white/60` for secondary text per WCAG AA standards.
- **Gradient text** (`GRADIENT_TEXT_STYLE` constant from `constants/gradients.tsx`): used on h1 wordmarks, the hero greeting, and one anchor word per hero. White-to-purple gradient via `background-clip: text`. **Reserved** — Daily Hub does NOT use gradient text on body content, card titles, or buttons. Brief D6 preserves this.
- **Per-type accent colors on Prayer Wall** (testimony amber, question cyan, discussion violet, encouragement rose) are quiet — they signal type, not importance. Canonical opacities per `09-design-system.md`: `/[0.08]` background, `/[0.12]` borders (Visual Rollout border-opacity unification). Brief D8 / W16 / W17 are the source-of-truth here; D8's proposed PER_TYPE_CHROME post-5.5 values are canonical.
- **Severity colors** (Visual Rollout severity refresh): `text-emerald-300` / `text-red-300` / `text-amber-300`. The deprecated `text-success` / `text-danger` / `text-warning` CSS-variable colors are out.
- **Text-button on dark**: `text-violet-300 hover:text-violet-200`. The deprecated `text-primary` and `text-primary-lt` are out (Spec 10A WCAG AA fix).

### C3 — Tier hierarchy

Three tiers govern any inner page on Daily-Hub-equivalent surfaces:

- **Tier 1 accent** — primary anchor on a surface (today's devotional on Daily Hub, the active prayer on PrayerDetail per brief D2 / R-OVR-R5).
- **Tier 2 default** — secondary content (recent journal entries on Dashboard, today's prayer prompt on Daily Hub, comments on PrayerDetail per D2, prayer history list on PrayerWallProfile per D2).
- **Tier 3 subdued** — tertiary content (saint quotes on Devotional tab — but Devotional uses `variant="default"` for the quote per the rule file; subdued is reserved for genuinely nested low-key panels).

Brief D2 maps tiers per Prayer Wall route. Verified consistent with C3.

Feed surfaces (`/prayer-wall`) have **no Tier 1 anchor** — the feed is an equally-weighted stream. All feed cards are Tier 2 default + per-type overlay. Brief D2's "social-feed metaphor" framing is canonical.

### C4 — Geometry

- **Default radius**: `rounded-3xl` (FrostedCard's built-in default — applies to every card-shaped surface). Computed `border-radius: 24px`. The deprecated `rounded-2xl` (16px) is out.
- **Pill radius**: `rounded-full` for buttons. Pattern 1 inline CTA and Pattern 2 homepage primary CTA both use `rounded-full`. `Button variant="subtle"` and `variant="gradient"` use `rounded-full`. The deprecated `rounded-lg` for hero CTAs is out (Prayer Wall's current "Share something" uses `rounded-lg` — D10 changes this).
- **Small radius for chips / single-line inputs / dropdown items**: `rounded-lg` is acceptable for non-card surfaces (R-OVR-R13).
- **Padding**: `p-6` for default/accent FrostedCard; `p-5` for subdued; `p-8` for empty-state cards (R-OVR-R8 — current rolls-own pattern uses `p-8`; FeatureEmptyState renders its own container with `py-12 px-6` and the heading/description sized appropriately; the migrated empty states inherit the canonical FeatureEmptyState rendering and do NOT carry over the `p-8` padding).

### C5 — Hero treatment

Cinematic Hero Pattern post-Spec-14 (`09-design-system.md` § "Cinematic Hero Pattern"):

- `<Navbar transparent />` outer chrome.
- `<BackgroundCanvas>` wraps the entire page contents at the root.
- Hero `<section>` with `position: relative` and `pt-[145px] pb-12` constant padding.
- `<CinematicHeroBackground />` as the FIRST child of the hero section.
- Content children with `relative z-10`.
- Gradient text on the h1 wordmark via `GRADIENT_TEXT_STYLE`.

`/prayer-wall` already conforms via `PrayerWallHero.tsx` (Spec 14 Step 7 + 5.2 ✅). PrayerDetail, PrayerWallDashboard, PrayerWallProfile are **sub-routes** — they do NOT have cinematic heroes. They render under `<PageShell>` (which provides Navbar + page chrome) with their own page-level main content. 5.5 does NOT add cinematic heroes to sub-routes (out of scope).

### C6 — Atmospheric layering

One continuous BackgroundCanvas at the page root provides the atmosphere. **No per-section glow background, no per-card glow overlay, no inline atmospheric treatment** on any page-level surface (Brief D5).

`PrayerWall.tsx:806` already wraps in `<BackgroundCanvas>` (Spec 14 Step 6 — verified). Sub-routes (PrayerDetail, PrayerWallDashboard, PrayerWallProfile) render under `<PageShell>` — which itself sits over the page-default atmospheric layer. 5.5 does NOT change atmospheric layering.

`HorizonGlow.tsx` is orphaned legacy post-Visual-Rollout (`09-design-system.md` "Deprecated Patterns" — pending cleanup spec). Not relevant to 5.5 (not consumed on Prayer Wall).

### C7 — Hover / focus interaction

- **FrostedCard hover** (when interactive via `onClick`): `hover:bg-white/[0.10] hover:shadow-frosted-hover hover:-translate-y-0.5` for default variant. Accent variant has a parallel hover pattern with violet halo.
- **Button hover** (subtle variant): `hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5`.
- **Focus rings** — `focus-visible:ring-2 ring-white/50` (canonical post-Spec-10A muted-white halo) OR `focus-visible:ring-violet-300` (gradient variant only). Prayer Wall currently uses `ring-primary` widely (R-OVR-R6); migration to `ring-white/50` is canonical per Spec 10A audit. Selected-card ring (`ring-violet-400/60`) is the canonical selection state on cards.
- **`active:scale-[0.98]`** is the canonical press feedback for tappable buttons (`09-design-system.md` § "Button press feedback").

### C8 — Transitions

All animations use canonical duration and easing tokens from `frontend/src/constants/animation.ts` (BB-33, Spec 5.4):

- `duration-fast` (150ms) — hover states, micro-interactions.
- `duration-base` (250ms) — modal open/close, drawer slide, tab transitions.
- `duration-slow` (400ms) — page transitions, celebration sequences.
- `duration-pulse` (300ms) — PrayerCard pulse animation (5.4 token).
- `duration-ceremony` (600ms) — InteractionBar whisper-pulse (5.4 token).

Easings: `ease-standard`, `ease-decelerate`, `ease-accelerate`, `ease-sharp`.

5.5 inherits Spec 5.4's token migration. Prayer Wall components already use canonical tokens (verified — 5.4 ✅ shipped). 5.5 does NOT introduce new tokens or hardcode any `200ms` / `cubic-bezier(...)` string.

### C9 — Empty states

`FeatureEmptyState` is the canonical empty-state primitive (BB-34). Used 10+ times across the app, including 5+ existing usages on Prayer Wall (R-OVR-R4). Props per R-OVR-R8.

Rolls-own "not found" cards (`<div className="rounded-xl border-white/10 bg-white/[0.06] p-8 text-center">`) are deprecated.

**Migration target for 5.5**:

- `PrayerDetail.tsx:330` "Prayer not found" → `<FeatureEmptyState icon={...} heading="Prayer not found" description="This prayer request may have been removed or the link is invalid." />`. Icon choice: `AlertCircle` from `lucide-react` (consistent with `PrayerWall.tsx:850–852` fetch-error empty state).
- `PrayerWallProfile.tsx:214` "User not found" → `<FeatureEmptyState icon={...} heading="User not found" description="This profile doesn't exist or has been removed." />`. Icon choice: `UserX` or `AlertCircle` — plan-time CC picks (recommend `AlertCircle` for consistency).

No CTA — empty states are informational, and offering "go back to Prayer Wall" via CTA is reasonable but optional. Plan-time CC decides; default to no CTA per brand voice (the user's choice to navigate away should not be hyper-prescribed by the empty state).

### C10 — Dialog chrome

AlertDialog Pattern (`09-design-system.md` § "AlertDialog Pattern"):

- Destructive confirmations use `<Button variant="alertdialog">` (**NOT YET SHIPPED in Button.tsx per R-OVR-R12** — for 5.5, use inline class string per R-OVR-R15: `bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40`).
- `AlertTriangle` icon (Lucide) in the heading row.
- Saturated `bg-red-700` / `bg-red-800` deprecated (R-OVR-R14 confirmed absent in Prayer Wall — verify-by-absence AC item).

5.5 does NOT introduce new dialog chrome; it verifies absence and migrates any saturated destructive button that surfaces (none expected per R-OVR-R14).

### C11 — Form input chrome

- **Textareas (multi-line, emotional-peak writing surfaces — Pray/Journal/bio)**: Canonical violet glow per `09-design-system.md` § "Textarea Glow Pattern":

  ```
  shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)]
  border border-violet-400/30 bg-white/[0.04]
  focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30
  placeholder:text-white/40
  ```

  Applied to PrayTabContent's PrayerInput and JournalTabContent's JournalInput. Brief D9 maps PrayerWallDashboard's bio textarea (L418) to this pattern.

- **Single-line inputs**: No Daily Hub canonical exists per R-OVR-R13. The recommended pattern (also documented in R-OVR-R13):

  ```
  rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-white placeholder:text-white/40
  focus:border-violet-400/30 focus:outline-none focus:ring-2 focus:ring-violet-400/30
  ```

  Applied to PrayerWallDashboard's display-name input (L381).

### C12 — Button variants

- **`Button variant="gradient" size="lg"`** — emotional-peak (e.g., Pray-tab "Help Me Pray", Journal-tab "Save Entry"). NOT used on Prayer Wall hero CTAs.
- **`Button variant="subtle" size="lg"`** — secondary CTA on dark. **Canonical for "Share something" per D10 / R-OVR-R12.**
- **Pattern 1 inline white-pill CTA** — used by FeatureEmptyState's CTA and by Daily Hub cross-feature CTAs ("Journal about this question", "Meditate on this passage"). White surface, `text-primary` text color, `min-h-[44px]` touch target.
- **Pattern 2 homepage primary CTA** — used by "Get Started" on FinalCTA and similar emotional-peak buttons. White surface, `text-hero-bg` text color, white drop shadow. NOT used on Prayer Wall.
- **No `frosted` variant** (R-OVR-R12).
- **No `alertdialog` variant in Button.tsx yet** (R-OVR-R12) — destructive confirmations use inline class string (R-OVR-R15).

---

## Goal

Reverse Spec 5.1 W8's opacity freeze across the per-type chrome constants; migrate eight pages-level inline frosted patterns to canonical primitives (`FrostedCard` with appropriate variants, `FeatureEmptyState` for empty states); migrate the bio textarea to the canonical violet textarea glow; migrate the display-name input to the canonical single-line input chrome (R-OVR-R13); migrate the "Share something" hero CTA to `<Button variant="subtle" size="lg">` (R-OVR-R12); migrate two `font-serif italic` bio paragraphs to `font-sans` non-italic (R-OVR-R3); migrate widespread `text-primary` text-button color to `text-violet-300 hover:text-violet-200` across `components/prayer-wall/` and pages-level (R-OVR-R6); migrate widespread `ring-primary` focus-ring color to canonical `ring-white/50` halo (R-OVR-R6); add a `tier` prop to PrayerCard so PrayerDetail can render its main card as Tier 1 accent without refactoring the 5.1 FrostedCard migration (R-OVR-R5); update the `post-type-chrome.ts` comment block per D12 to reverse the 5.1 W8 freeze directive.

After 5.5 ships, Prayer Wall reads visually as the same product as Daily Hub — the FrostedCard tier system applied per route, the canonical opacities throughout, no rolls-own inline frosted patterns, no `font-serif italic`, no deprecated text-button or focus-ring colors, no `rounded-2xl` card chrome, no soft-shadow inline cards. Manual visual audit by Eric (side-by-side `/daily` vs each Prayer Wall route at 1440px and 375px) is the final gate.

5.5 is **pure-frontend**. No backend changes, no schema changes, no API changes, no new npm dependencies, no public-API changes to any non-PrayerCard component. PrayerCard gains exactly one optional prop (`tier?: 'feed' | 'detail'`) per R-OVR-R5.

---

## Approach

### Step 1 — `frontend/src/constants/post-type-chrome.ts` opacity normalization + comment block reversal (D8, D12, W-OVERRIDE-5.1)

Replace the file's contents with:

```ts
import type { PostType } from '@/constants/post-types'

/**
 * Per-type accent layer for Prayer Wall cards. Layered on top of
 * `<FrostedCard variant="default">` via the `className` prop. Provides
 * the per-type border and background tint at canonical Visual Rollout
 * opacities (/[0.12] borders, /[0.08] backgrounds).
 *
 * Spec 5.5 (2026-05-??) normalized these opacities from the deprecated
 * /[0.04] backgrounds and /10 borders that Spec 5.1 W8 preserved during
 * the FrostedCard migration. The 5.1 W8 directive ("opacities NOT to be
 * normalized") was a scoping decision specific to that migration and is
 * reversed here. Canonical opacities are documented in
 * .claude/rules/09-design-system.md § Deprecated Patterns.
 *
 * Per-type COLORS (amber for testimony, cyan for question, violet for
 * discussion, rose for encouragement) are intentional and not affected
 * by the opacity normalization.
 */
export const PER_TYPE_CHROME: Record<PostType, string> = {
  prayer_request: '',
  testimony: 'border-amber-200/[0.12] bg-amber-500/[0.08]',
  question: 'border-cyan-200/[0.12] bg-cyan-500/[0.08]',
  discussion: 'border-violet-200/[0.12] bg-violet-500/[0.08]',
  encouragement: 'border-rose-200/[0.12] bg-rose-500/[0.08]',
}

export function getPerTypeChromeClass(postType: PostType): string {
  return PER_TYPE_CHROME[postType]
}
```

The comment block now records 5.5's reversal of 5.1 W8 and points readers to `09-design-system.md` for the canonical opacities. Future engineers reading this file no longer encounter the W8 freeze directive (W18).

Border opacity: `/[0.12]` matches the Visual Rollout border-opacity unification canonical for decorative borders on dark (C7 / `09-design-system.md` § "Border Opacity Unification"). Background opacity: `/[0.08]` matches the Visual Rollout per-type accent canonical (`09-design-system.md` § "Deprecated Patterns" row `bg-violet-500/[0.04]` → `bg-violet-500/[0.08]`).

### Step 2 — Add `tier` prop to PrayerCard (R-OVR-R5)

Modify `frontend/src/components/prayer-wall/PrayerCard.tsx`:

1. Add to `PrayerCardProps` interface:

   ```ts
   /** Spec 5.5 — Tier 1 elevation for PrayerDetail's main card; Tier 2 default for feed/dashboard/profile. */
   tier?: 'feed' | 'detail'
   ```

2. Add to destructured props with default:

   ```tsx
   export function PrayerCard({
     prayer,
     showFull = false,
     onCategoryClick,
     children,
     index = 99,
     tier = 'feed',
   }: PrayerCardProps) {
   ```

3. Change the FrostedCard invocation from hardcoded `variant="default"` to:

   ```tsx
   <FrostedCard
     variant={tier === 'detail' ? 'accent' : 'default'}
     as="article"
     aria-label={articleAriaLabel}
     className={cn(
       getPerTypeChromeClass(prayer.postType),
       'lg:hover:shadow-md lg:hover:shadow-black/20 transition-shadow motion-reduce:transition-none',
     )}
   >
   ```

4. **Per-type chrome interaction with `tier="detail"`**: When `tier="detail"` AND `prayer.postType !== 'prayer_request'`, the per-type chrome overlay (e.g., `border-amber-200/[0.12] bg-amber-500/[0.08]`) layers on top of the violet accent base. This produces a hybrid visual: violet violet-base + per-type amber wash. **This is intentional** — the detail-page anchor is Tier 1 accent (violet semantics) AND carries its post-type signal (amber for testimony). The layering reads as a tinted accent card.

   For `prayer_request` post type (empty per-type chrome string), the detail card renders as pure Tier 1 accent — no overlay. This matches D8's W17 directive that `prayer_request` stays untinted.

   **Verify at runtime** during `/verify-with-playwright`: PrayerDetail with a `testimony` post — does the hybrid (violet + amber) read as "Tier 1 anchor with testimony signal" or as a muddy overlay? If muddy, an alternative composition is: **only apply per-type chrome when `tier="feed"`**:

   ```tsx
   className={cn(
     tier === 'feed' && getPerTypeChromeClass(prayer.postType),
     'lg:hover:shadow-md lg:hover:shadow-black/20 transition-shadow motion-reduce:transition-none',
   )}
   ```

   **This alternative is the safe default.** The visual judgment "violet anchor + amber overlay reads cleanly" requires the manual audit. If the audit prefers the cleaner option (Tier 1 accent without per-type wash on the detail anchor), this is the implementation. **Recommended: use the safe default (no per-type chrome when tier="detail").** Plan-time CC implements this and the manual audit confirms.

5. `PrayerDetail.tsx:363` updates: `<PrayerCard prayer={prayer} showFull tier="detail">`.

### Step 3 — `pages/PrayerDetail.tsx` migrations

1. Add import: `import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'` (already imported in other Prayer Wall pages — this is the new addition).
2. Add icon import: `import { AlertCircle } from 'lucide-react'` (already imported in `PrayerWall.tsx` for similar use; add it here).
3. Replace L320–339 "Prayer not found" branch:

   ```tsx
   if (notFound || !prayer) {
     return (
       <PageShell>
         <main id="main-content" className="mx-auto max-w-[720px] px-4 py-6">
           <div className="mb-6">
             <Breadcrumb
               items={[{ label: 'Prayer Wall', href: '/prayer-wall' }, { label: 'Prayer Request' }]}
               maxWidth="max-w-[720px]"
             />
           </div>
           <FeatureEmptyState
             icon={AlertCircle}
             heading="Prayer not found"
             description="This prayer request may have been removed or the link is invalid."
           />
         </main>
       </PageShell>
     )
   }
   ```

4. Update L363 `PrayerCard` invocation: `<PrayerCard prayer={prayer} showFull tier="detail">`.

### Step 4 — `pages/PrayerWallProfile.tsx` migrations

1. (FeatureEmptyState and AlertCircle are already imported — verified.)
2. Replace L204–223 "User not found" branch:

   ```tsx
   if (!flagOn && !mockProfileUser) {
     return (
       <PageShell>
         <main id="main-content" className="mx-auto max-w-[720px] px-4 py-6">
           <div className="mb-6">
             <Breadcrumb
               items={[{ label: 'Prayer Wall', href: '/prayer-wall' }, { label: 'User Profile' }]}
               maxWidth="max-w-[720px]"
             />
           </div>
           <FeatureEmptyState
             icon={AlertCircle}
             heading="User not found"
             description="This profile doesn't exist or has been removed."
           />
         </main>
       </PageShell>
     )
   }
   ```

3. Replace L408–425 (the flag-off replies tab — comment list items + the "No replies yet." fallback). The L412 comment list item card pattern migrates to `<FrostedCard variant="default" className="p-4">` with the inner paragraph and Link preserved. The L424 "No replies yet." paragraph is left as-is (it's a single line of text, not a card; FeatureEmptyState would be overkill).

   ```tsx
   {activeTab === 'replies' && (
     <div className="flex flex-col gap-3">
       {flagOn ? (
         <FeatureEmptyState
           icon={MessageCircle}
           heading="Replies are coming soon"
           description="We'll show this person's replies in a future update."
           compact
         />
       ) : userComments.length > 0 ? (
         userComments.map((comment) => (
           <FrostedCard key={comment.id} variant="default" className="p-4">
             <p className="whitespace-pre-wrap text-sm text-white/80">{comment.content}</p>
             <Link
               to={`/prayer-wall/${comment.prayerId}`}
               className="mt-2 block text-xs text-violet-300 hover:text-violet-200 hover:underline"
             >
               View prayer
             </Link>
           </FrostedCard>
         ))
       ) : (
         <p className="py-8 text-center text-sm text-white/50">No replies yet.</p>
       )}
     </div>
   )}
   ```

   Note: `<FrostedCard>` defaults to `as="div"` and `variant="default"`. The `className="p-4"` here OVERRIDES FrostedCard's built-in `p-6` for default variant. **Verify this works** — FrostedCard's variant base classes use `p-6`; passing `p-4` via `className` should merge via `cn()` and the latter wins (Tailwind class precedence via `tailwind-merge`). Plan-time CC verifies the merge and tests render correctly.

4. Replace L275 bio paragraph (R-OVR-R3 — `font-serif italic` migration):

   ```tsx
   <p className="mt-2 max-w-md text-white/70">{profileChrome.bio}</p>
   ```

   Drops `font-serif` and `italic`. Default `font-sans` inherits from Tailwind body font (Inter).

### Step 5 — `pages/PrayerWallDashboard.tsx` migrations

The largest migration target — five sites + R-OVR-R3 bio + R-OVR-R6 text-primary instances.

1. (FeatureEmptyState is already imported — verified.)

2. **L381 display name input (R-OVR-R13 canonical):**

   ```tsx
   <input
     type="text"
     value={displayName}
     onChange={(e) => setDisplayName(e.target.value)}
     className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-1 text-xl font-semibold text-white placeholder:text-white/40 focus:border-violet-400/30 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
     aria-label="Display name"
   />
   ```

3. **L418 bio textarea (D9 canonical violet textarea glow):**

   ```tsx
   <textarea
     value={bio}
     onChange={(e) => {
       if (e.target.value.length <= 500) {
         setBio(e.target.value)
       }
     }}
     className="w-full resize-none rounded-lg border border-violet-400/30 bg-white/[0.04] p-3 text-sm text-white placeholder:text-white/40 shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
     rows={3}
     aria-label="Bio"
   />
   ```

   Verbatim canonical violet glow pattern per C11 / `09-design-system.md` § "Textarea Glow Pattern". Border radius stays `rounded-lg` (a small textarea is shape-appropriate for `lg`; the glow pattern doesn't prescribe a specific radius — it prescribes the shadow + border + bg).

4. **L438 bio fallback paragraph (R-OVR-R3 — `font-serif italic` migration):**

   ```tsx
   <p className="max-w-md text-white/70">{bio || 'Add a bio...'}</p>
   ```

5. **L600 comment list item card (My Comments tab):**

   ```tsx
   <FrostedCard key={comment.id} variant="default" className="p-4">
     <p className="whitespace-pre-wrap text-sm text-white/80">{comment.content}</p>
     <Link
       to={`/prayer-wall/${comment.prayerId}`}
       className="mt-2 block text-xs text-violet-300 hover:text-violet-200 hover:underline"
     >
       View prayer
     </Link>
   </FrostedCard>
   ```

6. **L722 notification preferences card (Settings tab):**

   ```tsx
   {activeTab === 'settings' && (
     <FrostedCard variant="default" className="p-5">
       <h2 className="mb-4 text-lg font-semibold text-white">Notification Preferences</h2>
       <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-900/20 p-3">
         <p className="text-sm text-amber-200">Notifications coming soon</p>
       </div>
       {NOTIFICATION_TYPES.map((type) => (
         <label
           key={type.key}
           className="flex items-center justify-between border-b border-white/[0.12] py-3 last:border-0"
         >
           <span className="text-sm text-white/70">{type.label}</span>
           <input
             type="checkbox"
             defaultChecked
             disabled
             className="h-4 w-4 rounded border-white/20 text-violet-300 accent-violet-300"
           />
         </label>
       ))}
     </FrostedCard>
   )}
   ```

   Notes:
   - The inner `rounded-lg border border-amber-500/30 bg-amber-900/20 p-3` "Notifications coming soon" inline panel stays as-is — it's a semantic info banner using the amber severity treatment, NOT a card-shape chrome violation.
   - `border-b border-white/[0.12]` on the label rows updates the deprecated `border-white/10`.
   - `text-primary accent-primary` on the checkbox updates to `text-violet-300 accent-violet-300` per R-OVR-R6 canonical (note: `accent-violet-300` is Tailwind syntax for the `accent-color` CSS property; verify it produces the expected checkbox accent — if not, fall back to `accent-[#8B5CF6]` to match the legacy `accent-primary` color hex).

7. **R-OVR-R6 — `text-primary` text-button migrations in PrayerWallDashboard.tsx:**

   - L401: `text-white/50 hover:text-primary` → `text-white/50 hover:text-violet-300` (edit-name pencil button). `focus-visible:ring-2 focus-visible:ring-primary` → `focus-visible:ring-2 focus-visible:ring-white/50`.
   - L442: `text-text-light hover:text-primary focus-visible:ring-2 focus-visible:ring-primary` → `text-text-light hover:text-violet-300 focus-visible:ring-2 focus-visible:ring-white/50` (edit-bio pencil button).
   - L605: `text-primary hover:underline` → `text-violet-300 hover:text-violet-200 hover:underline` (View prayer link inside comment cards).
   - L737: `text-primary accent-primary` (handled in Step 5.6 above).

### Step 6 — `pages/PrayerWall.tsx` "Share something" CTA migration (D10 / R-OVR-R12)

Replace L809–844's `<PrayerWallHero action={...} />` action element:

**Logged-in branch (L812–833):**

```tsx
{isAuthenticated ? (
  <div
    ref={composerRef}
    className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
    {...(composerTooltip.shouldShow ? { 'aria-describedby': 'prayer-wall-composer' } : {})}
  >
    <Button
      variant="subtle"
      size="lg"
      onClick={() => setChooserOpen(true)}
    >
      Share something
    </Button>
    <Link
      to="/prayer-wall/dashboard"
      className="inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
    >
      <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
      My Dashboard
    </Link>
  </div>
) : (
```

**Logged-out branch (L834–842):**

```tsx
  <Button
    variant="subtle"
    size="lg"
    onClick={() => openAuthModal?.('Sign in to share something')}
  >
    Share something
  </Button>
)}
```

The `import { Button } from '@/components/ui/Button'` import already exists in `PrayerWall.tsx` (verify at plan-time; if not, add it).

Spec-tracker AC item 11 of brief Section 11 — "Share Something hero CTA at PrayerWall.tsx L822/L838 migrated per D10 plan-time resolution" — is satisfied.

### Step 7 — `components/prayer-wall/` text-primary / ring-primary migrations (R-OVR-R6)

Plan-time CC reads each file and migrates per the canonical (`text-primary` → `text-violet-300 hover:text-violet-200`, `ring-primary` → `ring-white/50`). The migration scope:

- `CommentItem.tsx` — L38, L45, L98. The @-mention author link styling (`font-semibold text-primary hover:underline`) migrates to `font-semibold text-violet-300 hover:text-violet-200 hover:underline`. Inline @-mention pills migrate to `text-violet-300`. Reply-button hover: `hover:text-primary focus-visible:ring-2 focus-visible:ring-primary` → `hover:text-violet-300 focus-visible:ring-2 focus-visible:ring-white/50`.
- `CommentInput.tsx` — L113 input focus ring: `focus-visible:ring-2 focus-visible:ring-primary` → `focus-visible:ring-2 focus-visible:ring-white/50`. L128 submit-button focus ring: same. L129 enabled-state color: `text-primary hover:text-primary-lt` → `text-violet-300 hover:text-violet-200`. L160, L172 helper-text underline links: `text-primary underline` → `text-violet-300 hover:text-violet-200 underline`.
- `CommentsSection.tsx` — L79, L98, L105 expand-button colors: `text-primary` and `text-primary-lt` → `text-violet-300 hover:text-violet-200`.
- `InteractionBar.tsx` — L50 base class focus ring: `focus-visible:ring-2 focus-visible:ring-primary` → `focus-visible:ring-2 focus-visible:ring-white/50`. L146 active-pray color: `font-medium text-primary` → `font-medium text-violet-300`. L172 animated count text: `text-primary motion-safe:animate-pray-float-text` → `text-violet-300 motion-safe:animate-pray-float-text`. L202–203 bookmark active: `text-primary` → `text-violet-300`. L214 share button hover: `hover:text-primary` → `hover:text-violet-300`.
- `AuthModal.tsx` — L338, L390, L592, L690, L701 focus rings: `focus-visible:ring-2 focus-visible:ring-primary` → `focus-visible:ring-2 focus-visible:ring-white/50`. The `text-purple-400 hover:text-purple-300` action text colors stay AS-IS — they're already using a canonical purple value (NOT `text-primary`); migrating them would change the color tone, which is out of scope for an `text-primary` migration. L608 checkbox: `text-primary` → `text-violet-300` for the `accent-color` analog.
- `ReportDialog.tsx` — L211 textarea focus ring: `focus-visible:ring-2 focus-visible:ring-primary` → `focus-visible:ring-2 focus-visible:ring-white/50`.

**Defense-in-depth:** Plan-time CC greps `frontend/src/components/prayer-wall/` and `frontend/src/pages/Prayer*.tsx` AFTER migration:

```bash
grep -rnE "text-primary[^-]|ring-primary[^-]|hover:text-primary|focus-visible:ring-primary" \
  frontend/src/components/prayer-wall/ \
  frontend/src/pages/Prayer*.tsx \
  --include="*.tsx" \
  | grep -v __tests__
```

Expected post-migration: zero matches OR only intentionally-preserved matches (e.g., the `accent-primary` CSS property on the checkbox if Tailwind's `accent-violet-300` doesn't produce the expected rendering — verify-then-decide; the spec defaults to migrating).

### Step 8 — Tests (Section 9 of brief, refined post-recon)

Test count delta: estimated +30 to +40 new test assertions, ~12 assertion updates, ~2 new test files. Plan-time CC produces exact delta.

#### Test 1 — `frontend/src/constants/__tests__/post-type-chrome.test.ts` (NEW)

Locks canonical opacities:

```ts
import { describe, it, expect } from 'vitest'
import { PER_TYPE_CHROME, getPerTypeChromeClass } from '@/constants/post-type-chrome'

describe('PER_TYPE_CHROME (Spec 5.5 canonical Visual Rollout opacities)', () => {
  it('prayer_request is empty (no per-type overlay)', () => {
    expect(PER_TYPE_CHROME.prayer_request).toBe('')
  })

  it('testimony uses canonical /[0.08] background and /[0.12] border (amber)', () => {
    expect(PER_TYPE_CHROME.testimony).toContain('bg-amber-500/[0.08]')
    expect(PER_TYPE_CHROME.testimony).toContain('border-amber-200/[0.12]')
  })

  it('question uses canonical /[0.08] background and /[0.12] border (cyan)', () => {
    expect(PER_TYPE_CHROME.question).toContain('bg-cyan-500/[0.08]')
    expect(PER_TYPE_CHROME.question).toContain('border-cyan-200/[0.12]')
  })

  it('discussion uses canonical /[0.08] background and /[0.12] border (violet)', () => {
    expect(PER_TYPE_CHROME.discussion).toContain('bg-violet-500/[0.08]')
    expect(PER_TYPE_CHROME.discussion).toContain('border-violet-200/[0.12]')
  })

  it('encouragement uses canonical /[0.08] background and /[0.12] border (rose)', () => {
    expect(PER_TYPE_CHROME.encouragement).toContain('bg-rose-500/[0.08]')
    expect(PER_TYPE_CHROME.encouragement).toContain('border-rose-200/[0.12]')
  })

  it('does NOT contain deprecated /[0.04] background opacity', () => {
    const allValues = Object.values(PER_TYPE_CHROME).join(' ')
    expect(allValues).not.toContain('/[0.04]')
  })

  it('does NOT contain deprecated /10 border opacity', () => {
    const allValues = Object.values(PER_TYPE_CHROME).join(' ')
    expect(allValues).not.toMatch(/border-\w+-\d+\/10\b/)
  })

  it('preserves per-type COLORS unchanged (amber/cyan/violet/rose)', () => {
    expect(PER_TYPE_CHROME.testimony).toContain('amber')
    expect(PER_TYPE_CHROME.question).toContain('cyan')
    expect(PER_TYPE_CHROME.discussion).toContain('violet')
    expect(PER_TYPE_CHROME.encouragement).toContain('rose')
  })

  it('getPerTypeChromeClass returns the right string per post type', () => {
    expect(getPerTypeChromeClass('prayer_request')).toBe('')
    expect(getPerTypeChromeClass('testimony')).toBe(PER_TYPE_CHROME.testimony)
    expect(getPerTypeChromeClass('question')).toBe(PER_TYPE_CHROME.question)
    expect(getPerTypeChromeClass('discussion')).toBe(PER_TYPE_CHROME.discussion)
    expect(getPerTypeChromeClass('encouragement')).toBe(PER_TYPE_CHROME.encouragement)
  })
})
```

The deprecated-opacity guard tests are the canonical regression net for W-OVERRIDE-5.1 (W18).

#### Test 2 — `frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx` (MODIFIED)

Plan-time CC reads PrayerCard.test.tsx and enumerates assertion sites. Expected updates:

- Any existing assertion against `bg-{color}-500/[0.04]` updates to `bg-{color}-500/[0.08]`.
- Any existing assertion against `border-{color}-200/10` updates to `border-{color}-200/[0.12]`.
- New assertions: PrayerCard renders with `tier="feed"` default (no prop) → FrostedCard with `variant="default"`; PrayerCard with `tier="detail"` → FrostedCard with `variant="accent"`. Tests assert the rendered output's className contains the canonical accent classes (`bg-violet-500/[0.08]` and `border-violet-400/70`) when `tier="detail"`.
- New assertion: PrayerCard with `tier="detail"` and `postType="testimony"` does NOT include the per-type chrome string `bg-amber-500/[0.08]` (per Step 2's recommended safe-default — no per-type overlay on detail tier).

#### Test 3 — `pages/__tests__/PrayerWallDashboard.test.tsx` (MODIFIED or NEW)

Plan-time CC checks for existing file. Expected coverage:

- Display name input renders with canonical R-OVR-R13 chrome (`bg-white/[0.04] border-white/[0.12] focus:ring-violet-400/30`).
- Bio textarea renders with canonical violet textarea glow (`shadow-[0_0_20px_rgba(167,139,250,0.18)...] border-violet-400/30 bg-white/[0.04]`).
- Bio paragraph (non-editing fallback) renders WITHOUT `font-serif` and WITHOUT `italic`.
- Comment list item card (My Comments tab) renders as `<FrostedCard variant="default">` (DOM presence assertion: the rendered element has the canonical default-variant class string `bg-white/[0.07]` + `border-white/[0.12]` + `rounded-3xl`).
- Notification preferences card (Settings tab) renders as `<FrostedCard variant="default" className="p-5">`. Inner amber info banner preserved.
- Empty state for "no data" cases renders as `<FeatureEmptyState>` (already in place — verify).

#### Test 4 — `pages/__tests__/PrayerDetail.test.tsx` (MODIFIED or NEW)

Expected coverage:

- Active prayer card renders as PrayerCard with `tier="detail"` (DOM presence — the rendered FrostedCard has the canonical accent class string).
- Comment list items render as the comment-item DOM structure under CommentsSection (which is already at `variant="subdued"` per 5.1).
- "Prayer not found" empty state renders as `<FeatureEmptyState>` with heading "Prayer not found" and the AlertCircle icon (verify icon presence via aria-hidden semantic equivalent).

#### Test 5 — `pages/__tests__/PrayerWallProfile.test.tsx` (MODIFIED)

Expected coverage:

- User header card renders without `font-serif italic` on the bio paragraph.
- Prayer history list cards render as PrayerCard with `tier="feed"` default.
- "User not found" empty state renders as `<FeatureEmptyState>` with heading "User not found".
- Comment list items (Replies tab — flag-off branch) render as `<FrostedCard variant="default">` instead of rolls-own `rounded-xl border-white/10 bg-white/[0.06]`.

#### Test 6 — `pages/__tests__/PrayerWall.test.tsx` (MODIFIED — file exists)

Expected coverage:

- "Share something" hero CTA renders as `<Button variant="subtle" size="lg">` (DOM presence: the rendered button has the canonical subtle-variant class string `rounded-full bg-white/[0.07] border-white/[0.12] backdrop-blur-sm`).
- Both logged-in and logged-out variants render the same button shape.
- Feed cards render with per-type chrome overlays at canonical opacities.
- Empty feed state (no prayers) renders as `<FeatureEmptyState>` (already in place).

#### Test 7 — Component-level color migration tests

For each `components/prayer-wall/` file modified in Step 7 (R-OVR-R6), the existing test file (if any) is checked for color-class assertions and updated:

- `__tests__/CommentItem.test.tsx` — @-mention text color assertions.
- `__tests__/CommentInput.test.tsx` — submit button color assertion.
- `__tests__/CommentsSection.test.tsx` — expand-button assertions.
- `__tests__/InteractionBar.test.tsx` — active-pray, count animation, bookmark, share button color assertions.

These updates are LOW-risk because the post-migration colors are still canonical brand violet — semantic identity is preserved.

#### Net test delta

Approximate: **+25 to +35 new test assertions, ~12 assertion updates, ~1–2 new test files** (Test 1 is definitely new; Tests 3 and 4 may be new if no test file exists yet).

### Step 9 — Manual verification (Section 3 of brief)

Per the brief's 18–22 scenarios, exercised via `/verify-with-playwright` at 6 breakpoints (375, 428, 768, 1024, 1440, 1920) after `/code-review` passes. Eric performs the manual side-by-side audit at 1440px and 375px as the final gate (D13).

If any scenario fails computed-style assertion, plan-time CC's recon was wrong somewhere — revisit, fix, re-verify.

### Step 10 — Phase 5 cutover checklist (W26)

Plan-time CC produces a Phase 5 cutover checklist as part of the plan deliverables. Suggested path: `_plans/forums/spec-5-5-phase5-cutover.md` (mirrors `_plans/forums/phase02-5-cutover-checklist.md` from Phase 2.5).

The checklist enumerates what counts as "Phase 5 complete" post-5.5:

- Spec 5.0 — Architecture Context Refresh ✅ closed
- Spec 5.1 — FrostedCard Migration ✅ shipped (row 73)
- Spec 5.2 — BackgroundCanvas at Prayer Wall Root ✅ shipped via Spec 14 Step 6 (row 74)
- Spec 5.3 — 2-Line Heading Treatment ✅ closed as no-op (row 75)
- Spec 5.4 — Animation Token Migration ✅ shipped (row 76)
- Spec 5.5 — Deprecated Pattern Purge and Visual Audit — pending merge of THIS spec (row 77)
- Spec 5.6 — Redis Cache Foundation ⬜ remains open (not blocked by 5.5; ships at Phase 5 end whenever Eric is ready)

The checklist confirms Phase 5 visual migration scope is closed when 5.5 merges + manual audit confirms + tracker is flipped. Spec 5.6 (Redis) is independently scheduled and does not gate Phase 5 visual closure.

### Step 11 — Tracker flip (operational)

After all of the above ship and Eric completes manual visual review, Eric (not CC) flips `_forums_master_plan/spec-tracker.md` row 77 from ⬜ to ✅. CC does NOT edit `spec-tracker.md` in this spec — that's part of the Eric-handles-git discipline (W25).

---

## Files to Create / Modify / NOT to Modify / Delete

### Files to Create

- `frontend/src/constants/__tests__/post-type-chrome.test.ts` — Test 1 (new test file locking canonical opacities and acting as the regression net for W-OVERRIDE-5.1).
- (Possibly) `frontend/src/pages/__tests__/PrayerWallDashboard.test.tsx` if it does not already exist — plan-time CC confirms; if extant, Test 3 modifies it.
- (Possibly) `frontend/src/pages/__tests__/PrayerDetail.test.tsx` if it does not already exist — plan-time CC confirms; if extant, Test 4 modifies it.
- `_plans/forums/spec-5-5-phase5-cutover.md` — Phase 5 cutover checklist artifact (Step 10).

### Files to Modify

**Constants (1 file):**

- `frontend/src/constants/post-type-chrome.ts` — Step 1 (opacity normalization + comment block reversal per D12 / W-OVERRIDE-5.1).

**Pages (4 files):**

- `frontend/src/pages/PrayerWall.tsx` — Step 6 (Share something hero CTA migration to `<Button variant="subtle" size="lg">` at L809–844).
- `frontend/src/pages/PrayerWallDashboard.tsx` — Step 5 (L381 display name input, L418 bio textarea, L438 bio fallback paragraph, L600 comment list item card, L722 notification preferences card, R-OVR-R6 text-primary migrations at L401/L442/L605/L737).
- `frontend/src/pages/PrayerDetail.tsx` — Step 3 (L320–339 "Prayer not found" empty state migration to FeatureEmptyState, add imports for FeatureEmptyState and AlertCircle, L363 PrayerCard `tier="detail"` prop addition).
- `frontend/src/pages/PrayerWallProfile.tsx` — Step 4 (L204–223 "User not found" empty state, L275 bio paragraph font-serif italic removal, L408–425 replies-tab comment list item migration to FrostedCard).

**Prayer Wall components (7 files — R-OVR-R6 scope-extension):**

- `frontend/src/components/prayer-wall/PrayerCard.tsx` — Step 2 (add `tier?: 'feed' | 'detail'` prop with default `'feed'`).
- `frontend/src/components/prayer-wall/CommentItem.tsx` — Step 7 (L38, L45, L98 text-primary → text-violet-300; ring-primary → ring-white/50 on focus).
- `frontend/src/components/prayer-wall/CommentInput.tsx` — Step 7 (L113 focus ring, L128 focus ring, L129 enabled color, L160 / L172 underline links).
- `frontend/src/components/prayer-wall/CommentsSection.tsx` — Step 7 (L79, L98, L105 expand-button colors).
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — Step 7 (L50 base focus ring, L146 active-pray color, L172 count text, L202 / L203 bookmark active, L214 share hover).
- `frontend/src/components/prayer-wall/AuthModal.tsx` — Step 7 (L338, L390, L592, L690, L701 focus rings only — `text-purple-400` action text colors stay AS-IS; L608 checkbox accent color).
- `frontend/src/components/prayer-wall/ReportDialog.tsx` — Step 7 (L211 textarea focus ring).

**Tests (existing test files — exact list refined by plan-time CC; baseline expectation):**

- `frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx` — Test 2 (canonical opacity assertions; tier prop assertions).
- `frontend/src/pages/__tests__/PrayerWall.test.tsx` — Test 6 (Share something CTA assertions; feed card per-type chrome assertions).
- `frontend/src/pages/__tests__/PrayerWallProfile.test.tsx` — Test 5 (User not found empty state; FrostedCard comment items; bio non-italic).
- Plus any component-level test files affected by Step 7 R-OVR-R6 migrations (CommentItem, CommentInput, CommentsSection, InteractionBar — see Test 7).

### Files NOT to Modify

Per brief Section 10 + this spec's R-OVR pattern, these are explicitly preserved:

**Out-of-scope architectural surfaces:**

- `.claude/rules/09-design-system.md` — 5.5 CONSUMES; does NOT write (W3).
- `.claude/rules/04-frontend-standards.md`, `.claude/rules/10-ux-flows.md`, any other `.claude/rules/*.md` file — read-only at plan/execute time.
- `_forums_master_plan/spec-tracker.md` — Eric updates manually post-merge (W25).
- `_forums_master_plan/round3-master-plan.md` — no master plan edits in 5.5.
- Backend (any `backend/src/main/java/` file, any `pom.xml`, any database changelog, any backend resource file) — 5.5 is pure-frontend (W2).
- `frontend/src/pages/DailyHub.tsx` — read-only at plan time (W22).
- `frontend/src/components/daily/*` — read-only at plan time (W22).
- `frontend/src/components/PageHero.tsx` — read-only at plan time.
- `frontend/src/components/SongPickSection.tsx` — read-only at plan time.
- `frontend/src/components/homepage/FrostedCard.tsx` — read-only; do NOT modify the primitive.
- `frontend/src/components/ui/FeatureEmptyState.tsx` — read-only; do NOT modify the primitive.
- `frontend/src/components/ui/Button.tsx` — read-only; do NOT modify the primitive (no new `frosted` / `alertdialog` variant in 5.5; if future need arises, separate spec).
- `frontend/src/components/CinematicHeroBackground.tsx` — read-only.
- `frontend/src/components/ui/BackgroundCanvas.tsx` — read-only.
- `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — read-only (Spec 14 / 5.1 territory; the `action` prop interface is the migration entry point, not the hero itself).
- `frontend/src/constants/animation.ts` — read-only (Spec 5.4 territory).
- `frontend/tailwind.config.js` — read-only.
- `frontend/src/styles/animations.css` — read-only (BB-33 reduced-motion safety net).

**Out-of-scope content:**

- `_specs/forums/spec-5-1.md`, `_specs/forums/spec-5-3.md`, `_specs/forums/spec-5-4.md` — historical record (W22).
- `frontend/tests/playwright-verify.spec.ts` — Spec 11A leftover; do not delete; restore after `/verify-with-playwright` runs (W27).

**Out-of-scope component decisions:**

- `frontend/src/components/prayer-wall/ComposerChooser.tsx` — `rounded-2xl` on inner type-card buttons stays (W24 + R-OVR-R14; 5.1 D6/D7 preserved these intentionally).
- All other `frontend/src/components/prayer-wall/` test files (`*.test.tsx`) — beyond the scoped tests in Step 8.
- `frontend/src/components/prayer-wall/__tests__/ComposerChooser.test.tsx` — out of scope; do not modify.

### Files to Delete

(none — 5.5 does NOT delete files. All migrations are replacements in place.)

---

## API changes

(none — pure-frontend spec.)

---

## Database changes

(none — pure-frontend spec; no Liquibase changesets.)

---

## Copy Deck

5.5 introduces NO new user-facing copy. The migrations preserve existing strings verbatim. Three copy strings are touched indirectly (FeatureEmptyState migration substitutes the rolls-own card content with the same strings inside FeatureEmptyState):

- "Prayer not found" (heading) — kept verbatim from `PrayerDetail.tsx:331`.
- "This prayer request may have been removed or the link is invalid." (description) — kept verbatim from `PrayerDetail.tsx:333`.
- "User not found" (heading) — kept verbatim from `PrayerWallProfile.tsx:215`.
- "This profile doesn't exist or has been removed." (description) — kept verbatim from `PrayerWallProfile.tsx:217`.

No string changes. Brand voice preserved.

---

## Anti-Pressure Copy Checklist

| Check | Pass | Notes |
| ----- | ---- | ----- |
| (a) No comparison framing | ✅ | No "more than X% of users" etc. — no new copy added |
| (b) No urgency language | ✅ | No "now", "hurry", "X people need..." — no new copy added |
| (c) No exclamation points near vulnerability content | ✅ | No new copy added |
| (d) No therapy-app jargon | ✅ | No "manage your anxiety", "cope with depression" — no new copy added |
| (e) No streak-as-shame language | ✅ | No "you missed a day", "don't break your streak" — no new copy added |
| (f) No false-scarcity framing | ✅ | No "only 3 spots left", "limited time" — no new copy added |

All checks pass by absence of new copy.

---

## Anti-Pressure Design Decisions

5.5 introduces no engagement features, no gamification, no personal data display, no streak surfaces. Pure-visual chrome migration. No anti-pressure design decisions apply.

---

## Acceptance Criteria

### Master plan AC (verbatim eight items from `_forums_master_plan/round3-master-plan.md:4721–4731`)

- [ ] No `Caveat` font on Prayer Wall headings (verified absent on 2026-05-11 per R-OVR-R3 — re-verify by absence post-execution).
- [ ] No `BackgroundSquiggle` on Prayer Wall (verified absent).
- [ ] No per-section `GlowBackground` on Prayer Wall (verified absent).
- [ ] No `animate-glow-pulse` on Prayer Wall textareas (verified absent).
- [ ] No `font-serif italic` on Prayer Wall labels (**MIGRATED** — R-OVR-R3: PrayerWallProfile.tsx:275 and PrayerWallDashboard.tsx:438 bio paragraphs).
- [ ] No cyan textarea glow border (verified absent — the cyan-200/cyan-500 per-type chrome on `question` post type is INTENTIONAL and survives 5.5 with normalized opacities).
- [ ] No soft-shadow 8px-radius cards on dark backgrounds (verified absent — `shadow-md` instances are on FrostedCard hover or sticky-filter-bar, NOT pre-Round-3 soft-shadow patterns).
- [ ] No `line-clamp-3` on Prayer Wall card descriptions (verified absent in `components/prayer-wall/`).

### Brief expansion AC (Section 11)

- [ ] All four per-type accent backgrounds in `post-type-chrome.ts` use canonical `/[0.08]` opacity (testimony, question, discussion, encouragement) — Step 1.
- [ ] All four per-type accent borders in `post-type-chrome.ts` use canonical `/[0.12]` opacity per Catalog C7 — Step 1.
- [ ] The `post-type-chrome.ts` comment block is replaced per D12; the 5.1 W8 reference is removed (W18) — Step 1.
- [ ] Eight pages-level inline frosted patterns from R2 / R-OVR-R2 migrated:
  - [ ] PrayerWallDashboard.tsx:381 display name input → R-OVR-R13 canonical single-line input chrome — Step 5.2.
  - [ ] PrayerWallDashboard.tsx:418 bio textarea → canonical violet textarea glow per D9 / C11 — Step 5.3.
  - [ ] PrayerWallDashboard.tsx:600 comment list item card → `<FrostedCard variant="default" className="p-4">` — Step 5.5.
  - [ ] PrayerWallDashboard.tsx:722 notification preferences card → `<FrostedCard variant="default" className="p-5">` — Step 5.6.
  - [ ] PrayerDetail.tsx:330 "Prayer not found" empty state → `<FeatureEmptyState>` (R-OVR-R4 / R-OVR-R8 / C9) — Step 3.
  - [ ] PrayerWallProfile.tsx:214 "User not found" empty state → `<FeatureEmptyState>` — Step 4.2.
  - [ ] PrayerWallProfile.tsx:412 comment list item card → `<FrostedCard variant="default" className="p-4">` — Step 4.3.
  - [ ] PrayerWall.tsx:822/L838 "Share something" hero CTA → `<Button variant="subtle" size="lg">` per D10 / R-OVR-R12 / C12 — Step 6.
- [ ] Two `font-serif italic` bio paragraphs migrated to non-italic `font-sans` per R-OVR-R3 — Steps 4.4 and 5.4.
- [ ] PrayerCard gains `tier?: 'feed' | 'detail'` prop with default `'feed'` per R-OVR-R5 — Step 2.
- [ ] PrayerDetail.tsx:363 PrayerCard invocation passes `tier="detail"` per R-OVR-R5 / D2 — Step 3.
- [ ] Two "not found" empty states migrated to `<FeatureEmptyState>` (count corrected from brief's "three" per R-OVR-R4 / R-OVR-R8 — the third was a conflated comment-item migration, NOT an empty-state migration; it becomes a FrostedCard migration) — Steps 3 and 4.2.
- [ ] Per-route Tier 1 / Tier 2 / Tier 3 reads match D2:
  - [ ] `/prayer-wall` (feed): no Tier 1 anchor; all cards Tier 2 default + per-type overlay.
  - [ ] `/prayer-wall/:id` (single prayer detail): main card Tier 1 accent (via PrayerCard `tier="detail"`); comments Tier 2 default (via existing CommentsSection at `variant="subdued"` from 5.1 — but D2 calls comments "default"; this is a documented drift from 5.1, NOT a 5.5 change; if Eric wants comments at default, that's a follow-up spec).
  - [ ] `/prayer-wall/dashboard`: user header section Tier 1 accent (**out of scope for 5.5** — the dashboard header is rolls-own avatar+name+bio, NOT a FrostedCard; brief D2 wants it as Tier 1 accent but this is a larger restructuring than 5.5's scope. Mark as deferred to a follow-up spec or include via plan-time scope decision); sub-sections Tier 2 default.
  - [ ] `/prayer-wall/user/:userId`: user header card Tier 1 accent (same scope question as dashboard); prayer history Tier 2 default.
- [ ] All FrostedCard compositions use `variant` prop + `className` overlay (W8 enforcement).
- [ ] All FrostedCard compositions render `rounded-3xl` (computed 24px) per D4 / C4 (inherited from FrostedCard's variant base classes — no inline `rounded-2xl` overrides in 5.5).
- [ ] Destructive action buttons use muted treatment per D11 / R-OVR-R15 / C10 (verify-by-absence — no saturated `bg-red-700` / `bg-red-800` exists on Prayer Wall today; verify post-execution).
- [ ] R-OVR-R6 component-level text-primary / ring-primary migrations land (Step 7):
  - [ ] CommentItem.tsx (L38, L45, L98).
  - [ ] CommentInput.tsx (L113, L128, L129, L160, L172).
  - [ ] CommentsSection.tsx (L79, L98, L105).
  - [ ] InteractionBar.tsx (L50, L146, L172, L202, L203, L214).
  - [ ] AuthModal.tsx (L338, L390, L592, L690, L701 focus rings only).
  - [ ] ReportDialog.tsx (L211).
  - [ ] PrayerWallDashboard.tsx (L401, L442, L605, L737).
  - [ ] PrayerWallProfile.tsx (L417).
- [ ] Test deltas per Section 9 land (+25 to +35 new assertions, ~12 updates, 1–2 new test files).
- [ ] `/code-review` passes with zero Blocker / zero Major findings.
- [ ] `/verify-with-playwright` passes on all four Prayer Wall routes plus Daily Hub regression at all 6 breakpoints (375, 428, 768, 1024, 1440, 1920).
- [ ] Daily Hub regression screenshots show zero meaningful drift from pre-5.5 baseline.
- [ ] Phase 5 cutover checklist produced as plan deliverable per W26 — Step 10.

### Manual audit AC (D13)

- [ ] Eric loads `/daily` and `/prayer-wall` side-by-side at 1440px and at 375px and confirms visual unity. Prayer Wall reads as the same product as Daily Hub.
- [ ] Eric loads `/daily` and `/prayer-wall/:id` side-by-side and confirms the prayer detail page reads as a curated single-anchor surface (Tier 1 accent identifies the main content; comments flow below).
- [ ] Eric loads `/daily` and `/prayer-wall/dashboard` side-by-side and confirms the dashboard reads as a coherent settings surface, not a patchwork of inline frosted boxes.
- [ ] Eric loads `/daily` and `/prayer-wall/user/:userId` side-by-side and confirms the profile reads similarly.

If any manual audit surface fails the "feels like Daily Hub" test, escalate to MAX per brief Section 2 override moments.

### Operational

- [ ] Eric (not CC) flips `_forums_master_plan/spec-tracker.md` row 77 from ⬜ to ✅ AFTER manual visual review passes + merge.
- [ ] CC does NOT edit `spec-tracker.md` as part of 5.5 work (W25).
- [ ] CC does NOT run any git mutations (branch directive — stay on `forums-wave-continued`; W1 / Section 1).

---

## Testing notes

Total test budget per Section 9 of brief, refined post-recon: **+25 to +35 new test assertions, ~12 assertion updates, 1–2 new test files**.

### Test execution

After all migrations land, run from `frontend/`:

```bash
pnpm test
```

Post-Spec-13 baseline is 9,830 pass / 1 known fail (`Pray.test.tsx — shows loading then prayer after generating`). **5.5 must not introduce new failures.** Any NEW failing file or any increase in fail count after 5.5 lands is a regression that the executor must address before declaring done.

### TypeScript and lint checks

```bash
pnpm build  # must succeed with no new errors
pnpm lint   # no new ESLint violations
```

The `tier` prop addition to PrayerCard is an additive type-safe extension. The TypeScript compiler will catch any consumer that passes an invalid `tier` value (only `'feed'` and `'detail'` are accepted). All existing consumers (PrayerWall, PrayerWallDashboard, PrayerWallProfile, PrayerDetail) pass no `tier` prop today; only PrayerDetail.tsx:363 gains `tier="detail"` in 5.5.

### Runtime verification per W15

`/verify-with-playwright` runs computed-style assertions, NOT className grep. The Section 3 scenarios enforce:

- FrostedCard variant correctness: assert computed `background-color` matches the canonical RGB value per variant.
- `rounded-3xl`: assert computed `border-radius` is exactly `24px`.
- Per-type accent overlay: assert computed `background-color` of the overlay layer is at canonical alpha (0.08 for the `/[0.08]` Tailwind class) when post-type ≠ `prayer_request`.
- Textarea violet glow: assert computed `box-shadow` contains the canonical violet RGB values at the canonical opacity stops (0.18 and 0.10).
- Button subtle variant on Share something CTA: assert computed `background-color` matches `bg-white/[0.07]` (rgba(255, 255, 255, 0.07)) and `border-color` matches `border-white/[0.12]`.

### Manual verification

Per D13 — Eric loads `/daily` and each Prayer Wall route side-by-side at 1440px and 375px. The manual audit is the final "feels like Daily Hub" gate; no test can encode this judgment.

### Drift detection

After 5.5 ships, the canonical opacities live in two places:

1. `frontend/src/constants/post-type-chrome.ts` (the source of truth for per-type chrome).
2. `.claude/rules/09-design-system.md` § "FrostedCard Tier System" and § "Border Opacity Unification" (the design system reference).

If a future spec edits one but not the other, the values drift. Test 1 (`post-type-chrome.test.ts`) is the regression net for the constants file. The rule file's source-of-truth note ("If this table and either of those code locations disagree, the code wins") governs the doc-side of drift.

**Recommend a follow-up sanity check** in 5.5's plan deliverables: a grep for the canonical opacity values across the rule file to ensure 09-design-system.md's deprecation table is internally consistent post-5.5 normalization. **Out of scope for 5.5** itself (rule files are not touched per W3) — file as a follow-up doc-update task.

---

## Notes for plan phase recon

The planner running `/plan-forums _specs/forums/spec-5-5.md` MUST:

1. **Re-verify the Recon Reality Overrides** above by re-running:

   ```bash
   cat frontend/src/constants/post-type-chrome.ts    # confirm 5.1 W8 state
   grep -rnE "rounded-(xl|2xl)? border border-white/10 bg-white/\[0\.06\]" frontend/src/pages/Prayer*.tsx
   grep -rnE "font-serif italic" frontend/src/pages/Prayer*.tsx frontend/src/components/prayer-wall/ --include="*.tsx"
   grep -rnE "text-primary[^-]|ring-primary[^-]" frontend/src/components/prayer-wall/ frontend/src/pages/Prayer*.tsx --include="*.tsx" | grep -v __tests__
   grep -nE "backdrop-blur" frontend/src/pages/Prayer*.tsx
   ```

   Expected: confirms R-OVR findings 1–6 above. If anything changed between brief and plan, record an additional R-OVR entry; the brief's design intent (D-decisions, W-watch-fors) still stands.

2. **Read the exact PrayerCard composition state** at `frontend/src/components/prayer-wall/PrayerCard.tsx` to confirm the tier-prop addition won't conflict with any other in-flight modifications (the variant is hardcoded at L103 today; confirm).

3. **Read the PrayerWall.tsx Share something CTA** in full at lines 805–844 to confirm:
   - Both logged-in (L812–833) and logged-out (L834–842) branches.
   - The existing CTA renders inside `<PrayerWallHero action={...} />` so the migration target is exactly the JSX inside the `action` prop expression.
   - No other component (e.g., a sticky `Share` button elsewhere on the page) renders a duplicate of this CTA.

4. **Confirm out-of-scope categorizations** for the visual-design dashboard tier elevation:
   - Brief D2 wants `/prayer-wall/dashboard` user header as Tier 1 accent and `/prayer-wall/user/:userId` user header card as Tier 1 accent. The dashboard header at `PrayerWallDashboard.tsx:340–449` is rolls-own avatar+name+bio scaffolding inside a `PageShell` `<main>`, NOT a `FrostedCard`. Migrating to Tier 1 accent means wrapping that header in `<FrostedCard variant="accent" className="...">`. **This is a larger restructuring than the brief's other migrations.** Plan-time CC decides:
     - **Option A (recommended for safety):** Defer dashboard / profile user-header Tier 1 elevation to a follow-up spec. 5.5 satisfies the per-route tier reads except for the user-header anchors on the two routes; AC item "Per-route Tier 1 / Tier 2 / Tier 3 reads match D2" is partially satisfied (the feed and detail tiers are satisfied; the dashboard / profile user-header tiers remain as today).
     - **Option B (full D2 compliance):** Wrap the user-header sections in `<FrostedCard variant="accent">`. Requires reading the existing layout carefully; the avatar + edit-name + edit-bio + breadcrumb combination doesn't trivially map into a FrostedCard child. Risk: visual breakage or layout regression.
   - **Default to Option A.** 5.5's AC list marks dashboard / profile user-header Tier 1 elevation as deferred to a follow-up spec. The "feels like Daily Hub" audit is still achievable with feed + detail tier compliance; the dashboard and profile pages are less canonical-anchor surfaces.

5. **Confirm the Daily Hub Canonical Pattern Catalog** (Section 5 of this spec) by re-reading the listed source files at plan time and resolving any catalog entries that conflict with brief D-decisions. If any conflict, document an R-OVR entry; brief design intent stands unless the conflict is on a foundational pattern (then Eric reviews).

6. **Identify any additional `text-primary` / `ring-primary` / `text-primary-lt` sites** that recon may have missed (R-OVR-R6's enumeration is from a 2026-05-11 grep; if files have changed between brief and plan, re-grep and extend the migration list).

7. **Verify FrostedCard variant base classes** by re-reading `frontend/src/components/homepage/FrostedCard.tsx` and confirming:
   - The `default` variant ships `p-6`. The Step 4.3 and 5.5 migrations override to `p-4` via `className`. Confirm `tailwind-merge` resolves the override correctly (no `p-6` lingering in computed styles).
   - The `subdued` variant ships `p-5`. NOT used in 5.5.

8. **Verify `FeatureEmptyState` icon prop type signature** — the migrations pass `AlertCircle` from `lucide-react`. The prop is typed `LucideIcon`. Confirm `AlertCircle` is `LucideIcon`-typed (it is — Lucide icons all export as `LucideIcon`).

9. **Phase 3 Execution Reality Addendum applicability for 5.5:** NONE of the Phase 3 backend gates (items 1, 3, 4, 5, 6, 7, 9) apply — 5.5 is pure-frontend visual migration. The Phase 3 addendum is mentioned in the spec-forums skill as applicable when specs touch edit windows, bulk JPQL, SecurityConfig, rate limits / idempotency, domain advices, user-generated content crisis flags, or activity types. **5.5 touches none of these.**

10. **Confirm the "Notifications coming soon" amber info banner inside PrayerWallDashboard.tsx:722's notification card stays AS-IS** during the card-to-FrostedCard migration (Step 5.6). The amber info banner is a semantic state indicator using the severity-amber treatment, NOT a card-shape chrome violation. Plan-time CC verifies it is preserved verbatim.

11. **Confirm no new dependencies are introduced** per W7. The migration uses existing primitives (`FrostedCard`, `FeatureEmptyState`, `Button`, `AlertCircle` from `lucide-react`) and existing utilities (`cn`, Tailwind classes).

12. **Confirm the `wr_*` localStorage key inventory is unchanged** — 5.5 introduces no new localStorage keys; no edits to `.claude/rules/11-local-storage-keys.md` are needed.

---

## Out of Scope

Explicit deferrals — do NOT include any of these in 5.5. Brief Section 12 is the canonical list; reproduced and expanded post-recon:

- **Backend changes** — no backend code, no database changelog, no resource file, no `pom.xml`, no controller, no service, no repository (W2).
- **New features** — 5.5 does NOT introduce new Prayer Wall functionality (no new post type, no new reaction, no new moderation flow, no new notification, no new badge, no new analytics event). Visual unification only.
- **Design system documentation edits** — 5.5 CONSUMES `09-design-system.md` and any other rules file; does NOT write to them (W3). If pattern documentation drift is discovered during 5.5, surface as a follow-up issue.
- **Non-Prayer-Wall surfaces** — Daily Hub other than regression, Bible, Music, Local Support, Ask, Grow, Routines, Homepage, Landing, AuthModal as a standalone surface — out of scope (W22).
- **Daily Hub source modifications** — Daily Hub is the canonical reference; read-only at plan time (W22).
- **New dependencies** — no new npm packages, no new TypeScript libraries, no new internal utilities (W7).
- **Animation token migration** — that's Spec 5.4 (✅ shipped). 5.5 inherits 5.4's tokens but does NOT re-do or extend them.
- **Routing changes** — no new routes, no route renames, no redirects.
- **Test infrastructure changes** — no new test runners, no Vitest config changes, no new test utilities.
- **Permission / RBAC changes** — no changes to who can see what; no auth flow changes; no JWT updates.
- **Performance optimizations** — 5.5 may reduce render cost as a side effect of consolidating chrome via primitives, but performance is NOT a goal. No `React.memo`, `useMemo`, `useCallback`, lazy imports, or virtualization as part of 5.5.
- **Accessibility audits** — 5.5 does NOT extend accessibility infrastructure. Per-surface a11y wins that fall out of FeatureEmptyState consumption (which has its own canonical aria-hidden icon, h3 heading semantics) are acceptable; no net-new a11y test files.
- **Internationalization** — 5.5 does NOT localize strings, does NOT extract copy to a localization file.
- **Cleanup of `frontend/tests/playwright-verify.spec.ts`** — Spec 11A leftover; not 5.5's concern. See W27.
- **`Button variant="alertdialog"` introduction** — R-OVR-R12 confirmed it's NOT shipped in `Button.tsx` despite design-system.md documentation. Adding it is a separate spec.
- **`Button variant="frosted"` introduction** — R-OVR-R12 confirmed it's not in `Button.tsx`. Adding it is a separate spec (5.5 uses `variant="subtle"` instead per D10 / R-OVR-R12).
- **Dashboard / profile user-header Tier 1 accent elevation** — per plan-time recon note 4, deferred to a follow-up spec. Affects `/prayer-wall/dashboard` user header at PrayerWallDashboard.tsx:340–449 and `/prayer-wall/user/:userId` user header (similar location in PrayerWallProfile.tsx). 5.5 satisfies D2's tier reads for feed and detail; dashboard / profile user-header tiers remain as today.
- **PrayerCard rendering change for `tier="detail"` AND non-`prayer_request` post type** — per Step 2's safe default, the per-type chrome overlay is dropped when `tier="detail"`. Plan-time CC implements this; if the manual audit prefers the hybrid (violet base + per-type overlay) and judges it readable, the plan adjusts.
- **CommentsSection variant change on PrayerDetail** — D2 says comments are Tier 2 default; the existing 5.1 D1 mapping renders CommentsSection at `variant="subdued"`. This is a drift from D2 that pre-dates 5.5 and is OUT of 5.5 scope (changing CommentsSection's variant would touch the 5.1 migration; per W24 do not refactor 5.1).
- **`text-purple-400` action text in AuthModal** — these are already canonical brand purple values, NOT `text-primary`. Migration to `text-violet-300` is not in scope (the colors are semantically different — purple-400 is bright canonical purple for action emphasis; violet-300 is muted text-button per Spec 10A). The R-OVR-R6 migration scope is ONLY `text-primary` → `text-violet-300`.
- **Rule files (`.claude/rules/*.md`)** — read-only (W3).
- **`_forums_master_plan/spec-tracker.md`** — Eric handles tracker flips manually post-merge (W25).

---

## Out-of-band notes for Eric

This section captures executor-facing reminders Eric typically wants surfaced at plan / execute time.

1. **The R-OVR section is the binding override.** Brief recon items R1–R14 are partially stale: R1 verified correct, R2 verified with minor verbatim drift, R3 and R4 verified correct, R5 PARTIALLY WRONG (font-serif italic NOT absent — TWO bio paragraphs), R6 verified, R7 verified, R8 verified with note, R9 deferred to plan-time, R10 verified, R11 verified, R12 verified (no `frosted` variant), R13 partial-resolved (no Daily Hub canonical for single-line input; proposal documented), R14 substantially correct with the additional `text-primary` / `ring-primary` scope-extension surfaced.

2. **R-OVR-R6 is the largest scope deviation.** The brief listed only pages-level files; recon found `text-primary` text-button and `ring-primary` focus-ring widespread in `components/prayer-wall/` (6 files). Migrating these is canonical (Spec 10A WCAG AA fix) and necessary for the "feels like Daily Hub" audit to pass. **The spec defaults to including this scope-extension per W24.** If Eric prefers to defer to a follow-up spec, the AC list and Files-to-Modify section adjust accordingly.

3. **R-OVR-R5 is the second largest deviation.** Brief D2 wants PrayerDetail's main card as Tier 1 accent. PrayerCard is a shared component. The minimal extension is a `tier` prop. Path 1 of three resolution paths; plan-time CC implements it.

4. **R-OVR-R3 corrects brief R5's "satisfied by absence" claim.** `font-serif italic` is NOT absent — TWO bio paragraphs use it. Migration is in scope.

5. **D11 destructive treatment uses canonical 09-design-system class string** (`bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40`) per R-OVR-R15. Brief D11's `bg-red-950/30 border-red-500/40` is missing text color, hover state, and uses `/40` border opacity. **Verify-by-absence AC item — no current Prayer Wall surface uses saturated destructive; verify post-execution.**

6. **D10 resolves to `<Button variant="subtle" size="lg">`** (R-OVR-R12 / C12). The hero CTA migration changes both the chrome AND the shape (`rounded-lg` → `rounded-full`).

7. **D9 resolves to canonical violet textarea glow for the bio textarea** and a proposed canonical single-line input pattern for the display-name input (R-OVR-R13). The display-name canonical is a 5.5 introduction documented as "intentional new canonical pattern" — Eric reviews at spec review.

8. **The PrayerCard `tier` prop** is additive (default `'feed'`) — existing consumers (4 pages × N call sites) are unchanged. Only `PrayerDetail.tsx:363` passes `tier="detail"`.

9. **Per-type chrome overlay when `tier="detail"`** — Step 2's safe default drops the per-type overlay (so PrayerDetail's main card is pure Tier 1 accent, no amber/cyan/violet/rose wash on top). The recommended composition is the safe default; manual audit confirms.

10. **Spec-tracker is hands-off for CC.** Row 77 stays ⬜ until Eric flips it after manual visual review passes + merge.

11. **Plan-time recon's must-do list** (Notes for plan phase recon above):
    - Re-verify R-OVR-R1 through R-OVR-R15 (re-run the grep commands listed).
    - Read the exact PrayerCard composition state.
    - Read the PrayerWall.tsx Share something CTA in full.
    - Decide Option A vs Option B for dashboard / profile user-header tier elevation (default Option A — deferred to follow-up spec).
    - Confirm the Daily Hub Canonical Pattern Catalog (Section 5) at plan time.
    - Identify any additional `text-primary` / `ring-primary` sites.
    - Verify FrostedCard variant base classes for `tailwind-merge` override behavior.
    - Confirm `FeatureEmptyState`'s `icon: LucideIcon` typing accepts `AlertCircle`.

12. **Phase 3 Execution Reality Addendum applicability:** NONE of the backend gates apply — 5.5 is pure-frontend.

13. **Verification handoff** (brief Section 16): after `/code-review` passes, run `/verify-with-playwright _specs/forums/spec-5-5.md`. The verifier exercises Section 3's 18–22 visual scenarios across all 6 breakpoints. Verifier writes to `_plans/forums/spec-5-5-verify-report.md` (mirrors 5.4's pattern). Any computed-style mismatch on a migrated surface is a halt condition — re-migrate and re-verify; if the mismatch persists, the primitive (FrostedCard / FeatureEmptyState) rendering is suspect (NOT a 5.5 bug; separate follow-up issue).

14. **Branch discipline is strict.** Stay on `forums-wave-continued`. Eric handles all git operations. CC reads `git status` and `git log` for diagnostics only. No `git checkout`, `git commit`, `git push`, `glab mr create`, etc.

---

## Master Plan Divergence Summary

For traceability — the brief's MPD-1 through MPD-6 reasoning is preserved (the brief's design call to expand AC scope to visual unification, upgrade size to L, upgrade risk to Medium, introduce W-OVERRIDE-5.1, prefix the spec with the Daily Hub Canonical Pattern Catalog, and exclude rule file edits) — and post-recon the brief expansion is substantially correct, with R-OVR refinements:

| MPD | Brief reinterpretation | Post-recon status |
| --- | --- | --- |
| MPD-1 | Expand AC to include visual unification (opacity normalization, eight pages-level patterns, three not-found empty states, bio textarea, single-line inputs, Share something CTA, post-type-chrome.ts comment block, tests) | Stands and extends. R-OVR-R3 adds two `font-serif italic` bio paragraphs. R-OVR-R6 adds component-level `text-primary` / `ring-primary` migration (largest scope deviation). R-OVR-R8 corrects "three not-found empty states" to "two not-found empty states + one comment-item card migration" (brief conflated them). |
| MPD-2 | Upgrade size to L | Stands. Post-recon scope expansion (R-OVR-R6 component-level migrations) keeps L. |
| MPD-3 | Upgrade risk to Medium | Stands. Visual change is intentional and noticeable; manual audit is the safety net. |
| MPD-4 | Introduce W-OVERRIDE-5.1 as the central correction | Stands. The 5.1 W8 freeze is the load-bearing reversal; the comment block in `post-type-chrome.ts` is the canonical artifact. |
| MPD-5 | Mandatory plan-time recon phase producing the Daily Hub Canonical Pattern Catalog | Stands. Section 5 above is the catalog. C1–C12 are the entries; every D-decision and AC item references them. |
| MPD-6 | Scope explicitly excludes `09-design-system.md` edits | Stands. W3 is enforced. If pattern documentation drift is discovered (e.g., FeatureEmptyState's CTA text color is canonical-Pattern-1 use of `text-primary`; that's correctly documented), surface as a follow-up doc-update task. |

---

## See also

- Brief: `_plans/forums/spec-5-5-brief.md` (binding for design intent; recon claims R5 partial-correct and R14 substantially correct with R-OVR-R3, R-OVR-R5, R-OVR-R6, R-OVR-R11 through R-OVR-R15 refinements).
- Master plan body: `_forums_master_plan/round3-master-plan.md` lines 4708–4732 (Spec 5.5 — PARTIAL-SHIPPED VIA SPEC 14).
- Phase 5 prereqs in tracker: row 73 (5.1 ✅), row 74 (5.2 ✅ via Spec 14), row 75 (5.3 ✅), row 76 (5.4 ✅).
- Canonical visual patterns: `.claude/rules/09-design-system.md` § "Round 3 Visual Patterns", § "FrostedCard Tier System", § "BackgroundCanvas Atmospheric Layer (Visual Rollout Spec 1A → site-wide)", § "Cinematic Hero Pattern (Spec 14)", § "White Pill CTA Patterns", § "Textarea Glow Pattern", § "Border Opacity Unification", § "AlertDialog Pattern", § "Deprecated Patterns".
- Recon override pattern reference: Spec 3.7 R1/R2/R3 (`_specs/forums/spec-3-7.md`).
- Sibling specs: Spec 5.4 (`_specs/forums/spec-5-4.md` — Animation Token Migration; the closest structural sibling, same pure-frontend visual refactor shape, same R-OVR pattern).
- Prior Phase 5 spec: Spec 5.1 (`_specs/forums/spec-5-1.md` — FrostedCard Migration; 5.1 W8 is the central reversal target).
- Phase 5 cutover checklist: `_plans/forums/spec-5-5-phase5-cutover.md` (plan-time deliverable per W26).
- Reconciliation reports: `_plans/reconciliation/2026-05-07-post-rollout-audit.md` (post-Visual-Rollout canonical opacities reference).
- Next steps after 5.5 ships: Spec 5.6 (Redis Cache Foundation) — independently scheduled.

---

**End of spec.**
