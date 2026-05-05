# Implementation Plan: Spec 7 — Auth Surfaces

**Spec:** `_specs/spec-7-auth-surfaces.md`
**Date:** 2026-05-05
**Branch:** `forums-wave-continued` (do NOT branch — spec § "Branch discipline")
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05; covers Register white-pill, AuthModal backdrop, Caveat use-case)
**Recon Report:** `_plans/recon/auth-2026-05-05.md` (loaded)
**Direction Doc:** `_plans/direction/auth-2026-05-05.md` (loaded — 20 locked decisions)
**Master Spec Plan:** N/A (Spec 7 is a polish + small-adds spec, not part of a multi-spec wave; the direction doc is the locked decision set)

> ⚠️ **Recon-staleness flag:** The `_plans/recon/design-system.md` capture is dated 2026-04-05 and predates Round 3 Daily Hub Round 4 (DailyHub 1B violet textarea glow) and the Forums Wave Phase 1 work. For Spec 7 specifically, the impacted regions (RegisterPage marketing, AuthModal panel chrome, Navbar `Get Started` chrome) have NOT changed visually since the capture, so the recon's exact values for those surfaces remain valid. The two new patterns Spec 7 introduces (password visibility toggle, query-param-driven AuthModal opening) are NOT covered by either recon — both are flagged `[UNVERIFIED]` below with verification methods.

---

## Affected Frontend Routes

- `/` — receives the new `AuthQueryParamHandler` mount (reads `?auth=login|register`, opens AuthModal in the requested view, strips the param via `replace` navigation). Home rendering unchanged.
- `/?auth=login` — new deep-link target. Opens AuthModal in login view.
- `/?auth=register` — new deep-link target. Opens AuthModal in register view.
- `/login` — route element changes from rendering `ComingSoon` to a redirect (`<Navigate to="/?auth=login" replace />` per Option A — see Step 9 Decision-A).
- `/register` — Hero CTA + Final CTA white-pill drift fix (`text-primary` → `text-hero-bg`, `shadow-[0_0_20px_rgba(255,255,255,0.15)]` → `shadow-[0_0_30px_rgba(255,255,255,0.20)]`). All other RegisterPage chrome preserved.
- `/prayer-wall` — auth-modal subtitle drift fix on `PrayerResponse.tsx` and `InteractionBar.tsx` (trailing period dropped). Page rendering unchanged.
- `/prayer-wall/:id` — same subtitle drift fix surface.
- All other routes — receive Navbar Get Started CTA migration (`bg-primary hover:bg-primary-lt` → canonical Pattern 2 white pill on the non-transparent / scrolled state). Transparent state untouched. BibleReader is not in scope (uses `ReaderChrome`, not `Navbar`).

---

## Architecture Context

### Files in scope (verified line numbers — 2026-05-05)

| File | Role | Status |
|---|---|---|
| `frontend/src/App.tsx` | `ComingSoon` stub at lines **119-136**; `/login` route at line **291**; `/register` route at line **292**; provider stack at lines **214-223** with `AuthModalProvider` mounted at **221** | Touched by Step 9 |
| `frontend/src/components/prayer-wall/AuthModal.tsx` | 671 LOC. Hardcoded `setTimeout(..., 150)` at line **87**. Email input lines **453-477** (no blur, no `pr-12`). Password input lines **479-503** (same). Confirm password input lines **505-544** (already has `onBlur(markTouched('confirmPassword'))`). Submit button lines **610-617**. Divider lines **621-625**. Spotify button lines **627-638**. Switch link lines **640-665** | Touched by Steps 3, 4, 7, 8 |
| `frontend/src/components/prayer-wall/AuthModalProvider.tsx` | 63 LOC. `useAuthModal()` hook signature: `(subtitle?: string, initialView?: 'login' \| 'register') => void`. Returns `undefined` when used outside provider | Read-only — referenced by Step 9's `AuthQueryParamHandler` |
| `frontend/src/pages/RegisterPage.tsx` | 398 LOC. White-pill Hero CTA at line **166**; Final CTA at line **382**; both currently `text-primary` + `shadow-[0_0_20px_rgba(255,255,255,0.15)]` | Touched by Step 5 |
| `frontend/src/components/Navbar.tsx` | DesktopAuthActions at lines **94-137**. `Get Started` Link at lines **124-134**: transparent branch `bg-white/20 hover:bg-white/30 border border-white/30`, non-transparent branch `bg-primary hover:bg-primary-lt` (deprecated) | Touched by Step 6 |
| `frontend/src/components/MobileDrawer.tsx` | Logged-out auth section at lines **252-269**. Get Started Link at lines **262-268** uses `bg-white/20 border border-white/30 hover:bg-white/30` — already canonical (transparent-state Pattern 2 family) | NOT touched (per pre-execution recon Step 1; conditional Change 6c does NOT apply) |
| `frontend/src/components/legal/TermsUpdateModal.tsx` | 268 LOC. Panel chrome canonical at line **136**. `whitePillClass` at line **118** uses `text-primary` (drift not flagged in recon, but caught during plan recon — see Step 10 Decision-D) | Read-only verification in Step 10; conditional fix if drift confirmed |
| `frontend/src/components/daily/PrayerResponse.tsx` | **NOT in `prayer-wall/` as the recon claims** — actually at `daily/`. Trailing-period subtitle at line **140**: `authModal?.openAuthModal('Sign in to save prayers to your list.')` | Touched by Step 2 |
| `frontend/src/components/prayer-wall/InteractionBar.tsx` | Trailing-period subtitle at line **218**: `authModal?.openAuthModal('Sign in to save prayers to your list.')` | Touched by Step 2 |
| `frontend/src/components/prayer-wall/__tests__/SaveToPrayers.test.tsx` | Line **104**: `expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to save prayers to your list.')` — test asserts on the trailing-period string | Touched by Step 2 (third subtitle drift site, NOT enumerated in spec — see Step 2 Decision-B) |
| `frontend/src/components/prayer-wall/__tests__/AuthModal.test.tsx` | 775 LOC. Spotify assertions at lines **112-113**. Canonical chrome assertions at lines **77-79, 91-92, 98, 106, 121, 127, 134-136** | Touched by Step 11 |
| `frontend/src/pages/__tests__/RegisterPage.test.tsx` | 318 LOC. White-pill assertions if any. Differentiator Check icon assertions at lines **314-315** preserved | Touched by Step 12 |
| `frontend/src/components/__tests__/Navbar.test.tsx` | Class-string assertions on Get Started variants | Touched by Step 6 |
| `frontend/src/constants/animation.ts` | Verified: `ANIMATION_DURATIONS = { instant: 0, fast: 150, base: 250, slow: 400 }`. `ANIMATION_DURATIONS.fast === 150` exactly — Decision 11 timing drift does NOT apply | Imported by Step 3 |

### Provider stack (App.tsx lines 214-223)

```
BrowserRouter
└── HelmetProvider
    └── ErrorBoundary
        └── AuthProvider                    ← useAuth resolves at this layer
            └── LegalVersionGate
                └── InstallPromptProvider
                    └── ToastProvider
                        └── AuthModalProvider ← useAuthModal resolves at this layer
                            └── AudioProvider / AudioPlayerProvider / WhisperToastProvider
                                └── ChunkErrorBoundary
                                    └── Suspense fallback={<RouteLoadingFallback />}
                                        └── RouteTransition
                                            └── Routes
```

`AuthQueryParamHandler` (Step 9) MUST mount inside `AuthModalProvider` (so `useAuthModal()` resolves to the real context, not `undefined`) AND inside `BrowserRouter` (so `useSearchParams`/`useLocation`/`useNavigate` resolve). Mounting it as a sibling of `<Routes>` inside `<RouteTransition>` satisfies both. Mounting it at `App` root above `BrowserRouter` would crash. Mounting it above `AuthModalProvider` would silently no-op (handler runs but `useAuthModal()` returns `undefined`).

### useAuthModal contract

```typescript
interface AuthModalContextValue {
  openAuthModal: (subtitle?: string, initialView?: 'login' | 'register') => void
}
function useAuthModal(): AuthModalContextValue | undefined
```

Returns `undefined` when used outside `AuthModalProvider` (intentional — see `AuthModalProvider.tsx` lines 54-58). The handler must defensively `if (authModal) authModal.openAuthModal(...)`.

### AuthModal validation pattern (canonical for firstName/lastName/confirmPassword — Step 7 unifies email+password to match)

```tsx
// State (line 54)
const [touched, setTouched] = useState<Record<string, boolean>>({})

// Helper (lines 74-76)
const markTouched = useCallback((field: string) => {
  setTouched((prev) => ({ ...prev, [field]: true }))
}, [])

// Confirm password input (lines 510-536) — canonical pattern
onBlur={() => {
  markTouched('confirmPassword')
  if (!confirmPasswordValue) {
    setConfirmPasswordError('Confirm password is required')
  } else if (confirmPasswordValue !== passwordValue) {
    setConfirmPasswordError('Passwords do not match')
  }
}}

// Per-field error gate (line 537) — canonical pattern
{(touched.confirmPassword || submitted) && confirmPasswordError && (
  <p id="confirmpassword-error" role="alert" ...>{confirmPasswordError}</p>
)}
```

The `touched` state object is `Record<string, boolean>`, so adding `email` and `password` keys does NOT require a type-signature change. The existing `markTouched(field)` helper accepts any string, so reusing it for email/password Just Works.

### Auth gating (per `02-security.md` § "Auth Gating Strategy")

Spec 7 introduces ZERO new auth gates. The only auth-modal-related changes are:

1. **Subtitle drift fix** — 2 existing trigger sites (`PrayerResponse.tsx:140`, `InteractionBar.tsx:218`) emit slightly different subtitle copy post-fix; gate behavior unchanged.
2. **Query-param-driven AuthModal opening** — a new path TO the modal (deep link), not a new gate. Logged-in users hitting `/?auth=login` still get the modal opened; the handler does not branch on auth state (matches the existing trigger sites' behavior).

All other 60+ existing trigger sites are preserved unchanged.

### Test patterns to follow

- Provider wrapping for AuthModal tests: `render(<AuthProvider><ToastProvider><AuthModalProvider><Component /></AuthModalProvider></ToastProvider></AuthProvider>)` — see existing `AuthModal.test.tsx` setup.
- Class-string assertions: `expect(element.className).toContain('expected-class')` — standard pattern; line numbers in the spec are guides, locate via test name + structural anchors during execution.
- New test cases follow the existing arrange-act-assert structure with `userEvent` for interactions and `screen.getBy*` queries.

### Cross-spec dependencies

- **Pre-existing test passes:** Per CLAUDE.md § "Build Health" — 9,470 pass / 1 pre-existing fail (`useFaithPoints — intercession`). No Spec 7 change should regress this baseline. The known flaky `useNotifications — returns notifications sorted newest first` test may add a second failure under tight timing — this is pre-existing and not a Spec 7 regression.
- **Specs 6A/6B/6C/6D landed:** Per CLAUDE.md § "Implementation Phases" and the spec's pre-execution recon. Recent commits (`aac5d4e spec-6c`, `62d8b05 spec-6b`, `2f5b2fd spec 6`, `5545037 spec 5 final`) confirm the Round 3 visual migration is at the state Spec 7 expects.
- **Phase 1 Forums Wave is in progress** but this spec is presentation-layer only — no AuthContext, auth-service, or backend changes.

---

## Auth Gating Checklist

Per `02-security.md` and Spec 7 § "Auth Gating", Spec 7 introduces ZERO new auth gates and modifies ZERO existing auth gate behaviors. The table covers the actions Spec 7's changes touch.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|---|---|---|---|
| Visit `/login` | Redirect to `/?auth=login`; AuthModal opens in login view; query param stripped | Step 9 | `<Navigate to="/?auth=login" replace />` + `AuthQueryParamHandler` |
| Visit `/?auth=login` (direct, e.g. marketing email) | Open AuthModal in login view on first render; strip param | Step 9 | `AuthQueryParamHandler` reads `useSearchParams`, calls `openAuthModal(undefined, 'login')`, navigates to clean pathname with `replace: true` |
| Visit `/?auth=register` (direct) | Open AuthModal in register view on first render; strip param | Step 9 | Same handler, `view = 'register'` branch |
| Click PrayerWall save/bookmark icon (logged out) | AuthModal opens with subtitle "Sign in to save prayers to your list" (NO trailing period — Change 2) | Step 2 | Existing `useAuthModal().openAuthModal('Sign in to save prayers to your list')` call site (subtitle string updated) |
| Click Hero CTA on `/register` | AuthModal opens in register view (existing — onClick preserved through chrome migration) | Step 5 | Existing `authModal?.openAuthModal(undefined, 'register')` call site (button chrome migrated, behavior preserved) |
| Click Final CTA on `/register` | AuthModal opens in register view (existing) | Step 5 | Same — button chrome migrated, behavior preserved |
| Click Navbar "Get Started" (any state) | Navigate to `/register` (existing — `<Link to="/register">`) | Step 6 | Not a modal trigger — preserved through chrome migration |
| Click password visibility toggle (login or register view) | Reveal/hide password text by toggling input `type` between `'password'` and `'text'`; no auth state change | Step 8 | In-modal control, NOT an auth gate |
| Blur email or password input with invalid value | Per-field error renders immediately (NEW — Decision 8 unifies blur+submit) | Step 7 | In-modal validation, NOT an auth gate |

**Verification:** every spec acceptance-criteria action that involves authentication appears above. No spec-defined auth gate is missing from the implementation steps.

---

## Design System Values (for UI steps)

Loaded from `_plans/recon/design-system.md` (where applicable) and `09-design-system.md` § "White Pill CTA Patterns" / "Round 3 Visual Patterns". Values used during this spec:

| Component | Property | Value | Source |
|---|---|---|---|
| Pattern 2 white pill (homepage primary, RegisterPage CTAs) | full classes | `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` | `09-design-system.md` § "White Pill CTA Patterns" |
| Pattern 2 white pill (Navbar / nested variant — non-transparent) | classes | `bg-white text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]` | Spec § Change 6b |
| AuthModal panel chrome | classes | `mx-4 w-full max-w-md rounded-3xl bg-hero-bg/95 backdrop-blur-md border border-white/[0.12] p-6 shadow-[0_0_40px_rgba(139,92,246,0.15),0_8px_30px_rgba(0,0,0,0.4)]` | Decision 3 — preserved |
| AuthModal backdrop | inline style | `radial-gradient(circle at center, rgba(139, 92, 246, 0.12) 0%, transparent 60%) over rgba(0, 0, 0, 0.7)` | `_plans/recon/design-system.md` line 116 |
| AuthModal utility input idiom | classes | `w-full rounded-xl bg-white/[0.06] border border-white/[0.12] px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:border-purple-400/50 focus-visible:shadow-[0_0_15px_rgba(139,92,246,0.15)]` | Decision 1 — preserved |
| Password input (with toggle) — extra padding | added class | `pr-12` | Step 8 — keeps text from underflowing the absolute-positioned toggle |
| AuthModal whitePillClass (submit) | classes | `w-full rounded-full bg-white py-3 text-sm font-semibold text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]` | Decision 2 — preserved |
| Navbar transparent state Get Started | classes | `bg-white/20 hover:bg-white/30 border border-white/30` | Existing line 129 — preserved |
| Navbar non-transparent state Get Started (NEW) | classes | `bg-white text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]` | Decision 12 / Change 6b |
| Password toggle button | classes | `absolute right-1 top-1/2 -translate-y-1/2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50` | Step 8 — derived from existing AuthModal X close button (line 98 `text-white/50`) and 44×44 tap-target rule (`04-frontend-standards.md`) |
| Animation token | `ANIMATION_DURATIONS.fast` | `150` (ms) | `frontend/src/constants/animation.ts` line 4 — verified |
| Lucide icons | imports | `Eye`, `EyeOff` | `lucide-react` package — verified available; existing AuthModal already imports `X`, `AlertCircle` from same package |
| Crisis tone | n/a | n/a — no crisis-content surfaces touched | — |

[UNVERIFIED] tags applied: see "Assumptions & Pre-Execution Checklist" below for the four UNVERIFIED items.

---

## Design System Reminder

Displayed verbatim by `/execute-plan` Step 4d before each UI step:

- **AuthModal panel chrome is canonical and PRESERVED** (Decision 3): `bg-hero-bg/95 backdrop-blur-md rounded-3xl border border-white/[0.12]` with dual box-shadow `shadow-[0_0_40px_rgba(139,92,246,0.15),0_8px_30px_rgba(0,0,0,0.4)]`. Do NOT migrate to FrostedCard or any other surface.
- **AuthModal inputs use the utility idiom, NOT the textarea-glow idiom** (Decision 1). The Pray/Journal violet textarea glow is for emotional authoring; auth is task completion. Never apply `shadow-[0_0_20px_rgba(167,139,250,0.18)...]` or `border border-violet-400/30` to auth inputs.
- **AuthModal submit button stays white pill, NOT gradient** (Decision 2). The `whitePillClass` at line 307 is canonical: `text-hero-bg`, `shadow-[0_0_20px_rgba(255,255,255,0.15)]` → `hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]`. Gradient Button variant is reserved for emotional climax (CreatePlanFlow Step 2 Generate).
- **RegisterPage atmospheric layer is `<GlowBackground variant="fullPage">`, NOT BackgroundCanvas** (Decision 4). Long-scroll marketing surface = GlowBackground; Daily Hub / Bible / Local Support / Grow surfaces = BackgroundCanvas. Don't cross-pollinate.
- **Pattern 2 white pill has TWO shadow variants** within the same family. Hero/Marketing variant: `shadow-[0_0_30px_rgba(255,255,255,0.20)]` + `text-hero-bg` (RegisterPage CTAs after Step 5). Navbar/nested variant: `shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]` + `text-hero-bg` (Navbar Get Started after Step 6). Both are correct; pick by context.
- **`text-primary` on a white pill is DEPRECATED.** Pattern 2 uses `text-hero-bg`. RegisterPage's two CTAs (Step 5) and TermsUpdateModal's whitePillClass (Step 10 if drift confirmed) currently use `text-primary` — migrate.
- **`bg-primary hover:bg-primary-lt` solid CTA is DEPRECATED** (Decision 12). Navbar Get Started non-transparent branch (Step 6) is the last instance in user-facing surfaces.
- **Caveat font is DEPRECATED for headings.** Used only on the AuthModal "Worship Room" logo wordmark (acceptable). The `ComingSoon` stub deletion (Step 9) eliminates the last deprecated `font-script` usage on a heading.
- **Hardcoded animation millisecond literals are DEPRECATED** (BB-33). Always import from `frontend/src/constants/animation.ts`. AuthModal's `setTimeout(..., 150)` at line 87 (Step 3) is the last hardcoded literal in auth code.
- **44×44 tap target floor** (`04-frontend-standards.md`): every new interactive control must use `min-h-[44px] min-w-[44px]` or render at least 44×44 by intrinsic sizing. Step 8's password toggle button MUST satisfy this.
- **No new localStorage keys are introduced by Spec 7.** The password visibility state is component-local React state; toggle preference is NOT persisted (standard modern UX). Direction Doc Decision 18 keeps AuthContext / mirrorToLegacyKeys / legacy auth keys untouched.
- **Subtitle convention is no terminating period** (Decision 14): "Sign in to ..." (33 unique strings, 31 already correct, Step 2 fixes the 2 outliers). Don't reintroduce trailing periods on any new subtitle copy.
- **Backdrop click on mobile dismisses AuthModal but NOT TermsUpdateModal** (Decision 9). Preserve the asymmetry — AuthModal is user-initiated low-stakes, TermsUpdateModal is gated content high-stakes.
- **The `// Transitional — removed in Phase 2 cutover` comments are LOAD-BEARING.** Decision 18: never touch AuthContext or `mirrorToLegacyKeys()`. Spec 7 is presentation-layer only.

---

## Shared Data Models

Spec 7 does NOT introduce new types. Existing types referenced:

```typescript
// frontend/src/components/prayer-wall/AuthModalProvider.tsx
interface AuthModalContextValue {
  openAuthModal: (subtitle?: string, initialView?: 'login' | 'register') => void
}

// frontend/src/components/prayer-wall/AuthModal.tsx (line 14)
type AuthView = 'login' | 'register' | 'forgot-password'

// frontend/src/types/auth.ts — preserved unchanged
type AuthErrorCode = 'INVALID_CREDENTIALS' | 'VALIDATION_FAILED' | 'RATE_LIMITED' | ...
const AUTH_ERROR_COPY: Record<AuthErrorCode, string> = { ... }
```

**localStorage keys this spec touches:** ZERO. No keys added, removed, or modified. Existing auth keys (`wr_jwt_token`, `wr_auth_simulated`, `wr_user_name`, `wr_user_id`) untouched per Decision 18.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|---|---|---|
| Mobile | 375px | AuthModal panel: `mx-4 max-w-md`; password toggle 44×44 tap target; password input gains `pr-12` to prevent text underflowing toggle. Backdrop click stays open (Decision 9). RegisterPage: hero CTAs stack vertically per existing layout. Navbar: desktop variant not visible (mobile uses MobileDrawer); MobileDrawer Get Started already canonical, no change. |
| Tablet | 768px | AuthModal panel centers in viewport, same `max-w-md` cap. RegisterPage transitions from stacked to side-by-side per existing breakpoints (Spec 7 does NOT touch the responsive layout, only CTA chrome). Navbar: desktop variant rendered; non-transparent (scrolled) Pattern 2 white pill reads correctly. |
| Desktop | 1440px | AuthModal panel: `max-w-md` (28rem / 448px) — does NOT widen on large viewports. Password toggle: 44×44 (consistent across breakpoints). Navbar Get Started: most visible at desktop, scrolled state shows Pattern 2 white pill. |

**Custom breakpoints:** none. Spec 7 uses existing Tailwind defaults.

---

## Inline Element Position Expectations

This spec adds NO new inline-row layouts. Step 8 (password toggle) places a toggle button inside a relative-positioned wrapper using absolute positioning — that's a layered placement, not an inline-row layout, and `boundingBox().y` comparison does not apply (the button intentionally overlays the input's right edge).

Acceptance criterion for Step 8: the toggle button's `boundingBox().right` is within the input's `boundingBox().right` minus 4px (toggle does NOT overflow the input's right edge), and `boundingBox().bottom <= input.boundingBox().bottom` (toggle does NOT extend below the input). `/verify-with-playwright` should validate these via visual snapshot rather than y-coordinate matching.

**N/A for the rest of the spec — no inline-row layouts added or modified.**

---

## Vertical Rhythm

After Step 4 deletes the Spotify button + "or" divider, the vertical rhythm between the AuthModal submit button and the switch link changes. Currently:

```
[Submit Button]
  ↓ my-4 (16px) on the divider container ↓
[—or—]
  ↓ my-4 ↓
[Spotify Button]
  ↓ mt-4 on switch link container (line 641) ↓
[Switch link]
```

After Step 4, the structure becomes:

```
[Submit Button]
  ↓ existing mt-4 on switch link container (line 641) ↓
[Switch link]
```

The existing `mt-4` (16px) on the switch link's `<p>` (line 641) provides ~16px of breathing room — likely insufficient because the previous layout had ~80px of total space from submit-bottom to switch-link-top (8px my-4 above divider + 24px divider+border + 8px my-4 below + 44px Spotify button + 16px mt-4 = ~100px). Visual judgment call:

- **If the switch link sits too tight against the submit button:** Increase `mt-4` to `mt-6` (24px) on the `<p className="mt-4 text-center text-sm text-white/90">` at line 641. This is the change to make.
- **If `mt-4` reads adequately:** Leave it.

`/verify-with-playwright` Step 6e checks this. Acceptance: at least 24px gap between submit button bottom and switch link top.

| From → To | Expected Gap | Source |
|---|---|---|
| Submit button → Switch link (post-Step 4) | ≥ 24px (mt-6) | Visual judgment + WCAG tap-target spacing recommendation |
| AuthModal panel padding | `p-6` (24px) | Decision 3 — preserved |
| RegisterPage Hero CTA → Hook section | `pt-32` on hero `pb-20` (existing) | RegisterPage.tsx existing layout — preserved |
| Navbar Get Started → adjacent items | `gap-4` between DesktopAuthActions children (existing line 98) | Preserved |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] **Specs 6A/6B/6C/6D are merged.** Recent commits show `aac5d4e spec-6c`, `62d8b05 spec-6b`, `2f5b2fd spec 6` on `forums-wave-continued`. Re-confirm via `git log --oneline | head -5` at execution start.
- [ ] **Direction doc** `_plans/direction/auth-2026-05-05.md` is on disk and the 20 locked decisions match this plan's references.
- [ ] **Recon doc** `_plans/recon/auth-2026-05-05.md` is on disk. Line numbers in this plan are sourced from the recon and may have shifted ±N lines if other commits have touched these files since 2026-05-05; locate via grep / structural anchors during execution.
- [ ] **`ANIMATION_DURATIONS.fast === 150`** — verified at `frontend/src/constants/animation.ts:4`. No timing drift.
- [ ] **`Eye` and `EyeOff` exports from `lucide-react`** — verified available; AuthModal already imports `X, AlertCircle` from the same package.
- [ ] **MobileDrawer Get Started chrome** — verified at lines 262-268: `bg-white/20 border border-white/30 hover:bg-white/30` (transparent-state Pattern 2 family). Already canonical; Step 6 does NOT extend to MobileDrawer.
- [ ] **PrayerResponse.tsx file path** — verified at `frontend/src/components/daily/PrayerResponse.tsx`, NOT `prayer-wall/PrayerResponse.tsx` as the recon claims. Spec body's "PrayerResponse.tsx:140" still resolves to the correct file via grep.
- [ ] **Third subtitle drift site** — verified: `SaveToPrayers.test.tsx:104` asserts on the trailing-period string. Step 2 includes this (recon's 32-string list missed the test file, but the test file's assertion is part of the same drift bug — see Step 2 Decision-B).
- [ ] All auth-gated actions from the spec are accounted for in the Auth Gating Checklist above.
- [ ] All [UNVERIFIED] values flagged with verification methods (see below).
- [ ] No deprecated patterns introduced: no `font-script` headings, no `bg-primary` solid CTAs (the Navbar deprecation is fixed by Step 6, not introduced), no hardcoded animation literals (Step 3 fixes the last one), no cyan textarea glow, no italic Lora prompts.

### [UNVERIFIED] values

```
[UNVERIFIED] Step 8 — Password toggle exact CSS for absolute positioning
→ Best guess: `absolute right-1 top-1/2 -translate-y-1/2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50`
→ To verify: Run /verify-with-playwright after Step 8; the toggle's bounding box must (a) sit fully within the input's right edge, (b) align vertically centered with the input's text baseline, (c) measure ≥44×44 px on all breakpoints
→ If wrong: Adjust `right-1` or padding inside the button until bounding-box constraints are met. Use the AuthModal's existing X close button (line 98 area, `text-white/50`) as a tonal reference.

[UNVERIFIED] Step 4 — Spacing between submit button and switch link after Spotify button + divider deletion
→ Best guess: existing `mt-4` (16px) on `<p className="mt-4 text-center text-sm text-white/90">` (line 641) is too tight; bump to `mt-6` (24px)
→ To verify: Visual eyeball at runtime + /verify-with-playwright Step 6e (Vertical Rhythm — gap should be ≥24px between submit button bottom and switch-link top)
→ If wrong: If `mt-4` reads adequately at runtime, leave it. If `mt-6` reads too loose, try `mt-5`. Decision is judgment-call per Spec § 17 / Change 4c.

[UNVERIFIED] Step 9 — `/login` redirect Option A vs Option B
→ Best guess: Option A (`<Navigate to="/?auth=login" replace />`) — simplest, no `?view=register` parity. Spec § 11 / Change 1c says "either is acceptable; pick whichever is cleaner".
→ To verify: Both options are listed in the spec as acceptable. No verification needed at runtime — just commit to the choice and document.
→ If wrong: If a future marketing email needs `/login?view=register` parity, swap to Option B (small wrapper component) in a follow-up spec. Option A's simplicity wins for MVP.

[UNVERIFIED] Step 10 — TermsUpdateModal whitePillClass drift
→ Plan recon found TermsUpdateModal.tsx:118 uses `text-primary` on its `whitePillClass`. The original auth recon Part 9 did NOT explicitly call this out, only noting it for RegisterPage. Decision 5 says "drift in TermsUpdateModal moves in lockstep with AuthModal" — but AuthModal's whitePillClass uses `text-hero-bg` correctly.
→ To verify: During Step 10, grep `text-primary` in TermsUpdateModal.tsx; if found on whitePillClass, confirm it's drift, NOT preserved-by-design. Cross-check Decision 2's "Auth submit stays white pill" wording — does TermsUpdateModal "Accept" button count as auth submit? Likely yes (gated content acceptance is auth-adjacent).
→ If wrong: If the drift IS intentional (somehow), preserve and document. Otherwise migrate `text-primary` → `text-hero-bg` on TermsUpdateModal.tsx:118 within Step 10.
```

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **A.** `/login` redirect: Option A (simple Navigate) vs Option B (wrapper supporting `?view=register`) | Option A | Per Spec § 11 / Direction Doc Decision 6: simpler implementation. Option B's `/login?view=register` parity is forward-looking value that no current marketing email or backend spec depends on. Option A's diff is 1 line; Option B's is ~15 LOC + a new component. If/when Phase 1 Spec 1.5b reset-password emails need `/login?view=register`, that spec can swap to Option B. |
| **B.** Subtitle drift fix scope | 3 sites (PrayerResponse.tsx:140, InteractionBar.tsx:218, SaveToPrayers.test.tsx:104) | Spec § Change 2 enumerates 2 production sites; the test file `SaveToPrayers.test.tsx:104` asserts on the trailing-period string and would FAIL after the production fix. Including the test in Step 2 is a regression prevention, not scope creep. |
| **C.** AuthQueryParamHandler placement | As `null`-returning component, sibling of `<Routes>` inside `<RouteTransition>` | Mounting it inside `<AuthModalProvider>` AND inside `<BrowserRouter>` is mandatory (otherwise `useAuthModal()` returns `undefined` or hooks crash). Sibling-of-Routes placement satisfies both AND keeps the mount stable across route transitions (mounting inside a single route would unmount/remount on navigation, missing the param strip). Alternative: extract to a hook called from a wrapper component — equivalent semantics, marginally more verbose. |
| **D.** TermsUpdateModal verification fix scope | If `text-primary` drift on whitePillClass is confirmed: migrate to `text-hero-bg`. Otherwise: verification-only pass. | Decision 5 says "Any visual change to AuthModal applies to TermsUpdateModal in the same spec." Plan recon found TermsUpdateModal.tsx:118 uses `text-primary` (drift not flagged in original recon Part 9). RegisterPage Step 5 fixes the same drift on RegisterPage's two CTAs; TermsUpdateModal's whitePillClass is the same family. Migrate for consistency. |
| **E.** Password toggle: independent state per field vs shared | Independent — `showPassword` and `showConfirmPassword` as separate `useState` hooks | Spec § Change 7 + Decision 7. Standard UX: toggling one field's visibility shouldn't reveal the other. Test 7e covers this explicitly. |
| **F.** Validation timing on resetEmail (forgot-password view) | Submit-only — preserved | Decision 8: "resetEmail keeps its current submit-only timing — it's a one-field form; no value in blur there." Step 7 explicitly excludes resetEmail from the blur-validation extension. |
| **G.** Step ordering: spec § 76 suggests "smallest blast radius first"; this plan follows that | 13 steps in the spec's suggested order | Each step is independently testable and verifiable. Steps 9 (ComingSoon deletion + handler + redirect) is the largest single change but its blast radius is contained to App.tsx + 1 new file. |
| **H.** Backwards compatibility: AuthContext, auth-service, auth-storage | NOT touched (Decision 18) | All these belong to Phase 2 cutover. The `// Transitional — removed in Phase 2 cutover` comments are load-bearing for the future grep-and-remove. Spec 7 is presentation-layer only. |
| **I.** Behavior of opening AuthModal for already-authenticated users via `/?auth=login` | Modal opens regardless of auth state (existing AuthModalProvider behavior — does not branch on `useAuth().isAuthenticated`) | Per spec § Auth Gating Summary. Authed users hitting `/?auth=login` is a rare edge case (e.g., a stale marketing email). The handler doesn't suppress on authed state because adding suppression is a behavior change Spec 7 doesn't take on. The user can dismiss the modal normally. |
| **J.** Lucide Eye/EyeOff icons size | `h-5 w-5` (20×20) inside the 44×44 button | Matches the existing AuthModal X close button's icon sizing (line 98 area). The button hit-target is 44×44; the visible icon is smaller. |

---

## Implementation Steps

### Step 1: Pre-execution recon verification

**Objective:** Confirm the spec's pre-execution requirements (§ 58-72) hold before any code changes.

**Files to create/modify:** None — this is a read-only verification step.

**Details:**

1. Verify recent commits show `spec-6c`, `spec-6b`, `spec 6`, `spec 5 final` on `forums-wave-continued` via `git log --oneline | head -10`.
2. Verify `_plans/direction/auth-2026-05-05.md` is on disk and contains 20 locked decisions.
3. Verify `_plans/recon/auth-2026-05-05.md` is on disk.
4. Confirm `ANIMATION_DURATIONS.fast === 150` at `frontend/src/constants/animation.ts:4` via `Read`.
5. Confirm `Eye` and `EyeOff` exports from `lucide-react` are resolvable: `grep -r "from 'lucide-react'" frontend/src --include="*.tsx" | head -5` should show existing imports; verify package.json has `lucide-react`.
6. Confirm MobileDrawer.tsx:262-268 Get Started Link uses `bg-white/20 border border-white/30 hover:bg-white/30` (already canonical → Change 6c does NOT apply).
7. Confirm PrayerResponse.tsx is at `frontend/src/components/daily/PrayerResponse.tsx` (recon claimed `prayer-wall/`; the actual path is `daily/`).
8. Confirm SaveToPrayers.test.tsx:104 currently asserts the trailing-period string.
9. Output: a single bullet list summarizing pass/fail per check. If any check fails, STOP and report.

**Auth gating:** N/A (verification step).

**Responsive behavior:** N/A — no UI impact.

**Guardrails (DO NOT):**
- Do not modify any file during this step.
- Do not skip checks even if "obvious" — recon line numbers may have shifted since 2026-05-05.

**Test specifications:** N/A.

**Expected state after completion:**
- [ ] All 8 pre-execution checks pass.
- [ ] Findings documented in execution log.
- [ ] Any deviation surfaces a STOP signal before Step 2.

---

### Step 2: Subtitle copy unification (Change 2)

**Objective:** Drop the trailing period on "Sign in to save prayers to your list" across all 3 sites so the string matches the 31 unterminated convention strings.

**Files to create/modify:**
- `frontend/src/components/daily/PrayerResponse.tsx` — line 140 (recon said `prayer-wall/` — actual is `daily/`)
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — line 218
- `frontend/src/components/prayer-wall/__tests__/SaveToPrayers.test.tsx` — line 104 (test assertion)

**Details:**

1. In `PrayerResponse.tsx:140`: change `'Sign in to save prayers to your list.'` → `'Sign in to save prayers to your list'` (drop trailing period only).
2. In `InteractionBar.tsx:218`: same string transformation.
3. In `SaveToPrayers.test.tsx:104`: update `expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to save prayers to your list.')` to `expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to save prayers to your list')`.
4. Verify by grep: `grep -rn "save prayers to your list" frontend/src` should show 3 hits, all without the trailing period.

**Auth gating (existing — preserved):**
- PrayerResponse Save action and InteractionBar bookmark action both call `authModal?.openAuthModal('...')` with the corrected subtitle. Logged-out users see the modal with the corrected subtitle; logged-in users save the prayer (existing behavior, unchanged).

**Responsive behavior:** N/A — string change only, no layout impact.

**Inline position expectations:** N/A — no layout change.

**Guardrails (DO NOT):**
- Do NOT change any other "Sign in to ..." subtitle strings (the other 31 strings already match the convention; the 2 outliers + their test assertion are the entire scope).
- Do NOT introduce new subtitle copy.
- Do NOT touch the auth-modal trigger logic — only the string passed to `openAuthModal`.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| `SaveToPrayers.test.tsx:104` | unit (existing) | Updated assertion: `mockOpenAuthModal` called with the no-period string |
| Manual grep verification | n/a | After fix: `grep -c "save prayers to your list\." frontend/src -r` returns 0 |

**Expected state after completion:**
- [ ] All 3 sites use `'Sign in to save prayers to your list'` (no trailing period).
- [ ] `pnpm test` passes the updated assertion.
- [ ] No new "Sign in to ..." subtitle strings introduced.

---

### Step 3: AuthModal hardcoded 150ms → ANIMATION_DURATIONS.fast (Change 3)

**Objective:** Replace the hardcoded `setTimeout(..., 150)` literal at AuthModal.tsx:87 with the canonical `ANIMATION_DURATIONS.fast` token per BB-33 token discipline.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/AuthModal.tsx` — line 1 (import) + line 87 (token swap)

**Details:**

1. Add to existing imports near the top of the file: `import { ANIMATION_DURATIONS } from '@/constants/animation'`
2. Change line 87: `}, 150)` → `}, ANIMATION_DURATIONS.fast)`
3. Verify behavior: `ANIMATION_DURATIONS.fast === 150` (verified in Step 1) — ZERO timing change.

**Auth gating:** N/A — internal refactor, no auth-gated action change.

**Responsive behavior:** N/A — no UI impact.

**Guardrails (DO NOT):**
- Do NOT add a new token if `ANIMATION_DURATIONS.fast` were ever to drift from 150ms (per Decision 11). Use the canonical token even at the cost of ±50ms timing drift.
- Do NOT change any other timing in AuthModal — only the close-path setTimeout at line 87.
- Do NOT touch the `useReducedMotion` branch (lines 78-82); reduced-motion users still get the immediate close path.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| Existing `AuthModal.test.tsx` close-on-X tests | integration | Verify still pass — the timing is identical (150ms). Should be no test changes required. |

**Expected state after completion:**
- [ ] `import { ANIMATION_DURATIONS }` added to AuthModal.tsx.
- [ ] Line 87 uses `ANIMATION_DURATIONS.fast` instead of `150`.
- [ ] `pnpm test` passes existing AuthModal tests with no new failures.
- [ ] `grep -n "setTimeout.*150\|setTimeout.*200\|setTimeout.*250\|setTimeout.*400" frontend/src/components/prayer-wall/AuthModal.tsx` returns ZERO matches.

---

### Step 4: Spotify button + "or" divider deletion (Change 4)

**Objective:** Delete the disabled "Continue with Spotify" OAuth placeholder + "or" divider from AuthModal. Verify post-deletion spacing.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/AuthModal.tsx` — lines 621-638 (delete divider + Spotify button); possibly line 641 (`mt-4` → `mt-6` if spacing tight)

**Details:**

1. **Delete the divider** (lines 621-625): the entire `<div className="my-4 flex items-center gap-3">` block including its three children (two `border-t` lines + the "or" `<span>`).
2. **Delete the Spotify button** (lines 627-638): the entire `<button type="button" disabled aria-label="Continue with Spotify">...</button>` JSX block including the inline Spotify SVG.
3. **Verify spacing.** After deletion, the form's submit button (lines 610-617) flows directly into the switch link (lines 640-665). The switch link's `<p className="mt-4 text-center text-sm text-white/90">` (line 641) provides 16px of breathing room. Visually inspect the result: if too tight, change `mt-4` → `mt-6` (24px). [UNVERIFIED — see Assumptions section]
4. Verify by grep: `grep -c "Spotify\|spotify" frontend/src/components/prayer-wall/AuthModal.tsx` returns 0.

**Auth gating:** N/A — placeholder OAuth button was never wired; no behavior change.

**Responsive behavior:**
- Mobile (375px): submit button → switch link gap reads as a tight stack. `mt-6` likely needed for visual breathing room.
- Tablet (768px): same.
- Desktop (1440px): same — modal `max-w-md` does not widen on large viewports.

**Inline position expectations:** N/A — vertical stack, no inline-row layout.

**Guardrails (DO NOT):**
- Do NOT preserve the divider for hypothetical future OAuth (Decision 15 — when real OAuth wires later, a fresh divider can be reintroduced cleanly).
- Do NOT delete or modify the submit button (lines 610-617) or switch link (lines 640-665).
- Do NOT delete the form-level `<FormError>` block (lines 602-608) — it sits ABOVE the divider.
- Do NOT add any replacement OAuth button or "Other ways to sign in" text — Decision 15 says "remove than imply availability".

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| Spotify button assertion deletion | unit (Step 11) | Lines 112-113 of AuthModal.test.tsx will fail after this step until Step 11 deletes them. Acceptable mid-step regression — Step 11 fixes. |

**Expected state after completion:**
- [ ] Lines 621-638 (divider + Spotify button) deleted.
- [ ] Submit button (lines 610-617) and switch link (lines 640-665) preserved.
- [ ] `grep -c Spotify frontend/src/components/prayer-wall/AuthModal.tsx` returns 0.
- [ ] Visual spacing between submit and switch link ≥24px (mt-6 if needed).
- [ ] Step 11 fixes the test breakage from this step.

---

### Step 5: RegisterPage white-pill drift fix (Change 5)

**Objective:** Migrate RegisterPage Hero CTA + Final CTA from `text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)]` to canonical Pattern 2 `text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)]`.

**Files to create/modify:**
- `frontend/src/pages/RegisterPage.tsx` — line 166 (Hero CTA), line 382 (Final CTA)

**Details:**

1. On RegisterPage.tsx:166 (Hero CTA), replace:
   - `text-primary` → `text-hero-bg`
   - `shadow-[0_0_20px_rgba(255,255,255,0.15)]` → `shadow-[0_0_30px_rgba(255,255,255,0.20)]`
   - PRESERVE all other classes including `animate-shine`, `animate-gradient-shift` (note: `animate-gradient-shift` is on line 154, the H1, not on the CTA — keep all classes the spec doesn't explicitly target).

   Final class string for Hero CTA (line 166):
   ```
   animate-shine mt-8 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-colors duration-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none
   ```

2. On RegisterPage.tsx:382 (Final CTA), apply the SAME two-class transformation. Both CTAs now have identical chrome.

3. PRESERVE: `animate-shine` decoration, button text "Create Your Account", `onClick` handler that opens AuthModal in register view, `<GlowBackground variant="fullPage">` atmospheric layer (Decision 4), `<Navbar transparent hideBanner>` props, `<SiteFooter />` rendering, the Differentiator section's Check icons (those use `text-white`, not `text-primary` — recon Part 10 asserts this; verified line 314-315 of RegisterPage.test.tsx).

**Auth gating (existing — preserved):**
- Hero CTA + Final CTA both call `authModal?.openAuthModal(undefined, 'register')` (existing onClick handlers); logged-out and logged-in users get the same behavior (modal opens). Spec 7 does not change this.

**Responsive behavior:**
- Mobile (375px): CTAs stack at the existing breakpoints — no layout change.
- Tablet (768px): CTAs centered, full-width within their content container — no layout change.
- Desktop (1440px): CTAs centered with `text-lg` body — chrome migration only.

**Inline position expectations:** N/A — CTAs are block-level inside their hero sections, not inline-row.

**Guardrails (DO NOT):**
- Do NOT switch RegisterPage's `<GlowBackground variant="fullPage">` to BackgroundCanvas (Decision 4).
- Do NOT touch `animate-shine`, `animate-gradient-shift`, or any other animation classes.
- Do NOT change the button text content ("Create Your Account").
- Do NOT change the `onClick` handlers.
- Do NOT migrate any other RegisterPage element — only the two white-pill CTA chrome strings.
- Do NOT touch the Check icons in the Differentiator section (they use `text-white`, intentionally — recon-confirmed).

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| RegisterPage.test.tsx existing 33 tests | unit | All preserved; chrome migration may break class-string assertions if any exist on lines 211, 220, etc. — Step 12 fixes those. |
| Differentiator Check icon assertions (lines 314-315) | unit | `not.toContain('text-primary')` AND `toContain('text-white')` — preserved unchanged. |
| Structural assertion (line 301) | unit | Exactly 2 "Create Your Account" CTAs render — preserved (text content unchanged). |

**Expected state after completion:**
- [ ] Hero CTA at line 166 uses `text-hero-bg` and `shadow-[0_0_30px_rgba(255,255,255,0.20)]`.
- [ ] Final CTA at line 382 uses the same.
- [ ] `grep "text-primary" frontend/src/pages/RegisterPage.tsx` returns 0 hits in CTAs (the file may still have `text-primary` on icon accents, etc. — only the two CTA migrations matter).
- [ ] `animate-shine` and other decorations preserved — no regression on the differentiator Check icon assertions.
- [ ] Step 12 catches any test class-string assertion failures on the migrated CTAs.

---

### Step 6: Navbar Get Started bg-primary → Pattern 2 white pill (Change 6)

**Objective:** Migrate Navbar's `Get Started` non-transparent (scrolled) state from deprecated `bg-primary hover:bg-primary-lt` to canonical Pattern 2 white pill (`bg-white text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]`). Preserve transparent state.

**Files to create/modify:**
- `frontend/src/components/Navbar.tsx` — lines 124-134 (Get Started Link)
- `frontend/src/components/__tests__/Navbar.test.tsx` — class-string assertions (locate via test names during execution)

**Details:**

1. On Navbar.tsx:124-134, the Link's `className` (via `cn()`) currently has two branches:
   - Transparent: `bg-white/20 hover:bg-white/30 border border-white/30`
   - Non-transparent: `bg-primary hover:bg-primary-lt`
2. Update the non-transparent branch to: `bg-white text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]`.
3. Note: the base classes (line 127) include `text-white` — the non-transparent branch must also include `text-hero-bg` to override (cn / tailwind-merge handles override priority correctly with the later class winning). Verify this works correctly during execution; if the override doesn't take, restructure to remove `text-white` from the base and add it to ONLY the transparent branch.
4. PRESERVE the base classes (line 127): `inline-flex items-center rounded-full px-5 py-2 text-sm font-medium transition-[colors,transform] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]`.
5. PRESERVE the transparent branch unchanged: `bg-white/20 hover:bg-white/30 border border-white/30`.
6. **MobileDrawer change:** NONE. Pre-execution recon (Step 1.6) verified MobileDrawer's Get Started Link is already canonical (`bg-white/20 border border-white/30`). Document this finding in the execution log; no code change.

7. **Update Navbar.test.tsx:**
   - Locate test cases asserting on the non-transparent variant (likely test names involving "scrolled", "non-transparent", or class-string snapshot assertions).
   - Remove assertions on `bg-primary` and `hover:bg-primary-lt`.
   - Add assertions on `bg-white`, `text-hero-bg`, `shadow-[0_0_20px_rgba(255,255,255,0.15)]`, and `hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]`.
   - Preserve assertions on the transparent variant.

**Auth gating (existing — preserved):**
- Navbar Get Started is a `<Link to="/register">` regardless of state — Spec 7 does NOT change this. Logged-out and logged-in users both navigate to `/register`. (Authed users on `/register` see the marketing page; existing behavior, not Spec 7's concern.)

**Responsive behavior:**
- Mobile (< 768px): desktop nav hidden, MobileDrawer used instead. Step 6 does NOT touch MobileDrawer (already canonical).
- Tablet (768px+): desktop nav visible. Non-transparent state shows the new Pattern 2 white pill.
- Desktop (1440px): same.

**Inline position expectations:**
- DesktopAuthActions (lines 94-137) renders Log In button + Get Started Link inline with `gap-4`. Both should remain on the same y-axis at all breakpoints ≥768px (no wrapping). After chrome migration, this still holds — Step 6 doesn't change padding or width.

**Guardrails (DO NOT):**
- Do NOT touch the transparent branch chrome.
- Do NOT touch the Log In button (lines 110-123) — only the Get Started Link.
- Do NOT touch MobileDrawer (already canonical per pre-execution recon).
- Do NOT remove `active:scale-[0.98]` (canonical micro-interaction per `09-design-system.md` § "Animation Tokens / Button press feedback").
- Do NOT introduce a new shadow color other than the white-on-white Pattern 2 family.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| Navbar.test.tsx Get Started transparent variant | unit (existing) | Assertions on `bg-white/20`, `border-white/30` — preserved unchanged |
| Navbar.test.tsx Get Started non-transparent variant | unit (updated) | Removed: `bg-primary`, `hover:bg-primary-lt`. Added: `bg-white`, `text-hero-bg`, `shadow-[0_0_20px_rgba(255,255,255,0.15)]`, `hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]` |

**Expected state after completion:**
- [ ] Navbar.tsx:130 (non-transparent branch) uses Pattern 2 white pill.
- [ ] `grep "bg-primary" frontend/src/components/Navbar.tsx` returns 0 hits in DesktopAuthActions.
- [ ] Transparent variant unchanged.
- [ ] MobileDrawer not touched (verified canonical in pre-execution recon).
- [ ] Navbar.test.tsx class-string assertions updated; tests pass.

---

### Step 7: AuthModal validation timing unified to blur+submit (Change 8)

**Objective:** Add blur validation to email and password inputs (login + register views), matching the existing firstName/lastName/confirmPassword pattern. Preserve resetEmail submit-only timing.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/AuthModal.tsx` — email input lines 453-477; password input lines 479-503; possibly `validateEmail` helper if not already extracted

**Details:**

1. **Locate the existing email validation logic.** It currently fires inside `handleSubmit`. Extract to a helper if not already separate, OR inline a brief check on blur. The simplest approach matching the confirmPassword pattern:
   - On email blur: `markTouched('email')` + run the existing email regex check (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)`) and `setEmailError(...)` accordingly.
   - On password blur: `markTouched('password')` + run the existing min-length check (`passwordValue.length >= PASSWORD_MIN_LENGTH`) and `setPasswordError(...)`.

2. **Update email input (lines 457-470):**
   ```tsx
   <input
     ref={emailRef}
     id="auth-email"
     name="auth-email"
     type="email"
     required
     value={emailValue}
     autoComplete="email"
     className="w-full rounded-xl bg-white/[0.06] border border-white/[0.12] px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:border-purple-400/50 focus-visible:shadow-[0_0_15px_rgba(139,92,246,0.15)]"
     aria-label="Email address"
     aria-invalid={(touched.email || submitted) && emailError ? 'true' : undefined}
     aria-describedby={(touched.email || submitted) && emailError ? 'email-error' : undefined}
     onChange={(e) => { setEmailValue(e.target.value); setEmailError(null) }}
     onBlur={() => {
       markTouched('email')
       if (!emailValue) {
         setEmailError('Email is required')
       } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
         setEmailError('Please enter a valid email address')
       }
     }}
   />
   ```
   (Use the existing error copy if it differs — match the strings already used in `handleSubmit`.)

3. **Update email error gate (lines 471-476):** Change the conditional from `{emailError && (...)}` to `{(touched.email || submitted) && emailError && (...)}`.

4. **Update password input (lines 483-496):** Same pattern — add `onBlur` with `markTouched('password')` + length check.

5. **Update password error gate (lines 497-502):** Change to `{(touched.password || submitted) && passwordError && (...)}`.

6. **Update `aria-invalid` and `aria-describedby` on both inputs** to use the gated form: `(touched.email || submitted) && emailError ? 'true' : undefined`.

7. **DO NOT** modify the resetEmail input on the forgot-password view — it stays submit-only per Decision 8.

8. **Verify validation logic still works on submit:** The existing `handleSubmit` runs the same checks; touched gates only affect when errors RENDER, not when they're set. Re-run mental simulation: user submits with empty email → `submitted = true` → `emailError = 'Email is required'` → gate `(touched.email || submitted)` is true → error renders. Pass.

**Auth gating:** No new gates. Validation timing change only — gates which messages display when, not whether the user can proceed.

**Responsive behavior:**
- Mobile (375px): error text wraps inside the input's column. No layout regression.
- Tablet/Desktop: same.

**Inline position expectations:** N/A — error messages are block-level below inputs.

**Guardrails (DO NOT):**
- Do NOT add blur validation to `resetEmail` (forgot-password view single input — Decision 8 keeps submit-only).
- Do NOT change the existing error copy strings — match what's currently in `handleSubmit`.
- Do NOT change validation rules (regex, min-length) — only timing.
- Do NOT remove the `setEmailError(null)` / `setPasswordError(null)` clear-on-input-change in `onChange`.
- Do NOT touch the `firstName`, `lastName`, or `confirmPassword` inputs — they're already canonical.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| Email blur with invalid email shows error (login view) | unit (new — Step 11) | Triggers blur with empty / malformed email, asserts error renders |
| Email blur with valid email does NOT show error | unit (new — Step 11) | Triggers blur with valid email, asserts no error |
| Email error does not appear before blur or submit | unit (new — Step 11) | Asserts error is hidden on initial render and after onChange |
| Password blur with too-short password shows error | unit (new — Step 11) | Triggers blur with `password.length < 8`, asserts error renders |
| Same blur behavior on register view | unit (new — Step 11) | Toggles to register view, repeats above assertions |
| resetEmail validation timing remains submit-only | unit (new — Step 11) | Toggles to forgot-password view, blurs the resetEmail input with invalid email, asserts NO error renders before submit |
| Existing submit-time validation tests | unit (existing) | Preserved — submit-time validation unchanged |

**Expected state after completion:**
- [ ] `touched.email` and `touched.password` are set on blur.
- [ ] Per-field errors render on blur OR submit, matching firstName/lastName/confirmPassword.
- [ ] resetEmail still submit-only.
- [ ] Existing submit-time validation tests pass.
- [ ] New blur-time validation tests pass (added in Step 11).

---

### Step 8: AuthModal password visibility toggle (Change 7)

**Objective:** Add Eye/EyeOff toggle buttons to password and confirmPassword inputs. Independent state per field. 44×44 tap target. aria-label state announcement.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/AuthModal.tsx` — import update; state additions (~line 55); password input wrapper + toggle (lines 479-503 area); confirmPassword input wrapper + toggle (lines 505-544 area)

**Details:**

1. **Update imports (line 2):**
   ```tsx
   import { X, AlertCircle, Eye, EyeOff } from 'lucide-react'
   ```

2. **Add visibility state** (adjacent to existing form state, ~line 55-58):
   ```tsx
   const [showPassword, setShowPassword] = useState(false)
   const [showConfirmPassword, setShowConfirmPassword] = useState(false)
   ```

3. **Wrap password input in relative container.** Currently the input is the direct child of `<div className="mb-3">` (line 479). Restructure:

   ```tsx
   <div className="mb-3">
     <label htmlFor="auth-password" className="mb-1 block text-sm font-medium text-white">
       Password<span className="text-purple-400 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> required</span>
     </label>
     <div className="relative">
       <input
         ref={passwordRef}
         id="auth-password"
         name="auth-password"
         type={showPassword ? 'text' : 'password'}
         required
         value={passwordValue}
         autoComplete={view === 'login' ? 'current-password' : 'new-password'}
         className="w-full rounded-xl bg-white/[0.06] border border-white/[0.12] px-3 py-2.5 pr-12 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:border-purple-400/50 focus-visible:shadow-[0_0_15px_rgba(139,92,246,0.15)]"
         aria-label="Password"
         aria-invalid={(touched.password || submitted) && passwordError ? 'true' : undefined}
         aria-describedby={(touched.password || submitted) && passwordError ? 'password-error' : undefined}
         onChange={(e) => { setPasswordValue(e.target.value); setPasswordError(null) }}
         onBlur={/* from Step 7 */}
       />
       <button
         type="button"
         onClick={() => setShowPassword((prev) => !prev)}
         aria-label={showPassword ? 'Hide password' : 'Show password'}
         className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
       >
         {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
       </button>
     </div>
     {(touched.password || submitted) && passwordError && (
       <p id="password-error" role="alert" className="mt-1 flex items-center gap-1.5 text-sm text-red-400">
         <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
         {passwordError}
       </p>
     )}
   </div>
   ```

4. **Apply the SAME pattern to confirmPassword input** (lines 505-544). Use `showConfirmPassword` state. Independent — toggling password does NOT affect confirmPassword and vice versa.

5. **Verify toggle UX:**
   - Click toggle → `type` attribute changes between `'password'` and `'text'` (NOT a CSS-based hide).
   - `aria-label` changes between `"Show password"` and `"Hide password"`.
   - Toggle has `type="button"` (does NOT submit form when clicked mid-typing).
   - Toggle has `min-h-[44px] min-w-[44px]` tap target.
   - Eye icon when `type === 'password'` (clicking will REVEAL); EyeOff icon when `type === 'text'` (clicking will HIDE). This matches the modern UX convention — the icon shows what the click WILL do.

**Auth gating:** N/A — toggle is in-modal control, not an auth gate.

**Responsive behavior:**
- Mobile (375px): 44×44 toggle button respects mobile tap-target minimum. `pr-12` (48px right padding) prevents typed text from underflowing the toggle.
- Tablet (768px) / Desktop (1440px): same — 44×44 is the floor across all breakpoints.

**Inline position expectations:**
- Toggle button absolutely positioned over input's right edge: `boundingBox().right` is within the input's `boundingBox().right` minus 4px (toggle does NOT overflow input's right edge); `boundingBox().bottom <= input.boundingBox().bottom`. Toggle's `boundingBox().top` and `bottom` should be vertically symmetric within the input via `top-1/2 -translate-y-1/2`.

**Guardrails (DO NOT):**
- Do NOT use a CSS-based hide (e.g., `text-security: disc` or `-webkit-text-security`) — must change input `type` attribute.
- Do NOT make toggle `type="submit"` (would submit form mid-typing).
- Do NOT share state between password and confirmPassword toggles — independent `useState` hooks.
- Do NOT add the toggle to email or any non-password input.
- Do NOT add the toggle to resetEmail (forgot-password view has no password input).
- Do NOT persist toggle state to localStorage — component-local React state only.
- Do NOT remove `pr-12` from the password input className — without it, typed text underflows the toggle.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| Password toggle renders on login view | unit (new — Step 11) | Find the toggle button, assert it exists |
| Password toggle renders on register view (both fields) | unit (new — Step 11) | Toggle to register view, assert both password and confirmPassword have toggles |
| Toggle changes input `type` from `'password'` to `'text'` | unit (new — Step 11) | Click toggle, assert input `type` attribute |
| Toggle updates `aria-label` from "Show password" to "Hide password" | unit (new — Step 11) | Click toggle, assert aria-label |
| Toggle on password does NOT toggle confirmPassword | unit (new — Step 11) | On register view, click password toggle, assert confirmPassword still type="password" |
| Toggle has `type="button"` | unit (new — Step 11) | Assert button attribute (clicking doesn't submit form) |
| Toggle has min-h-[44px] min-w-[44px] | unit (new — Step 11) | Class-string assertion |

**Expected state after completion:**
- [ ] `Eye, EyeOff` imported from `lucide-react`.
- [ ] `showPassword` and `showConfirmPassword` state hooks added.
- [ ] Password input wrapped in `<div className="relative">` with absolute-positioned toggle.
- [ ] confirmPassword input wrapped in same pattern with independent state.
- [ ] Toggle changes input `type` (NOT CSS hide).
- [ ] aria-label switches state.
- [ ] `pr-12` added to both password input classNames.
- [ ] All new tests pass (added in Step 11).
- [ ] Existing AuthModal tests still pass.

---

### Step 9: Delete ComingSoon stub + AuthQueryParamHandler + /login redirect (Change 1)

**Objective:** Replace the deprecated ComingSoon stub with a query-param-driven redirect from `/login` → `/?auth=login`. Mount a new AuthQueryParamHandler that reads `?auth=login|register` from URL search params, opens AuthModal in the requested view, strips the param.

**Files to create/modify:**
- `frontend/src/App.tsx` — delete ComingSoon (lines 119-136); replace `/login` route element (line 291); add AuthQueryParamHandler component definition; mount it inside AuthModalProvider + Routes subtree.

**Details:**

1. **Delete the `function ComingSoon` declaration** (lines 119-136 entire block including the `// BB-40` comment block on line 122).

2. **Verify `Layout` and `SEO` imports remain used elsewhere in App.tsx:**
   - `grep -n "<Layout\|^import { Layout\|^import Layout" frontend/src/App.tsx` — Layout is still used by NotFound (line 138-160) and possibly other routes. Keep import.
   - `grep -n "<SEO\|^import { SEO\|^import SEO" frontend/src/App.tsx` — SEO is still used by NotFound and other routes. Keep import.
   - `grep -n "LOGIN_METADATA" frontend/src/App.tsx` — after ComingSoon deletion, LOGIN_METADATA is unreferenced in App.tsx. PRESERVE the import statement only if the constant is exported by `routeMetadata.ts` (it is — verified in recon Part 13). Remove the App.tsx import line for LOGIN_METADATA only — the constant itself stays in `routeMetadata.ts` for future Phase 1 Spec 1.5b use.

3. **Define `AuthQueryParamHandler` as a `null`-returning component** (near the other helper components, e.g., before `function App()`):

   ```tsx
   /**
    * Spec 7 — reads `?auth=login|register` from URL search params, opens
    * AuthModal in the requested view, strips the param via replace nav.
    * Mounted inside AuthModalProvider + Router subtree so both useAuthModal
    * and useSearchParams resolve. Decision 6 / direction doc Spec 7.
    */
   function AuthQueryParamHandler() {
     const [searchParams] = useSearchParams()
     const navigate = useNavigate()
     const location = useLocation()
     const authModal = useAuthModal()

     useEffect(() => {
       const auth = searchParams.get('auth')
       if (auth !== 'login' && auth !== 'register') return
       if (!authModal) return

       authModal.openAuthModal(undefined, auth)

       // Strip the auth param while preserving any other params
       const next = new URLSearchParams(searchParams)
       next.delete('auth')
       const search = next.toString()
       navigate(
         { pathname: location.pathname, search: search ? `?${search}` : '' },
         { replace: true },
       )
     }, [searchParams, authModal, navigate, location.pathname])

     return null
   }
   ```

   Verify `useSearchParams`, `useNavigate`, `useLocation` are already imported from `react-router-dom` in App.tsx (they should be — used elsewhere). If not, add them.

4. **Replace the `/login` route element** (line 291). Current:
   ```tsx
   <Route path="/login" element={<ComingSoon title="Log In" />} />
   ```
   Change to (Option A — Edge Case Decision A):
   ```tsx
   <Route path="/login" element={<Navigate to="/?auth=login" replace />} />
   ```

5. **Mount AuthQueryParamHandler** inside the `<AuthModalProvider>` + Router subtree. Per Edge Case Decision C, place as sibling of `<Routes>` inside `<RouteTransition>`:

   ```tsx
   <RouteTransition>
     <AuthQueryParamHandler />
     <Routes>
       ...
     </Routes>
   </RouteTransition>
   ```

   The handler renders nothing (`return null`); placement here ensures it runs on every route render so the param is stripped immediately after AuthModal opens.

6. **Verify Navigate is imported** from `react-router-dom` (it should be — used by other redirects in App.tsx).

**Auth gating:**
- `/login` no longer renders any auth-gated content; it instantly redirects.
- `/?auth=login` and `/?auth=register` deep links open the modal regardless of auth state (existing AuthModalProvider behavior — no auth-state branching).
- Handler defensively checks `if (!authModal) return` to handle the (impossible) case where it renders outside `AuthModalProvider`.

**Responsive behavior:**
- Handler is non-visual — no responsive concerns.
- `/login` redirect is browser-level — no responsive concerns.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT delete `LOGIN_METADATA` from `lib/seo/routeMetadata.ts` — the constant stays for future Phase 1 Spec 1.5b/1.5g use (Spec § 11 / Change 1d).
- Do NOT mount the handler outside `<AuthModalProvider>` (would crash) or outside `<BrowserRouter>` (would crash).
- Do NOT add SEO metadata to the redirect route — instant client-side navigation; `/`'s metadata takes precedence (Spec § 11 / Change 1d).
- Do NOT add a redirect for `/login?view=register` — Option A skips this (Edge Case Decision A); marketing emails can use `/?auth=register` directly.
- Do NOT branch on `useAuth().isAuthenticated` in the handler — opens the modal regardless of auth state (matches existing trigger sites, Edge Case Decision I).
- Do NOT add a flash of `ComingSoon` content — the `<Navigate>` element renders instantly.
- Do NOT touch `LOGIN_METADATA` constant in `routeMetadata.ts`.
- Do NOT touch `RouteErrorBoundary`, `Suspense`, or any other route's element.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| `/login` route renders Navigate, not ComingSoon | unit (new) | Mount route at `/login`, assert it redirects to `/?auth=login` |
| `/?auth=login` opens AuthModal in login view on first render | integration (new) | Mount app at `/?auth=login`, assert AuthModal is visible with login view |
| `/?auth=register` opens AuthModal in register view on first render | integration (new) | Same with register view |
| Handler strips `?auth=` param after opening | integration (new) | After AuthModal opens, assert URL contains no `auth=` param |
| Handler ignores invalid values (`?auth=xyz`) | unit (new) | Assert AuthModal does NOT open for `?auth=xyz` |
| Handler preserves other query params (`/?auth=login&utm=email1`) | integration (new) | Strip only `auth=`, preserve `utm=email1` |
| ComingSoon function declaration removed | n/a | `grep "function ComingSoon" frontend/src/App.tsx` returns 0 |

**Expected state after completion:**
- [ ] `function ComingSoon` declaration deleted (lines 119-136).
- [ ] `LOGIN_METADATA` import in App.tsx removed (constant stays in routeMetadata.ts).
- [ ] `Layout` and `SEO` imports preserved (still consumed by NotFound).
- [ ] `AuthQueryParamHandler` component defined.
- [ ] `/login` route element replaced with `<Navigate to="/?auth=login" replace />`.
- [ ] `AuthQueryParamHandler` mounted inside `<RouteTransition>` as sibling of `<Routes>`.
- [ ] `font-script`, `text-text-dark`, `text-primary` deprecated patterns disappear with the deleted ComingSoon.
- [ ] `pnpm typecheck` passes.
- [ ] All new tests pass.

---

### Step 10: TermsUpdateModal verification pass (Change 9)

**Objective:** Verify TermsUpdateModal chrome matches AuthModal canonical patterns. Per Decision 5, the two move in lockstep. Fix any drift surfaced (Edge Case Decision D — `text-primary` on whitePillClass).

**Files to create/modify:**
- `frontend/src/components/legal/TermsUpdateModal.tsx` — line 118 (whitePillClass) IF drift confirmed; otherwise read-only

**Details:**

1. **Verification checklist** (per Spec § 36 / Change 9):
   - Panel chrome at line 136: `mx-4 w-full max-w-md rounded-3xl border border-white/[0.12] bg-hero-bg/95 backdrop-blur-md` + dual box-shadow `shadow-[0_0_40px_rgba(139,92,246,0.15),0_8px_30px_rgba(0,0,0,0.4)]` ✓ verified canonical (recon-confirmed)
   - Backdrop pattern at lines 124-128: `radial-gradient(circle at center, rgba(139, 92, 246, 0.12) 0%, transparent 60%), rgba(0, 0, 0, 0.7)` ✓ verified canonical
   - Gradient H2: should use `GRADIENT_TEXT_STYLE` ✓ verified (per recon Part 2)
   - `useFocusTrap`, `FormError`, `Button` primitives match ✓
   - **Drift to verify (Edge Case Decision D):** TermsUpdateModal.tsx:118 `whitePillClass` uses `text-primary`. AuthModal's whitePillClass uses `text-hero-bg`. RegisterPage's CTAs are being migrated `text-primary` → `text-hero-bg` in Step 5. Decision 5 + Decision 12 + Pattern 2 canonical all point to `text-hero-bg` as correct.

2. **If drift confirmed** (likely yes), migrate line 118:
   - Before: `'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-gray-100 ...'`
   - After: `'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-hero-bg transition-all hover:bg-gray-100 ...'`

3. **Hardcoded animation values check:** Search TermsUpdateModal.tsx for `setTimeout.*[0-9]+\)` or other ms literals. If found, migrate to `ANIMATION_DURATIONS` tokens. Recon did NOT explicitly flag this for TermsUpdateModal but Decision 5 says lockstep with AuthModal. If clean, document.

4. **Mobile backdrop-click gating** (Decision 9): `handleBackdropClick` at lines 110-115 already uses `matchMedia('(max-width: 768px)')` to suppress mobile dismissal. PRESERVE.

5. **Document findings** in execution log: drift found / drift fixed / no drift surfaced.

**Auth gating:** TermsUpdateModal is gated content (terms acceptance). Spec 7 does NOT modify the gate behavior (Decision 9 + Decision 5).

**Responsive behavior:**
- Mobile: backdrop click does NOT dismiss (Decision 9).
- Tablet/Desktop: backdrop click dismisses (matches AuthModal).

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT touch `handleBackdropClick` — Decision 9 preserves the asymmetry.
- Do NOT touch the `legal-api` calls or accept-form view logic — visual chrome only.
- Do NOT migrate to Pattern 2 hero-variant shadows (`shadow-[0_0_30px_rgba(255,255,255,0.20)]`) — TermsUpdateModal's whitePillClass uses Pattern 1 inline-CTA shadow (`px-6 py-2.5 text-sm` is the inline variant, not hero variant). Only the `text-primary` → `text-hero-bg` text-color change applies.
- Do NOT touch the textPillClass at line 119-120 — that's the secondary "Later" / "Cancel" button, separate from the primary white pill.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| TermsUpdateModal.test.tsx existing 167 LOC | unit (existing) | All preserved; if migration adds `text-hero-bg`, verify class-string assertions don't break (likely behavioral tests, no class assertions) |
| TermsUpdateModal whitePillClass uses `text-hero-bg` (NEW if drift fixed) | unit (new — optional) | Class-string assertion on the Accept button |

**Expected state after completion:**
- [ ] Verification checklist all green.
- [ ] If `text-primary` drift on whitePillClass confirmed: migrated to `text-hero-bg`.
- [ ] If hardcoded animation literals: migrated to `ANIMATION_DURATIONS` tokens.
- [ ] Mobile backdrop-click gating preserved.
- [ ] Findings documented in execution log.

---

### Step 11: AuthModal test updates (Change 10 + Change 7e + Change 8e)

**Objective:** Update `AuthModal.test.tsx` to reflect Spotify button deletion, add password toggle tests, add validation timing tests, preserve existing canonical chrome assertions.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/__tests__/AuthModal.test.tsx`

**Details:**

1. **Delete Spotify assertions** (lines 112-113 area):
   - Remove `expect(...).toContain('border-white/[0.12]')` and `expect(...).toContain('text-white')` IF those assertions are scoped to the Spotify button specifically (verify by reading the test name and surrounding context).
   - Delete any test case named "renders Spotify continue button" or similar.
   - The `border-white/[0.12]` class is ALSO used on the input chrome (line 91-92) — be careful not to delete the input assertion. Only the Spotify-scoped assertion goes.

2. **Add password toggle tests** (per Step 8 Test specifications):
   ```tsx
   describe('password visibility toggle', () => {
     it('renders Eye toggle on login view password field', () => { /* ... */ })
     it('renders Eye toggles on both register view password fields', () => { /* ... */ })
     it('clicking toggle changes input type from password to text', async () => { /* ... */ })
     it('clicking toggle updates aria-label from "Show password" to "Hide password"', async () => { /* ... */ })
     it('toggle on password field does not affect confirmPassword field visibility', async () => { /* ... */ })
     it('toggle has type="button" and does not submit form when clicked', async () => { /* ... */ })
     it('toggle button has min-h-[44px] min-w-[44px] tap target', () => { /* ... */ })
   })
   ```

3. **Add validation timing tests** (per Step 7 Test specifications):
   ```tsx
   describe('validation timing — blur + submit symmetry', () => {
     it('email error appears on blur with invalid email (login view)', async () => { /* ... */ })
     it('email error appears on blur with invalid email (register view)', async () => { /* ... */ })
     it('email error does not appear before blur or submit', () => { /* ... */ })
     it('password error appears on blur with too-short password', async () => { /* ... */ })
     it('resetEmail validation timing remains submit-only (no blur error)', async () => { /* ... */ })
   })
   ```

4. **Verify canonical chrome assertions preserved** (per Spec § 41 / Change 10d). Run `pnpm test AuthModal` and confirm these all still pass:
   - Lines 77-79: `bg-hero-bg/95`, `backdrop-blur-md`, `rounded-3xl`
   - Lines 91-92: input `bg-white/[0.06]`, `border-white/[0.12]`
   - Line 98: close button `text-white/50`
   - Line 106: error `text-red-400`
   - Line 121: switch link `text-purple-400`
   - Line 127: title `not.toContain('font-script')`
   - Lines 134-136: label `text-white`, asterisk `text-purple-400`

**Auth gating:** N/A — test updates only.

**Responsive behavior:** N/A — unit tests.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT delete tests that don't reference the Spotify button — only Spotify-scoped assertions go.
- Do NOT delete the canonical chrome assertions enumerated above.
- Do NOT add tests that are out of scope (e.g., real auth flow tests — that's auth-service.test.ts territory).

**Test specifications:**
| Test count | Description |
|---|---|
| ~7 new password toggle tests | Per Step 8 spec |
| ~5 new validation timing tests | Per Step 7 spec |
| ~2 deletions | Spotify-scoped assertions |
| ~11 preserved canonical | Lines 77-79, 91-92, 98, 106, 121, 127, 134-136 |

**Expected state after completion:**
- [ ] Spotify assertions removed.
- [ ] ~12 new tests added covering password toggle + validation timing.
- [ ] Canonical chrome assertions all pass.
- [ ] `pnpm test AuthModal` passes with no new failures.
- [ ] Total LOC delta: +~80 LOC (new tests) − ~5 LOC (Spotify removal) = ~+75 LOC net.

---

### Step 12: RegisterPage test updates (Change 11)

**Objective:** Update RegisterPage.test.tsx to reflect Step 5's white-pill chrome migration. Preserve all 33 existing tests' behavioral assertions.

**Files to create/modify:**
- `frontend/src/pages/__tests__/RegisterPage.test.tsx`

**Details:**

1. **Locate any class-string assertions on the two CTAs (Hero CTA / Final CTA):**
   - Search for `text-primary` in test assertions on the CTAs. Update to `text-hero-bg`.
   - Search for `shadow-[0_0_20px_rgba(255,255,255,0.15)]` in test assertions on the CTAs. Update to `shadow-[0_0_30px_rgba(255,255,255,0.20)]`.

2. **PRESERVE the differentiator Check icon assertions** (lines 314-315 per recon):
   - `not.toContain('text-primary')` AND `toContain('text-white')` — these are about Check icons in the differentiator section, NOT the white-pill CTAs. Step 5 does NOT touch the Check icons.

3. **PRESERVE the structural assertion** (line 301 per recon): exactly 2 "Create Your Account" CTAs render — text content unchanged through Step 5.

4. **PRESERVE existing animation assertions** (lines 211, 220 per recon): `animate-shine`, `animate-gradient-shift` still present.

5. Run `pnpm test RegisterPage` and confirm all 33 tests pass.

**Auth gating:** N/A — test updates only.

**Responsive behavior:** N/A.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT touch the differentiator Check icon assertions.
- Do NOT touch animation class assertions.
- Do NOT touch the structural "exactly 2 CTAs" assertion.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| Hero CTA white-pill class assertion (if exists) | unit (updated) | Replaces `text-primary` with `text-hero-bg` and shadow |
| Final CTA white-pill class assertion (if exists) | unit (updated) | Same |
| 33 existing tests | unit (preserved) | All pass |

**Expected state after completion:**
- [ ] Class-string assertions on CTAs updated (if any existed).
- [ ] Differentiator Check icon assertions preserved.
- [ ] Animation assertions preserved.
- [ ] Structural assertion preserved.
- [ ] `pnpm test RegisterPage` passes all 33 tests.

---

### Step 13: Final regression sweep + acceptance criteria verification

**Objective:** Run full test suite, build, lint. Walk through every spec acceptance criterion and verify pass.

**Files to create/modify:** None — verification step.

**Details:**

1. **Build + lint:**
   - `cd frontend && pnpm build` — must succeed.
   - `pnpm lint` — must pass.
   - `pnpm typecheck` (or whatever the project's typecheck command is) — must pass.

2. **Test suite:**
   - `pnpm test` — must pass at the post-Spec-6D baseline (9,470 pass / 1 pre-existing fail per CLAUDE.md § "Build Health").
   - Acceptable: the second flaky `useNotifications` test occasionally fails on tight timing — that's pre-existing.
   - NEW failures (other than the pre-existing one) = regression; investigate before continuing.

3. **Manual eyeball checks (Playwright deferred to `/verify-with-playwright`):**
   - `/login` redirect → `/?auth=login` → AuthModal opens in login view, query param stripped.
   - `/?auth=login` direct → AuthModal opens in login view.
   - `/?auth=register` direct → AuthModal opens in register view.
   - `/register` Hero CTA + Final CTA visually match new Pattern 2 white pill (text reads as hero-bg darker color, slightly stronger shadow).
   - AuthModal login + register: NO Spotify button, NO "or" divider. Password toggles work, independent state.
   - AuthModal email/password blur: errors render immediately on invalid input.
   - AuthModal forgot-password view: chrome unchanged, toast-stub behavior unchanged.
   - Navbar Get Started: scrolled state shows white pill; transparent state unchanged.
   - PrayerWall save/bookmark: AuthModal subtitle "Sign in to save prayers to your list" (no period).
   - TermsUpdateModal: chrome matches AuthModal patterns; mobile backdrop-click gating preserved.

4. **Walk through every acceptance-criteria checkbox in Spec § 351-489.** Each must verify pass. Any failure = STOP and fix before reporting Done.

5. **Bundle size delta** (per Spec § 226): negligible. `Eye + EyeOff` icons (~2 KB pre-tree-shake) added; Spotify button + divider deleted (~0.5 KB). Net ~+1.5 KB or less, well within the "no measurable increase" expectation.

6. **Verify NO regressions on:**
   - `/grow` (Spec 6 cluster) — no visual changes.
   - `/` (Dashboard) — no visual changes.
   - `/daily` (all 4 tabs) — no visual changes.
   - `/local-support/*` — no visual changes.
   - `/bible` and `/bible/:book/:chapter` — no visual changes.
   - AuthContext code path — verify `git diff` does not touch `contexts/AuthContext.tsx`, `services/auth-service.ts`, `lib/api-client.ts`, `lib/auth-storage.ts`, `types/auth.ts`, `hooks/useAuth.ts`, `hooks/useAuthModal.ts`, `hooks/useLegalVersions.ts`, `components/legal/LegalVersionGate.tsx`.
   - `mirrorToLegacyKeys` + `// Transitional — removed in Phase 2 cutover` comments — verify `git diff` shows these untouched.

**Auth gating:** Verify all 60+ existing AuthModal trigger sites still function (sample-test 5-10 via Playwright after `/verify-with-playwright` runs).

**Responsive behavior:** Verify mobile (375px), tablet (768px), desktop (1440px) at least for `/register`, `/`, AuthModal opened on each breakpoint.

**Guardrails (DO NOT):**
- Do NOT commit (per spec § 491 — user commits manually).
- Do NOT skip any acceptance criterion.
- Do NOT report Done if any acceptance criterion fails or any regression surfaces.

**Test specifications:** Full suite + manual checks per Spec § 351-489.

**Expected state after completion:**
- [ ] `pnpm build` succeeds.
- [ ] `pnpm lint` passes.
- [ ] `pnpm test` matches the post-Spec-6D baseline (no new failures).
- [ ] All acceptance criteria verified pass.
- [ ] No regressions on out-of-scope surfaces.
- [ ] AuthContext code path untouched (verified via git diff).
- [ ] Direction doc decisions 1-20 satisfied.
- [ ] Plan ready for `/verify-with-playwright` and `/code-review`.

---

## Step Dependency Map

| Step | Depends On | Description |
|---|---|---|
| 1 | — | Pre-execution recon verification |
| 2 | 1 | Subtitle copy unification (3 sites) |
| 3 | 1 | AuthModal hardcoded 150ms → token |
| 4 | 1 | Spotify button + divider deletion |
| 5 | 1 | RegisterPage white-pill drift fix |
| 6 | 1 | Navbar Get Started bg-primary migration |
| 7 | 1 | AuthModal validation timing unified |
| 8 | 1, 7 | AuthModal password visibility toggle (depends on Step 7's blur handler scaffold) |
| 9 | 1 | Delete ComingSoon + AuthQueryParamHandler + /login redirect |
| 10 | 1, 3 | TermsUpdateModal verification pass (Step 3 establishes the token-import pattern if drift exists) |
| 11 | 4, 7, 8 | AuthModal test updates (Spotify deletion + validation + toggle tests) |
| 12 | 5 | RegisterPage test updates |
| 13 | 1-12 | Final regression sweep |

**Parallelization:** Steps 2, 3, 4, 5, 6, 7, 9, 10 are all independent of one another after Step 1 — could run in parallel under different developers. Step 8 depends on Step 7 (validation timing scaffold). Step 11 depends on 4, 7, 8. Step 12 depends on 5. Step 13 is the final gate.

For sequential execution by `/execute-plan`, follow the spec's recommended order: 9 (stub deletion + redirect), 2 (subtitle), 3 (150ms), 4 (Spotify), 5 (RegisterPage), 6 (Navbar), 7 (validation), 8 (password toggle), 10 (TermsUpdateModal verify), 11 + 12 (tests), 13 (final sweep). The plan's step numbers reorder slightly to put the larger Step 9 last among code changes (per the pre-execution recon's "verify before code" principle) — but the spec's recommended order is also correct.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|---|---|---|---|---|
| 1 | Pre-execution recon verification | [COMPLETE] | 2026-05-05 | Verified all file paths, line numbers, and assumptions |
| 2 | Subtitle copy unification | [COMPLETE] | 2026-05-05 | PrayerResponse.tsx, InteractionBar.tsx, SaveToPrayers.test.tsx — trailing period dropped |
| 3 | AuthModal hardcoded 150ms → token | [COMPLETE] | 2026-05-05 | `ANIMATION_DURATIONS.fast` from `@/constants/animation` |
| 4 | Spotify button + divider deletion | [COMPLETE] | 2026-05-05 | Spotify button + `<hr>` divider removed; Spotify test deleted |
| 5 | RegisterPage white-pill drift fix | [COMPLETE] | 2026-05-05 | `text-primary` → `text-hero-bg`, shadow updated on both CTAs |
| 6 | Navbar Get Started bg-primary migration | [COMPLETE] | 2026-05-05 | Non-transparent state migrated to Pattern 2 white pill; Navbar tests updated |
| 7 | AuthModal validation timing unified | [COMPLETE] | 2026-05-05 | Blur/submit-gated validation for email + password; `markTouched()` helper |
| 8 | AuthModal password visibility toggle | [COMPLETE] | 2026-05-05 | Eye/EyeOff toggles on password + confirm-password; aria-labels; confirm uses `'Show confirmation'`/`'Hide confirmation'` to avoid regex collision |
| 9 | Delete ComingSoon + AuthQueryParamHandler + /login redirect | [COMPLETE] | 2026-05-05 | `AuthQueryParamHandler` added to App.tsx; `/login` → `<Navigate to="/?auth=login" replace />` |
| 10 | TermsUpdateModal verification pass | [COMPLETE] | 2026-05-05 | `text-primary` → `text-hero-bg` drift confirmed and fixed |
| 11 | AuthModal test updates | [COMPLETE] | 2026-05-05 | Spotify test deleted; 5 blur-validation tests + 6 password-toggle tests added |
| 12 | RegisterPage test updates | [COMPLETE] | 2026-05-05 | Verified — no stale class-string assertions; no changes needed |
| 13 | Final regression sweep + acceptance verification | [COMPLETE] | 2026-05-05 | 9,498 pass / 2 pre-existing fails; PrayTabContent flaky confirmed pre-existing via git stash |
