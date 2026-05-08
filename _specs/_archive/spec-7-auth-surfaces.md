# Spec 7: Auth Surfaces

**Master Plan Reference:** Direction document at `_plans/direction/auth-2026-05-05.md` is the locked decision set (20 numbered decisions). Recon at `_plans/recon/auth-2026-05-05.md` is the source of truth for the current state of `AuthModal`, `RegisterPage`, the `/login` stub, `TermsUpdateModal`, and the navbar/mobile-drawer auth CTAs. This is the seventh top-level visual spec following the Round 3 visual migration cycle (Specs 4A/4B/4C Dashboard, Spec 5 Local Support, Specs 6A/6B/6C Grow). Auth surfaces are the last user-facing surface area outside the Bible cluster (BibleReader's chrome is documented intentional drift, not a migration target). After Spec 7 ships, the Round 3 visual migration is complete across every reachable user-facing surface that was in scope.

This is a **drift-cleanup + small-adds spec**, not a full migration. The recon found AuthModal's panel chrome already canonical (`rounded-3xl bg-hero-bg/95 backdrop-blur-md` with the canonical dual box-shadow), no cyan drift, no `font-script` on auth headings, canonical `FormError` + `Button` + `useFocusTrap` + `GRADIENT_TEXT_STYLE` patterns throughout, and `RegisterPage` already on the canonical `<GlowBackground variant="fullPage">` atmospheric layer. The shape of Spec 7 is closer to a polish pass than to Specs 6A/6B/6C — most work is mechanical pattern application across already-canonical files. Two small adds (password visibility toggle, `/login` query-param redirect) introduce new behavior.

Patterns this spec USES (already shipped): the canonical `bg-hero-bg/95 backdrop-blur-md rounded-3xl` panel chrome with dual box-shadow (already on AuthModal + TermsUpdateModal); white-pill Pattern 2 CTA (`bg-white text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)]` — canonical for non-climax CTAs); `<GlowBackground variant="fullPage">` (already on RegisterPage); `GRADIENT_TEXT_STYLE` (already on AuthModal H2 + TermsUpdateModal H2); `ANIMATION_DURATIONS` tokens from `frontend/src/constants/animation.ts` (BB-33 discipline); `useFocusTrap`, `FormError`, `Button` primitive (all in use); `useSearchParams` + `useNavigate` from React Router (used elsewhere — for `/login` redirect wiring). Patterns this spec INTRODUCES: query-param-driven AuthModal opening (`/?auth=login|register`) — a new deep-link pattern for marketing emails and future password-reset email links; password visibility toggle (Eye/EyeOff Lucide icons, 44×44 tap target, aria-label state announcement). Patterns this spec MODIFIES: none — no direction-doc refinements needed (the recon resolved all open questions without needing decision-level overrides during spec writing).

**Branch discipline:** Stay on `forums-wave-continued`. Do NOT create new branches, commit, push, stash, reset, or run any branch-modifying git command. The user manages all git operations manually. The recon and direction docs (`_plans/recon/auth-2026-05-05.md`, `_plans/direction/auth-2026-05-05.md`) are intentional input context for this spec and remain on disk regardless of git state.

---

## Affected Frontend Routes

- `/` — receives the `AuthQueryParamHandler` mount (reads `?auth=login|register`, opens `AuthModal` in the requested view, strips the query param via `replace` navigation). The handler is a `null`-returning component mounted inside the `AuthModalProvider` subtree and inside the React Router subtree so both `useAuthModal()` and `useSearchParams`/`useLocation`/`useNavigate` resolve. Home page rendering itself is unchanged.
- `/?auth=login` — new deep-link target. Opens `AuthModal` in login view, strips the param post-open. Marketing emails and the `/login` redirect target this URL.
- `/?auth=register` — new deep-link target. Opens `AuthModal` in register view, strips the param post-open. The `/login?view=register` redirect (Option B) targets this URL.
- `/login` — route element changes from rendering `ComingSoon` to a `<Navigate>`-based redirect. Two implementation options: Option A (`<Navigate to="/?auth=login" replace />`) or Option B (small wrapper that reads `?view=...` and redirects to `/?auth=login` or `/?auth=register` accordingly). Either is acceptable; pick whichever is cleaner during execution.
- `/register` — receives white-pill drift fix on 2 CTAs (Hero CTA + Final CTA): `text-primary` → `text-hero-bg`, `shadow-[0_0_20px_rgba(255,255,255,0.15)]` → `shadow-[0_0_30px_rgba(255,255,255,0.20)]`. Hero atmospheric layer (`<GlowBackground variant="fullPage">`), `animate-shine`, and `animate-gradient-shift` decorations all preserved. CTA text content ("Create Your Account") and onClick handlers (open AuthModal in register view) preserved.
- `/prayer-wall` — regression surface. Two child components consumed here (`PrayerResponse`, `InteractionBar`) lose the trailing period from the auth modal subtitle "Sign in to save prayers to your list". Visual rendering of `/prayer-wall` itself unchanged.
- `/prayer-wall/:id` — regression surface for the same subtitle drift fix.
- All other routes — regression surface for the Navbar Get Started CTA migration. Every page that renders `<Navbar>` (the entire app except `/bible/:book/:chapter` which uses `ReaderChrome`) sees the Get Started button's non-transparent (scrolled) state migrate from `bg-primary hover:bg-primary-lt` to canonical Pattern 2 white pill (`bg-white text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]`). The transparent (over-hero) state stays unchanged.

---

## Overview

Worship Room's auth surfaces are the trust moments — the shell where a user creates an account, logs back in, and reads required policy updates. They sit on a different visual register than the rest of the app: not feature surfaces (where atmospheric BackgroundCanvas blooms create immersion), not authoring surfaces (where the canonical violet textarea glow signals emotional weight), but task-completion modals where the right design decision is *quiet competence* — the user wants in, the form should not get in their way. The recon found that auth surfaces are largely already canonical: `AuthModal`'s panel chrome, gradient H2, FormError, Button, useFocusTrap, and 6-field markup all match Round 3 / dark-theme expectations. `RegisterPage`'s atmospheric layer (`<GlowBackground variant="fullPage">`) is canonical for long-scroll marketing pages. `TermsUpdateModal` is a faithful sibling that mirrors `AuthModal`'s idiom.

What's NOT canonical and what this spec fixes: a hardcoded `setTimeout(..., 150)` on AuthModal's close path (BB-33 token discipline drift); a disabled "Continue with Spotify" OAuth placeholder + "or" divider that signal a feature not on the immediate roadmap (better to remove than imply availability — when real OAuth wires later in Phase 1 Spec 1.5g, provider buttons can be reintroduced cleanly); two RegisterPage white-pill CTAs that drift from canonical Pattern 2 in two ways (`text-primary` instead of `text-hero-bg`, and the older `shadow-[0_0_20px_rgba(255,255,255,0.15)]` instead of the canonical `shadow-[0_0_30px_rgba(255,255,255,0.20)]`); a Navbar "Get Started" button whose non-transparent (scrolled) branch uses `bg-primary` solid (a deprecated treatment from before Pattern 2 was canonicalized); two subtitle strings that terminate with a period when the other 31 do not ("Sign in to save prayers to your list." vs the unterminated convention); and a `/login` route that renders a `ComingSoon` stub built from deprecated patterns (`font-script`, `text-text-dark`, `text-primary`).

This spec also lands two small adds. **Password visibility toggle**: both password and confirmPassword inputs gain an Eye/EyeOff icon button positioned absolute-right inside the input wrapper, 44×44 tap target, aria-label switching between "Show password" and "Hide password" based on state. Each field has independent visibility state — toggling password visibility doesn't toggle confirmPassword visibility. Standard modern UX; accessibility win for users who type complex passwords on mobile keyboards. **Query-param-driven `/login` redirect**: the `/login` route stops rendering ComingSoon and instead redirects to `/?auth=login`. A new `AuthQueryParamHandler` component (or hook) mounted inside the `AuthModalProvider` + Router subtrees reads `?auth=login|register` from `useSearchParams()`, calls `openAuthModal(undefined, view)`, and strips the query param via `navigate(pathname, { replace: true })` to keep the URL clean post-open. This gives us deep-linkable auth URLs (shareable login link for marketing emails, password reset email links once Phase 1 Spec 1.5b lands) without maintaining a parallel `/login` page.

This spec also unifies validation timing. The recon found firstName, lastName, and confirmPassword already use the canonical `(touched.<field> || submitted) && error` rendering gate, but email and password use only `submitted && error` — meaning errors don't appear on blur, only on submit. Decision 8 unifies them: extend the `touched` state object to include `email` and `password` keys, add `onBlur={() => setTouched((prev) => ({ ...prev, <field>: true }))}` to both inputs, and update the rendering gates accordingly. `resetEmail` (in the forgot-password view) keeps its current submit-only timing — it's a one-field form, blur validation adds no value there.

The migration is visual + class-string + behavior-add. No data-fetching changes. No `AuthContext` / `AuthProvider` / `mirrorToLegacyKeys` changes — those are Phase 2 cutover concerns and the `// Transitional — removed in Phase 2 cutover` comments are load-bearing for the future grep-and-remove. No `auth-service.ts` / `api-client.ts` / `auth-storage.ts` changes (the service layer is canonical post-Spec-1.9). No new auth gates introduced (the existing 60+ AuthModal trigger sites stay wired exactly as they are — only the 2 outliers that drift on the subtitle's trailing period are touched). No new localStorage keys introduced. No real OAuth wiring (Phase 1 Spec 1.5g territory) and no real forgot-password flow (Phase 1 Spec 1.5b territory). No `FormField` primitive adoption (Decision 16 — that's a refactor concern that belongs in its own dedicated spec). No `RegisterSkeleton` (Decision 17 — bundle measurement first; most users hit `/register` via AuthModal trigger, not as cold first-page load).

Behavioral preservation is non-negotiable. Every existing test that asserts on AuthModal behavior — focus trap, escape-key dismiss, backdrop-click-to-dismiss-on-mobile (Decision 9 keeps this asymmetry intentional vs TermsUpdateModal which gates this), submit handler firing on Enter, view switching between login/register/forgot-password, FormError rendering, AUTH_ERROR_COPY mapping, gradient H2 rendering — must continue to pass without modification. Same for RegisterPage's 33 existing tests (per recon Part 10) and Navbar's class-string variant tests. Test updates are scoped to: deleting Spotify-button assertions (lines 112-113 of AuthModal.test.tsx) since the button is deleted; adding password-toggle test cases (per Change 7e); adding blur+submit validation test cases (per Change 8e); updating RegisterPage white-pill class assertions if any exist on the migrated CTAs (per Change 11); and updating Navbar Get Started variant assertions (per Change 12).

After this spec ships, the auth surface area is uniformly canonical: every white-pill CTA across the app uses Pattern 2 (`text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)]` or its hover variant), no `bg-primary` solid CTAs remain in user-facing surfaces (the last 4 Decision-9 sites are now zero), no hardcoded animation millisecond literals remain in AuthModal, the Spotify OAuth placeholder is gone, the `/login` deep-link pattern works, password visibility toggles match modern UX, and validation timing is symmetric across all 6 input fields in AuthModal. The Round 3 visual migration is complete across every reachable user-facing surface that was in scope.

---

## User Story

As a **logged-out visitor opening AuthModal from any of the 60+ trigger sites across the app**, I want the modal to feel like the same calm, atmospheric trust surface every time — the violet glow on the panel reading as "this is where you trust us with your account", the H2 wearing the canonical gradient that ties the moment back to the rest of the marketing language, the form fields utilitarian and unfussy (because auth is task completion, not emotional authoring), the submit button reading as a quiet white pill (because gradient is reserved for the emotional climax of generating something genuinely new — auth is a different category), and the password visibility toggle just there when I need it on mobile so I'm not retyping my password three times because the touch keyboard auto-corrected an o to an 0. When I hit blur on email after typing something invalid, I want to see the error immediately rather than discover it only after I press Submit and the whole form throws errors at once — that's symmetric with how firstName / lastName / confirmPassword already behave. When I'm in the forgot-password view and submit my email, the toast still tells me to check my inbox (the stub copy from Spec 1.5b's preparation) — Spec 7 doesn't touch that behavior, only the chrome around it.

When I open `/register` via a direct link (a marketing email, a "Create your account" CTA on a static page), I want the page to feel like a long-scroll marketing surface — the GlowBackground orbs distributed across the full scroll length giving atmospheric continuity, the Hero CTA a canonical white pill (`text-hero-bg` not `text-primary`, the slightly stronger Pattern 2 shadow rather than the older 0.15-opacity treatment), the differentiator section's Check icons rendering on `text-white` per the existing assertions, the Final CTA at the bottom matching the Hero CTA's chrome exactly, the `animate-shine` and `animate-gradient-shift` decorations preserved (per RegisterPage.test.tsx), and clicking either CTA opening AuthModal in register view rather than navigating away from the page. When I navigate to `/login` directly (typed it into the address bar, clicked an old marketing link, came from a password reset email once those land), the page redirects me cleanly to `/?auth=login` and AuthModal opens in login view — no half-built "Coming Soon" stub, no Caveat font on a placeholder heading, just the modal I expected.

When I scroll past the navbar's transparent state (over-hero placement on most pages) into its non-transparent state, the "Get Started" button stays visible but switches treatment — the over-hero white-with-border treatment becomes the canonical white pill (matching the rest of the marketing CTA family). When I'm a logged-out user on the Prayer Wall reading prayers and I click the bookmark icon, the AuthModal opens with the subtitle "Sign in to save prayers to your list" (no terminating period — matching the other 31 unterminated subtitle strings the app uses for "Sign in to ..." prompts).

---

## Requirements

### Functional Requirements

#### Pre-execution recon (mandatory before any code change)

1. **Verify Specs 6A/6B/6C/6D are merged into the working branch.** Spec 6A landed (BackgroundCanvas on `/grow`, FrostedCard adoption across plan/challenge cards, Tonal Icon Pattern, FilterBar deletion, ConfirmDialog subtle Button). Spec 6B landed (BackgroundCanvas on `/reading-plans/:planId` and `/challenges/:challengeId`, Caveat removal on detail h1, hero subtitle treatment, FrostedCard subdued action callouts, not-found page subtle Buttons, ChallengeDetail redundant banner deletion). Spec 6C landed (CreatePlanFlow CREATION_BG_STYLE → BackgroundCanvas, two Caveat h1s → GRADIENT_TEXT_STYLE, cyan textarea glow → canonical violet, Step 1 Next subtle Button + Step 2 Generate gradient Button, three celebration overlay Caveat removals with themeColor preservation per the 6C refinement, DayCompletionCelebration Continue subtle Button, Button gradient variant primitive extension). Spec 6D landed (any final Grow polish patches). Re-confirm at execution start.

2. **Verify the direction doc** at `_plans/direction/auth-2026-05-05.md` is present and the locked decisions referenced throughout this spec match — particularly Decisions 1, 2, 3, 4, 5 (visual chrome preservation), 6, 7, 8, 9 (behavior — query-param redirect, password toggle, validation timing, AuthModal vs TermsUpdateModal backdrop asymmetry), 10, 11, 12, 13, 14, 15 (drift cleanups — RegisterPage white-pill, AuthModal 150ms token, Navbar bg-primary migration, ComingSoon deletion, subtitle trailing period, Spotify OAuth removal), 16, 17, 18, 19, 20 (out of scope — FormField, RegisterSkeleton, AuthContext, real OAuth, real forgot-password). If any decision in this spec disagrees with the direction doc, STOP and reconcile before writing code.

3. **Verify the recon doc** at `_plans/recon/auth-2026-05-05.md` is present. The recon is the source of truth for current line numbers, file structures, and class strings; all line-number references in this spec come from the recon and may have shifted by ±N lines if other commits have touched these files since the recon was written. Treat recon line numbers as approximate hints; use grep / structural anchors (function names, JSX attribute names, `const` names) to locate the exact migration target during execution.

4. **ANIMATION_DURATIONS token inventory.** Read `frontend/src/constants/animation.ts` and confirm `ANIMATION_DURATIONS.fast` exists. Capture its value (Decision 11 accepts either 150ms or 200ms — both are within tolerance for the close-fully-then-fade pattern AuthModal uses on line 87). If the constant doesn't exist or uses a different name (e.g., `DURATIONS.fast`, `ANIMATION.FAST`, `Durations.fast`), report findings BEFORE proceeding with Change 3 and align to the canonical export. Do not add a new token to match `150ms` exactly — use the canonical token even if it shifts the close timing by ±50ms.

5. **Lucide Eye / EyeOff icon availability.** These icons are commonly imported across the app; the recon confirmed `lucide-react` is in `frontend/package.json`. Verify the import path `import { Eye, EyeOff } from 'lucide-react'` resolves cleanly during execution. If unavailable (e.g., the version of lucide-react installed predates the Eye/EyeOff exports — unlikely but verifiable), flag immediately — Change 7 needs them. Fallback: a hand-rolled SVG eye icon, but only if the canonical Lucide path is genuinely unavailable.

6. **MobileDrawer Get Started chrome inventory.** Read `frontend/src/components/MobileDrawer.tsx` (the recon noted lines 252-269 for the logged-out "Get Started" link). Capture the current chrome on the link. If it's already canonical Pattern 2 white pill, Change 6 only touches the desktop Navbar (the Navbar.tsx change). If it's `bg-primary` or any other deprecated treatment, Change 6 extends to MobileDrawer with the same migration pattern. Either way, the spec scope and acceptance criteria below cover both cases — the conditional only affects whether MobileDrawer.tsx appears in the diff.

If any pre-execution finding diverges from spec assumptions, CC reports findings BEFORE writing changes and waits for direction.

#### Change set

The 12 changes below are the locked migration set. Order suggested by direction doc (smallest blast radius first): stub deletion + redirect, subtitle copy, hardcoded ms, Spotify removal, RegisterPage drift, Navbar drift, validation timing, password toggle, TermsUpdateModal verification, tests. CC may reorder for execution efficiency but every change must land.

7. **Change 1 — Delete `ComingSoon` stub + wire `/login` redirect.** Modify `frontend/src/App.tsx`. Sub-changes 1a–1d below.

8. **Change 1a — Delete the `ComingSoon` component.** Delete the entire `function ComingSoon({ title }: { title: string })` declaration at recon-noted lines 119-136 (verify line numbers structurally during execution). Verify whether `Layout` and `SEO` imports remain consumed elsewhere in App.tsx; preserve them only if still consumed. The deleted component's deprecated patterns (`font-script`, `text-text-dark`, `text-primary`) disappear with the component.

9. **Change 1b — Add `AuthQueryParamHandler` (or equivalent hook).** Create a `null`-returning component (or a hook called from a wrapper component) that reads `?auth=login|register` from `useSearchParams()`, calls `authModal?.openAuthModal(undefined, auth)` if the param value is one of the two valid views, and strips the query param via `navigate({ pathname: location.pathname, search: cleanedSearch }, { replace: true })`. The handler must be mounted INSIDE `AuthModalProvider`'s subtree (so `useAuthModal()` resolves) AND inside the React Router subtree (so `useSearchParams`, `useLocation`, `useNavigate` resolve). Suggested placement: as a sibling of the `<Routes>` element, inside `<AuthModalProvider>`. Reference implementation in the brief (parent context) — CC may translate to a hook+wrapper or any equivalent shape that satisfies the mount-location requirement.

10. **Change 1c — Replace the `/login` route element.** The route at recon-noted line 291 currently renders `<ComingSoon title="Log In" />`. Replace with a redirect-based element. Two options (CC picks the cleaner):
    - **Option A:** `<Route path="/login" element={<Navigate to="/?auth=login" replace />} />` — simplest. No `?view=register` parity.
    - **Option B:** Small wrapper component that reads `?view=...` and redirects to `/?auth=login` (default) or `/?auth=register` (when `view=register`). Slightly more flexible for future marketing/email use.
    
    Either is acceptable. Option B preferred if `/login?view=register` parity for marketing emails is forward-looking valuable; Option A preferred if simplicity wins.

11. **Change 1d — Verify SEO metadata flow.** `LOGIN_METADATA` (with `noIndex: true`) is no longer referenced after `ComingSoon` deletion. The redirect route doesn't render SEO metadata — it instantly client-side-navigates. This is correct: `noIndex` on the redirect itself isn't needed because the destination URL `/?auth=login` doesn't surface in indexable content, and `/`'s own SEO metadata takes precedence. Preserve `LOGIN_METADATA` constant in `routeMetadata.ts` (or wherever it lives) — it may be referenced elsewhere or used for the future Phase 1 Spec 1.5b reset-password page. Don't delete the constant. Don't reference it in App.tsx after the ComingSoon deletion.

12. **Change 2 — Subtitle trailing-period unification.** Modify `frontend/src/components/prayer-wall/PrayerResponse.tsx` line 140 (per recon) and `frontend/src/components/prayer-wall/InteractionBar.tsx` line 218 (per recon). Both currently call `authModal?.openAuthModal('Sign in to save prayers to your list.')`. Drop the trailing period: `authModal?.openAuthModal('Sign in to save prayers to your list')`. The third PrayerResponse call site at line 132 already omits the period; Change 2 brings the two outliers in line with the unterminated convention shared by all 31 other "Sign in to ..." subtitle strings across the app.

13. **Change 3 — AuthModal hardcoded 150ms → token.** Modify `frontend/src/components/prayer-wall/AuthModal.tsx` line 87 (per recon). Current: `setTimeout(() => closeFullyRef.current?.(), 150)`. Change to: `setTimeout(() => closeFullyRef.current?.(), ANIMATION_DURATIONS.fast)`. Add the import `import { ANIMATION_DURATIONS } from '@/constants/animation'` if not already present in the file. If `ANIMATION_DURATIONS.fast` resolves to 200ms instead of 150ms, accept the slight timing drift per Decision 11 — do NOT add a new token to match 150ms exactly.

14. **Change 4 — Remove Spotify OAuth button + divider.** Modify `frontend/src/components/prayer-wall/AuthModal.tsx`. Sub-changes 4a–4c.

15. **Change 4a — Delete the divider** (recon-noted lines 621-625): the entire `<div className="my-4 flex items-center gap-3">` block containing `<div className="h-px flex-1 border-t border-white/[0.08]" />` + `<span className="text-xs text-white/30">or</span>` + the second `border-t` div.

16. **Change 4b — Delete the Spotify button** (recon-noted lines 627-638): the entire `<button type="button" disabled ...>` JSX block including its inline Spotify SVG and "Continue with Spotify" text.

17. **Change 4c — Verify spacing flow.** After deletion, the form's submit button (recon-noted lines 610-617) flows directly into the switch link (recon-noted lines 640-665). Verify the visual spacing — the previous `my-4` on the divider provided vertical breathing room between submit button and switch link. If the submit button now sits too tight against the switch link, add `mt-4` or `mt-6` to the switch link's container to restore breathing room. Eyeball at runtime; the exact margin token is CC's judgment call.

18. **Change 5 — RegisterPage white-pill drift fix.** Modify `frontend/src/pages/RegisterPage.tsx`. Both white-pill CTAs (Hero CTA at recon-noted line 166 area, Final CTA at recon-noted line 382 area) currently use `text-primary` + `shadow-[0_0_20px_rgba(255,255,255,0.15)]`. Migrate to canonical Pattern 2: `text-hero-bg` + `shadow-[0_0_30px_rgba(255,255,255,0.20)]`. Preserve `animate-shine`, `animate-gradient-shift`, and any other decorations. Preserve CTA text content ("Create Your Account") and onClick handlers (open AuthModal in register view).

19. **Change 6 — Navbar Get Started bg-primary migration.** Modify `frontend/src/components/Navbar.tsx` recon-noted lines 127-131 (DesktopAuthActions section). The current code branches on the navbar's transparent state. Sub-changes 6a–6d.

20. **Change 6a — Identify the conditional branch.** The non-transparent branch currently uses `bg-primary hover:bg-primary-lt`.

21. **Change 6b — Migrate to canonical Pattern 2 white pill.** Replace the non-transparent branch's chrome with `bg-white text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]`. The transparent branch (`bg-white/20 hover:bg-white/30 border border-white/30`) stays unchanged — that's canonical for over-hero placement. Note: the transparent-state shadow is `shadow-[0_0_20px_...]` rather than the `30px` final RegisterPage variant — different on-hero placement context, both within Pattern 2 family.

22. **Change 6c — MobileDrawer parallel migration (if needed).** Per pre-execution recon Step 6, if MobileDrawer's "Get Started" link uses `bg-primary` or any other deprecated chrome, migrate it to the same Pattern 2 white pill treatment from Change 6b. If MobileDrawer's link is already canonical (e.g., a plain `<Link>` with no distinct chrome, or already on Pattern 2), no change.

23. **Change 6d — Test update.** `components/__tests__/Navbar.test.tsx` likely has class-string assertions on the transparent vs non-transparent variants. Update non-transparent variant assertions: remove `bg-primary` and `hover:bg-primary-lt`; add `bg-white`, `text-hero-bg`, `shadow-[0_0_20px_rgba(255,255,255,0.15)]`, and `hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]`. If MobileDrawer test file exists with parallel assertions and Change 6c lands, update those too.

24. **Change 7 — Password visibility toggle.** Modify `frontend/src/components/prayer-wall/AuthModal.tsx`. Sub-changes 7a–7e.

25. **Change 7a — Add visibility state.** Inside the `AuthModal` component, adjacent to the existing form state (recon-noted lines 41-58):
    
    ```tsx
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    ```

26. **Change 7b — Wrap password input in relative container.** The current password input (recon-noted lines 479-503) renders directly inside the form. Wrap it in a `<div className="relative">` so the toggle button absolute-positions over the right edge. Reference implementation in the brief — toggle is `<button type="button">` (NOT submit), absolute right-1, top-1/2, -translate-y-1/2, `min-h-[44px] min-w-[44px]` tap target, `text-white/50 hover:text-white`, focus-visible ring on `ring-purple-400/50` (or `ring-white/50` per the brief — CC picks; both are within the auth chrome's existing focus-ring family), `aria-label={showPassword ? 'Hide password' : 'Show password'}`, renders `<EyeOff>` when password is visible (clicking will hide) and `<Eye>` when password is hidden (clicking will reveal). Add `pr-12` to the input's existing className so password text doesn't underflow the toggle button. Toggle changes the `type` attribute between `'text'` and `'password'` — NOT a CSS-based hide.

27. **Change 7c — Same pattern on confirmPassword (register view).** Apply the identical wrapper + toggle pattern to the confirmPassword input (recon-noted lines 505-544), using `showConfirmPassword` state. Independent state from `showPassword` — toggling one doesn't affect the other.

28. **Change 7d — Lucide imports.** Add `Eye, EyeOff` to AuthModal.tsx's existing `lucide-react` import: `import { X, AlertCircle, Eye, EyeOff } from 'lucide-react'` (or the existing import pattern, plus the two new icons).

29. **Change 7e — Tests added.** Add to `frontend/src/components/prayer-wall/__tests__/AuthModal.test.tsx`:
    - Password input renders with toggle button on login view AND register view
    - Clicking toggle changes input `type` from `'password'` to `'text'`
    - Clicking toggle updates `aria-label` from "Show password" to "Hide password"
    - Toggle is independently scoped: toggling password-field visibility doesn't affect confirmPassword-field visibility (and vice versa) on register view
    - Toggle has `min-h-[44px] min-w-[44px]` tap target (class-string assertion or computed-style assertion — CC picks)
    - Toggle has `type="button"` (so clicking doesn't submit the form mid-typing)

30. **Change 8 — Validation timing unified to blur+submit.** Modify `frontend/src/components/prayer-wall/AuthModal.tsx`. Sub-changes 8a–8e.

31. **Change 8a — Extend touched state.** Locate the existing `touched` state object (recon-noted lines 41-58). Add `email` and `password` keys with initial value `false`:
    
    ```tsx
    const [touched, setTouched] = useState({
      firstName: false,
      lastName: false,
      email: false,
      password: false,
      confirmPassword: false,
    })
    ```

32. **Change 8b — Add `onBlur` handlers to email and password inputs.** For both email and password inputs (login + register views — same input may render in both views via the existing branching), add `onBlur={() => setTouched((prev) => ({ ...prev, <field>: true }))}`. Do NOT add blur to `resetEmail` (forgot-password view's single input — Decision 8 keeps it submit-only). The `email` input MAY be the same input element across login + register views (depending on how the existing component branches). If it's a single shared input, one `onBlur` covers both views.

33. **Change 8c — Update per-field error rendering gates.** Currently email and password errors render with `{emailError && <p ...>{emailError}</p>}` and `{passwordError && <p ...>{passwordError}</p>}` (or equivalent). Update to match the canonical touched+submitted pattern: `{(touched.email || submitted) && emailError && ...}` and `{(touched.password || submitted) && passwordError && ...}`. resetEmail's gate stays whatever it currently is (likely `submitted && resetEmailError && ...` — preserve).

34. **Change 8d — Update validation logic.** Currently email and password validation only fires inside `handleSubmit`. Add blur-validation by either: (a) running validation in a `useEffect` that watches for touched state changes AND value changes, OR (b) adding `onBlur={() => validateEmail(emailValue)}` directly on the email input (and similarly for password). CC picks the cleaner of the two — match the existing firstName/lastName/confirmPassword validation pattern for consistency. The bias is toward whichever path produces the smallest diff against the existing patterns.

35. **Change 8e — Tests added.** Add to `AuthModal.test.tsx`:
    - Email error appears on blur if invalid
    - Email error doesn't appear before blur or submit
    - Password error appears on blur if too short (or whatever the existing min-length validation is — match the existing `password should be at least N characters` test)
    - Same for register view
    - resetEmail validation timing stays submit-only (verify NO blur-triggered error on resetEmail)

36. **Change 9 — TermsUpdateModal verification pass.** Read `frontend/src/components/legal/TermsUpdateModal.tsx`. Per Decision 5, TermsUpdateModal moves in lockstep with AuthModal. Since AuthModal's chrome isn't changing, this is a verification pass. Verify:
    - Panel chrome matches AuthModal: `mx-4 w-full max-w-md rounded-3xl border border-white/[0.12] bg-hero-bg/95 backdrop-blur-md` + matching dual box-shadow
    - Backdrop pattern matches AuthModal's inline radial gradient
    - Gradient H2 uses `GRADIENT_TEXT_STYLE`
    - `useFocusTrap`, `FormError`, `Button` primitives match
    - Hardcoded animation values follow BB-33 token discipline (any `setTimeout` literals → `ANIMATION_DURATIONS` tokens)
    
    If any drift surfaces, fix in this same change. Report findings either way (drift fixed or no drift found). If TermsUpdateModal has its own hardcoded `setTimeout(..., N)` literals, apply Change 3's token migration in parallel. The TermsUpdateModal mobile-backdrop-click gating (Decision 9 — different from AuthModal which stays open on mobile-backdrop-click) is intentional asymmetry; preserve.

37. **Change 10 — Tests update for AuthModal chrome changes.** Update `frontend/src/components/prayer-wall/__tests__/AuthModal.test.tsx`. Sub-changes 10a–10d.

38. **Change 10a — Spotify button assertions removed.** Recon-noted lines 112-113 currently assert the Spotify button's `border-white/[0.12]` and `text-white`. After Change 4, the Spotify button no longer exists. DELETE these two assertions and any test cases that exclusively cover the Spotify button (e.g., a "renders Spotify continue button" test).

39. **Change 10b — Password toggle assertions added.** Per Change 7e — already enumerated.

40. **Change 10c — Validation timing assertions added.** Per Change 8e — already enumerated.

41. **Change 10d — Class-string assertion preservation.** Verify these recon-noted assertions still pass (no Spec 7 migration affects them):
    - Lines 77-79: panel `bg-hero-bg/95`, `backdrop-blur-md`, `rounded-3xl`
    - Lines 91-92: input `bg-white/[0.06]`, `border-white/[0.12]`
    - Line 98: close button `text-white/50`
    - Line 106: error `text-red-400`
    - Line 121: switch link `text-purple-400`
    - Line 127: title `not.toContain('font-script')`
    - Lines 134-136: label `text-white`, asterisk `text-purple-400`

42. **Change 11 — Tests update for RegisterPage.** Update `frontend/src/pages/__tests__/RegisterPage.test.tsx`. If lines 211 or 220 (or other lines around the white-pill CTAs at lines 166 and 382) have class-string assertions on `text-primary`, update to `text-hero-bg`. If they assert `shadow-[0_0_20px_rgba(255,255,255,0.15)]`, update to `shadow-[0_0_30px_rgba(255,255,255,0.20)]`. The existing assertion at recon-noted lines 314-315 (Check icons `not.toContain('text-primary')` AND `toContain('text-white')`) survives — those are about Check icons on the differentiator section, NOT about the white-pill CTAs. The structural assertion at recon-noted line 301 (exactly 2 "Create Your Account" CTAs) survives — both CTAs preserve their text content through the migration.

43. **Change 12 — Tests update for Navbar.** Per Change 6d — already enumerated. If MobileDrawer test file exists with parallel assertions and Change 6c landed, update those too.

#### Behavior preservation requirements

44. **AuthModal trigger sites preserved.** All 60+ existing `authModal?.openAuthModal(...)` call sites across the app continue to function exactly as they do now. Spec 7 changes only the 2 outlier subtitle strings (Change 2) and the chrome of the AuthModal itself (Changes 3, 4, 7, 8). Trigger wiring, view selection, subtitle prop passthrough, and onClose callback wiring all preserved.

45. **AUTH_ERROR_COPY preserved.** The error copy mapping in `types/auth.ts` (or wherever AUTH_ERROR_COPY lives) is NOT touched by Spec 7. All existing FormError messages render exactly as they do now.

46. **AuthContext code path preserved.** No changes to `AuthContext.tsx`, `AuthProvider`, `mirrorToLegacyKeys`, `auth-service.ts`, `api-client.ts`, `auth-storage.ts`, or any of the auth hooks (`useAuth`, `useAuthModal`, `useLegalVersions`). The transitional `// Transitional — removed in Phase 2 cutover` comments are load-bearing for Phase 2's grep-and-remove; preserve every one of them.

47. **Forgot-password view stub-toast behavior preserved.** Decision 20 keeps real forgot-password flow as Phase 1 Spec 1.5b territory. Spec 7 does NOT change the toast-stub behavior on the forgot-password view's submit. If any chrome drift surfaces on the forgot-password view (unlikely per recon), fix it but don't touch behavior.

48. **AuthModal panel chrome preserved (Decision 3).** Do NOT migrate the panel chrome. It is canonical: `mx-4 w-full max-w-md rounded-3xl bg-hero-bg/95 backdrop-blur-md border border-white/[0.12] p-6 shadow-[0_0_40px_rgba(139,92,246,0.15),0_8px_30px_rgba(0,0,0,0.4)]`. The dual box-shadow (violet glow + drop shadow) is the trust-moment treatment we want.

49. **AuthModal H2 GRADIENT_TEXT_STYLE preserved.** Already canonical. Do not touch.

50. **AuthModal input field chrome preserved (Decision 1).** Auth inputs use the existing utility input idiom: `rounded-xl bg-white/[0.06] border border-white/[0.12] px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:border-purple-400/50 focus-visible:shadow-[0_0_15px_rgba(139,92,246,0.15)]`. Do NOT apply the textarea-glow idiom (Daily Hub Pray/Journal pattern). Textarea glow signals emotional authoring; auth is task completion.

51. **AuthModal whitePillClass preserved (Decision 2).** Submit buttons keep canonical Pattern 2: `w-full rounded-full bg-white py-3 text-sm font-semibold text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]`. Do NOT migrate to gradient — auth submit is a different category from CreatePlanFlow Step 2's gradient climax.

52. **RegisterPage GlowBackground variant preserved (Decision 4).** Keep `<GlowBackground variant="fullPage">`. Do NOT switch to BackgroundCanvas.

53. **TermsUpdateModal mobile-backdrop-click gating preserved (Decision 9).** TermsUpdateModal gates accidental mobile-backdrop-click dismissal because gated content is high-stakes; AuthModal allows it because user-initiated dismissal is low-stakes. Preserve the asymmetry.

54. **LOGIN_METADATA / REGISTER_METADATA constants preserved.** Even though `/login` no longer renders SEO content (it redirects), keep both metadata constants in place for future Phase 1 Spec 1.5b/1.5g use.

55. **All acceptance criteria below pass.**

### Non-Functional Requirements

- **Performance:** No performance regression. AuthModal already lazy-loads via the existing AuthModalProvider mount pattern; the password-toggle additions are negligible JSX. The `AuthQueryParamHandler` runs `useEffect` on `searchParams` changes — fires once on mount and once when the auth param appears, then strips. No measurable reflow or layout cost.
- **Accessibility:** WCAG 2.2 AA target preserved. The password-toggle button announces its state via `aria-label` switching between "Show password" and "Hide password". 44×44 minimum tap target maintained (`min-h-[44px] min-w-[44px]`). Focus-visible ring respects the auth chrome's existing focus-ring family. The toggle is `type="button"` so it doesn't submit the form mid-typing. Existing keyboard-nav, focus-trap, and screen-reader announcements preserved unchanged. The query-param handler's `replace: true` navigation prevents URL clutter and back-button trap surprises.
- **Bundle size:** No measurable increase. `Eye` and `EyeOff` from `lucide-react` are tree-shaken; existing AuthModal already imports `X` and `AlertCircle` from the same package (per Change 7d), so the marginal cost is two icon glyphs (~1 KB each, gzipped less). Spotify button + divider deletion offsets.
- **Browser support:** No new APIs introduced. `useSearchParams` / `useNavigate` / `useLocation` already in use across the app.

---

## Auth Gating

The interactive surfaces this spec touches are themselves the auth gates — `AuthModal` is the auth shell that 60+ trigger sites open, `RegisterPage` is the marketing-surface alternate path to AuthModal, `/login` becomes a redirect to AuthModal in login view. The table below covers the new and modified interactions introduced by Spec 7. All other auth gates across the app (the existing 60+ trigger sites) are preserved exactly as documented in `.claude/rules/02-security.md` § "Auth Gating Strategy" — no Spec 7 change affects them.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|--------------------|
| Visit `/login` directly | Redirects to `/?auth=login`; AuthModal opens in login view; query param stripped | Redirects to `/?auth=login`; AuthModal opens in login view; user dismisses or proceeds (no special authed-user behavior — same as existing trigger sites) | (no subtitle — direct entry from `/login` redirect doesn't pass an `openReason` arg) |
| Visit `/login?view=register` directly (Option B) | Redirects to `/?auth=register`; AuthModal opens in register view; query param stripped | Redirects to `/?auth=register`; AuthModal opens in register view (same as above — no auth-state branching) | (no subtitle — direct entry doesn't pass `openReason`) |
| Visit `/?auth=login` directly (e.g., from a marketing email) | AuthModal opens in login view on first render; query param stripped via `replace` navigation | AuthModal opens in login view on first render (same — handler doesn't branch on auth state) | (no subtitle — direct entry from URL) |
| Visit `/?auth=register` directly | AuthModal opens in register view on first render; query param stripped | AuthModal opens in register view on first render | (no subtitle — direct entry from URL) |
| Click Hero CTA on `/register` | AuthModal opens in register view (existing behavior — onClick handler preserved) | AuthModal opens in register view (existing behavior) | (existing subtitle preserved — no Spec 7 change to RegisterPage's openAuthModal call) |
| Click Final CTA on `/register` | AuthModal opens in register view (existing behavior — onClick handler preserved) | AuthModal opens in register view (existing behavior) | (existing subtitle preserved) |
| Click Navbar "Get Started" (over-hero, transparent state) | Navigates to `/register` (existing behavior — `<Link to="/register">`) | Navigates to `/register` (or, if Phase 2 cutover lands first, suppresses for authed users — but Spec 7 doesn't change this) | n/a — link not modal trigger |
| Click Navbar "Get Started" (scrolled, non-transparent state) | Navigates to `/register` (existing behavior — same `<Link>`, only chrome migrated) | Same as above | n/a — link not modal trigger |
| Click MobileDrawer "Get Started" (if Change 6c lands) | Navigates to `/register` (existing behavior — only chrome migrated if drift was found) | Same as above | n/a — link not modal trigger |
| Click password visibility toggle (login view) | Reveals/hides password text in the password input. Toggle changes input `type` between `'password'` and `'text'`. No auth state change. | Same — toggle works regardless of auth state (modal can be open while authed user is on a public-facing page; rare but possible) | n/a — toggle is in-modal control, not auth gate |
| Click password visibility toggle (register view) | Reveals/hides password text on the field that was toggled. Independent state from confirmPassword toggle. | Same | n/a |
| Blur email input with invalid email (login or register view) | Email error renders immediately (NEW per Decision 8). Field shows error state. Submit still required for actual auth attempt. | Same — blur validation fires regardless of auth state | n/a — validation in-modal, not auth gate |
| Blur password input with too-short password (login or register view) | Password error renders immediately (NEW per Decision 8). | Same | n/a |
| Click PrayerWall save/bookmark icon | AuthModal opens with subtitle `"Sign in to save prayers to your list"` (no terminating period — Change 2 fixes the drift) | Saves the prayer (existing behavior preserved) | "Sign in to save prayers to your list" |

**Summary:** 13 actions explicitly defined. The three existing call sites of "Sign in to save prayers to your list" subtitle (PrayerResponse.tsx:132 already correct, PrayerResponse.tsx:140 fixed by Change 2a, InteractionBar.tsx:218 fixed by Change 2b) emit identical strings post-Spec-7. The `/login` redirect targets work for both logged-in and logged-out users — neither auth state changes the redirect behavior, since the AuthQueryParamHandler doesn't branch on `useAuth()`. (Authed users opening AuthModal is rare but not blocked; the existing AuthModalProvider doesn't suppress on authed state, and adding suppression would be a behavior change Spec 7 doesn't take on.)

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | AuthModal panel: `mx-4` (16px horizontal margin) maintains panel width below the `max-w-md` cap. Password toggle button: 44×44 tap target via `min-h-[44px] min-w-[44px]` — meets touch-target accessibility threshold without dominating the input. Password input gains `pr-12` (48px right padding) to keep typed text from underflowing the toggle on narrow viewports. Backdrop click stays open per Decision 9 (AuthModal-only). RegisterPage: hero CTAs stack vertically per existing layout; white-pill chrome migration preserves stacking. Navbar Get Started: only the desktop variant migrates (Change 6); mobile uses MobileDrawer (Change 6c — conditional). The scrolled-state non-transparent variant doesn't show on mobile (mobile uses MobileDrawer trigger), but if any breakpoint at the small-tablet edge does scroll into the desktop nav, the new white-pill chrome reads correctly. The `AuthQueryParamHandler` is non-visual; no responsive concerns. |
| Tablet (640-1024px) | AuthModal panel: same `max-w-md` cap; centers in viewport. Password toggle: identical 44×44 target. RegisterPage: layout transitions from stacked-mobile to side-by-side at the existing breakpoints (Spec 7 does NOT change responsive layout — only CTA chrome). Navbar: desktop variant rendered; new white-pill scrolled-state chrome reads correctly. |
| Desktop (> 1024px) | AuthModal panel: `max-w-md` (28rem / 448px) — same as smaller breakpoints; modal does NOT widen on large viewports. Password toggle: same 44×44 (consistent across breakpoints — accessibility floor, not breakpoint-dependent). RegisterPage: full layout per existing design; CTA chrome migration applies uniformly. Navbar: desktop variant; the migrated non-transparent (scrolled) state is most visible here. |

**Mobile-specific interactions:**
- Backdrop click on AuthModal dismisses (Decision 9 — preserved). Backdrop click on TermsUpdateModal does NOT dismiss (Decision 9 — preserved asymmetry).
- Password toggle button responds to tap via standard `onClick`. No long-press or swipe gestures introduced.
- The 44×44 tap target is the canonical Worship Room touch-target size (per `.claude/rules/04-frontend-standards.md` and existing patterns across the app).

**Things that stay the same:**
- Modal centering, focus trap, escape-key dismiss — unchanged across all breakpoints.
- RegisterPage scroll behavior, GlowBackground orb distribution, hero animations (`animate-shine`, `animate-gradient-shift`) — unchanged.
- Navbar transparent-state chrome (`bg-white/20 hover:bg-white/30 border border-white/30`) — unchanged across all breakpoints.

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input that requires crisis-keyword scanning. AuthModal's email and password fields are credential inputs, not free-form expressive content; the AUTH_ERROR_COPY mapping handles error states and never displays user-typed content back as content. RegisterPage is a marketing surface with no user-generated content. The query-param handler reads `?auth=login|register` and validates the value is one of those two strings — values outside that allowlist are ignored (no fallback rendering, no echoed input). No crisis detection required.

---

## Auth & Persistence

- **Logged-out users:** Demo-mode zero-persistence rule applies. AuthModal interactions don't write to localStorage or backend. Password visibility toggle state is component-local React state, NOT persisted (toggling visibility on one session doesn't persist across reloads — standard modern UX). The `AuthQueryParamHandler` reads URL state and immediately strips it; no persistence. Form drafts (email, password text in flight) are NOT auto-saved to localStorage — that's a deliberate auth-form discipline, NOT a Spec 7 change.
- **Logged-in users:** Submitting the form (login or register) calls `auth-service.ts` per existing behavior; on success, AuthContext updates and `mirrorToLegacyKeys` writes the transitional `wr_auth_simulated`, `wr_user_name`, `wr_user_id` keys (preserved exactly per Decision 18). Spec 7 does NOT touch this code path.
- **localStorage usage:** Spec 7 introduces ZERO new localStorage keys. The existing auth keys (`wr_auth_simulated`, `wr_user_name`, `wr_user_id`, `wr_jwt_token`) are documented in `.claude/rules/11-local-storage-keys.md` § "Auth Keys" and are not modified. No Spec-7-specific entries to add.

---

## Completion & Navigation

N/A — Auth surfaces are not part of the Daily Hub completion tracking system (mood check-in, devotional read, prayer composed, journal entry, meditation session). Logging in or registering is not a "completed activity" that signals to the streak/points/badges/getting-started-checklist systems — those are user-experience surfaces, not auth surfaces. The auth flow is gated infrastructure that enables the rest of the app.

The `/login` redirect targets `/` (the home/dashboard route — `Home` for logged-out, `Dashboard` for logged-in per CLAUDE.md). After AuthModal closes on successful auth, the user lands on the route they were on when AuthModal opened (existing behavior — AuthModal is a portal-style modal that doesn't change the underlying route). For direct entry from `/?auth=login` or via the `/login` redirect, the user lands on `/` after AuthModal closes — same as any other AuthModal interaction on the home route.

---

## Design Notes

Reference design system patterns from `.claude/rules/09-design-system.md` and `_plans/recon/design-system.md` (if present). Spec 7 is a polish + small-adds spec; the visual references it consumes are already canonical:

- **Pattern 2 white pill CTA** (`bg-white text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)]` for hero/marketing variant; `shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]` for navbar / nested variants). Used by AuthModal submit button (preserved per Decision 2), RegisterPage hero + final CTAs (migrated by Change 5), Navbar Get Started non-transparent state (migrated by Change 6), MobileDrawer Get Started (potentially migrated by Change 6c). The exact shadow values differ slightly between hero (30px / 0.20 opacity) and navbar (20px / 0.15 opacity) — both within the Pattern 2 family per the established convention across Worship Room.
- **AuthModal panel chrome** (`mx-4 w-full max-w-md rounded-3xl bg-hero-bg/95 backdrop-blur-md border border-white/[0.12] p-6` + dual box-shadow `shadow-[0_0_40px_rgba(139,92,246,0.15),0_8px_30px_rgba(0,0,0,0.4)]`) — preserved per Decision 3.
- **GRADIENT_TEXT_STYLE** on AuthModal H2 + TermsUpdateModal H2 — preserved.
- **`<GlowBackground variant="fullPage">`** atmospheric layer on RegisterPage — preserved per Decision 4. Distinct from the BackgroundCanvas atmospheric layer used on Dashboard / Local Support / Grow / Bible.
- **Utility input idiom** for AuthModal fields (`rounded-xl bg-white/[0.06] border border-white/[0.12]` + focus-visible variant) — preserved per Decision 1. Distinct from the canonical violet textarea glow used on DailyHub Pray/Journal and CreatePlanFlow.
- **44×44 tap target** for the password toggle button — canonical accessibility floor per `.claude/rules/04-frontend-standards.md`.
- **ANIMATION_DURATIONS tokens** from `frontend/src/constants/animation.ts` — BB-33 token discipline. Change 3 migrates AuthModal's hardcoded 150ms.
- **Lucide Eye/EyeOff icons** — new pattern introduced by Change 7. Tap target wrapper, aria-label state announcement, type-attribute toggle (NOT CSS-based hide). Documented here so future password-input surfaces (e.g., the eventual Phase 1 Spec 1.5c change-password form, Phase 1 Spec 1.5b reset-password form) can adopt the same pattern.

**Patterns NOT used:**
- The textarea-glow idiom (cyan or violet) — auth is task completion, not emotional authoring.
- The gradient Button variant — reserved for emotional climax (Spec 6C's CreatePlanFlow Step 2 Generate). Auth submit stays white-pill.
- BackgroundCanvas — RegisterPage uses GlowBackground (long-scroll marketing), and the auth modals don't have an atmospheric layer (the radial-gradient backdrop is the trust treatment).

**New patterns introduced (so future audits know to track them):**
- Password visibility toggle: documented in this spec. After Spec 7 lands, this pattern can be referenced from `09-design-system.md` (a follow-up bookkeeping commit, not Spec 7's responsibility).
- Query-param-driven AuthModal opening: documented in this spec. Future deep-link patterns (Phase 1 Spec 1.5b reset-password email links, etc.) will extend this.

---

## Out of Scope

The following items are explicitly excluded from Spec 7 per the locked direction-doc decisions:

- **FormField primitive adoption (Decision 16).** Migrating AuthModal's 6 hand-rolled fields to FormField would substantially expand scope (12+ migration sites + extending FormField + significant test rewrites). FormField adoption is a refactor concern, not a visual concern. Belongs in its own dedicated future spec (likely "adopt canonical primitives across forms" cleanup).
- **RegisterSkeleton (Decision 17).** Bundle measurement first. Most users hit `/register` via AuthModal trigger, not as cold first-page load. Don't ship a skeleton until measurement justifies it.
- **AuthContext / AuthProvider / mirrorToLegacyKeys / legacy auth keys not touched (Decision 18).** Visual migration only. The transitional comments are load-bearing for Phase 2's grep-and-remove.
- **`auth-service.ts` / `api-client.ts` / `auth-storage.ts` not touched.** Service-layer canonical post-Spec-1.9; Spec 7 is presentation-layer.
- **`types/auth.ts` AUTH_ERROR_COPY not touched.** Error copy is canonical; Spec 7 doesn't introduce new error states.
- **`useAuth`, `useAuthModal`, `useLegalVersions` hooks not touched.** Same reasoning.
- **`LegalVersionGate` provider mount not touched.** Provider, not visual.
- **AuthModal panel chrome (Decision 3) — preserved, not migrated.**
- **AuthModal H2 GRADIENT_TEXT_STYLE — preserved, already canonical.**
- **AuthModal input field chrome (Decision 1) — preserved utility idiom; do NOT apply textarea glow.**
- **AuthModal whitePillClass (Decision 2) — preserved Pattern 2; do NOT migrate to gradient.**
- **AuthModal forgot-password view stub-toast behavior — preserved (Decision 20; Phase 1 Spec 1.5b territory).**
- **TermsUpdateModal mobile-backdrop-click gating (Decision 9) — preserved asymmetry vs AuthModal.**
- **RegisterPage GlowBackground variant (Decision 4) — preserved fullPage variant; do NOT switch to BackgroundCanvas.**
- **RegisterPage hero animations (`animate-gradient-shift`, `animate-shine`) — preserved.**
- **Real OAuth wiring (Decision 19) — Phase 1 Spec 1.5g territory. Spec 7 only removes the disabled Spotify placeholder.**
- **Real forgot-password flow (Decision 20) — Phase 1 Spec 1.5b territory (waits for SMTP). Spec 7 keeps the toast-stub behavior.**
- **`LOGIN_METADATA` / `REGISTER_METADATA` constants — preserved for SEO `noIndex` posture and future Phase 1 use.**
- **All other 30+ "Sign in to ..." subtitle call sites — only the 2 trailing-period outliers fixed.**
- **Migration of any other AuthModal trigger sites** beyond the subtitle fix — the existing 60+ call sites continue to function unchanged.
- **Bundle size optimization beyond the natural offset of Spotify-button-deletion vs Eye/EyeOff-icon-addition.**
- **A11y semantic refactoring beyond the password toggle's `aria-label` + `type="button"` + tap-target wiring.**

---

## Acceptance Criteria

### App.tsx (Change 1)

- [ ] `function ComingSoon` declaration deleted (recon-noted lines 119-136 area)
- [ ] `Layout` and `SEO` imports preserved if still consumed elsewhere; removed if not
- [ ] `/login` route renders a Navigate-based redirect (Option A: `<Navigate to="/?auth=login" replace />`, OR Option B: a wrapper component that reads `?view=...` for parity)
- [ ] `AuthQueryParamHandler` (or equivalent hook+wrapper) reads `?auth=login|register` from `useSearchParams`, opens AuthModal in the requested view, strips the param via `navigate(pathname, { replace: true })`
- [ ] Handler is mounted INSIDE `AuthModalProvider` (so `useAuthModal()` resolves)
- [ ] Handler is mounted INSIDE the React Router subtree (so `useSearchParams`, `useLocation`, `useNavigate` resolve)
- [ ] `LOGIN_METADATA` constant preserved (not deleted)
- [ ] `/register` route unchanged (still lazy-loaded `RegisterPage`)
- [ ] `font-script`, `text-text-dark`, `text-primary` deprecated patterns disappear with the deleted ComingSoon

### AuthModal.tsx (Changes 3, 4, 7, 8)

- [ ] `setTimeout(..., 150)` on close path (recon line 87) replaced with `setTimeout(..., ANIMATION_DURATIONS.fast)`
- [ ] `import { ANIMATION_DURATIONS } from '@/constants/animation'` present
- [ ] Spotify button + "or" divider deleted (recon lines 621-638 area)
- [ ] Spacing between submit button and switch link verified visually post-deletion (mt-4 or mt-6 added if too tight)
- [ ] `showPassword` and `showConfirmPassword` state hooks added adjacent to existing form state
- [ ] Both password and confirmPassword inputs wrapped in `<div className="relative">` containers with absolute-positioned Eye/EyeOff toggle buttons
- [ ] Toggle button changes input `type` between `'password'` and `'text'` (NOT a CSS-based hide)
- [ ] Toggle button `aria-label` switches between `"Show password"` and `"Hide password"` based on visibility state
- [ ] Toggle button has `type="button"` (does NOT submit form when clicked mid-typing)
- [ ] Toggle button has `min-h-[44px] min-w-[44px]` tap target
- [ ] Toggle button has focus-visible ring within the existing auth chrome's focus-ring family
- [ ] Password input gains `pr-12` so typed text doesn't underflow the toggle button
- [ ] `Eye, EyeOff` added to existing `lucide-react` import
- [ ] `touched` state extended with `email: false` and `password: false` keys
- [ ] `onBlur` handlers added to email and password inputs that set the corresponding `touched.<field>: true`
- [ ] Per-field error rendering for email and password uses `(touched.email || submitted) && emailError && ...` pattern (canonical match to firstName/lastName/confirmPassword existing pattern)
- [ ] resetEmail validation timing stays submit-only (NO blur-triggered error rendering on resetEmail)
- [ ] All existing AuthModal behavior (focus trap, escape-key, gradient H2, FormError, AUTH_ERROR_COPY, view switching) preserved unchanged

### RegisterPage.tsx (Change 5)

- [ ] Hero CTA white-pill: `text-primary` → `text-hero-bg`
- [ ] Hero CTA white-pill: `shadow-[0_0_20px_rgba(255,255,255,0.15)]` → `shadow-[0_0_30px_rgba(255,255,255,0.20)]`
- [ ] Final CTA white-pill: same migration
- [ ] `animate-shine` and `animate-gradient-shift` decorations preserved
- [ ] CTA text content preserved ("Create Your Account")
- [ ] CTA onClick handlers preserved (open AuthModal in register view)
- [ ] `<GlowBackground variant="fullPage">` atmospheric layer preserved (Decision 4)
- [ ] Navbar `transparent hideBanner` props preserved
- [ ] SiteFooter rendering preserved
- [ ] Differentiator section Check icons class strings unchanged (per recon lines 314-315 — `not.toContain('text-primary')` AND `toContain('text-white')` still passes)
- [ ] Structural assertion at recon line 301 (exactly 2 "Create Your Account" CTAs) still passes

### Navbar.tsx (Change 6)

- [ ] DesktopAuthActions Get Started non-transparent branch: `bg-primary` removed
- [ ] DesktopAuthActions Get Started non-transparent branch: `hover:bg-primary-lt` removed
- [ ] DesktopAuthActions Get Started non-transparent branch: `bg-white text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]` added
- [ ] Transparent branch (`bg-white/20 hover:bg-white/30 border border-white/30`) unchanged

### MobileDrawer.tsx (Change 6c — conditional)

- [ ] Pre-execution recon Step 6 captured the current "Get Started" link chrome
- [ ] If chrome was already canonical (Pattern 2 or plain `<Link>` with no distinct chrome): no change needed; recon finding documented in the spec's execution log
- [ ] If chrome was deprecated (`bg-primary` or other): migrated to Pattern 2 white pill matching Navbar's non-transparent branch chrome from Change 6b

### TermsUpdateModal.tsx (Change 9)

- [ ] Verification pass complete; findings reported (drift fixed or no drift found)
- [ ] Panel chrome confirmed matches AuthModal: `mx-4 w-full max-w-md rounded-3xl border border-white/[0.12] bg-hero-bg/95 backdrop-blur-md` + matching dual box-shadow
- [ ] Backdrop pattern confirmed matches AuthModal's inline radial gradient
- [ ] Gradient H2 confirmed uses `GRADIENT_TEXT_STYLE`
- [ ] `useFocusTrap`, `FormError`, `Button` primitives confirmed match
- [ ] Hardcoded animation values confirmed follow BB-33 token discipline (any `setTimeout` literals migrated to `ANIMATION_DURATIONS` tokens)
- [ ] Mobile backdrop-click gating preserved (Decision 9 — TermsUpdateModal stays gated, asymmetric to AuthModal which dismisses)

### Subtitle copy (Change 2)

- [ ] `frontend/src/components/prayer-wall/PrayerResponse.tsx` line 140: trailing period removed (`'Sign in to save prayers to your list.'` → `'Sign in to save prayers to your list'`)
- [ ] `frontend/src/components/prayer-wall/InteractionBar.tsx` line 218: trailing period removed (same string transformation)
- [ ] PrayerResponse.tsx line 132 unchanged (already correct, no period)
- [ ] All 33 unique "Sign in to ..." subtitle strings consistent (no terminating periods) — verified via grep across the codebase

### Tests (Changes 10, 11, 12)

- [ ] AuthModal.test.tsx: Spotify button assertions deleted (recon lines 112-113 area)
- [ ] AuthModal.test.tsx: any test cases that exclusively cover the Spotify button deleted
- [ ] AuthModal.test.tsx: new password toggle test cases added (per Change 7e checklist — login view, register view, type attribute toggle, aria-label toggle, independent state, tap target, type="button")
- [ ] AuthModal.test.tsx: new validation timing test cases added (per Change 8e checklist — email blur, password blur, NOT before blur or submit, resetEmail submit-only)
- [ ] AuthModal.test.tsx: existing canonical chrome assertions still pass (recon lines 77-79, 91-92, 98, 106, 121, 127, 134-136 — enumerated in Change 10d)
- [ ] RegisterPage.test.tsx: white-pill class-string assertions on Hero + Final CTAs updated to expect `text-hero-bg` instead of `text-primary` (if such assertions exist)
- [ ] RegisterPage.test.tsx: shadow assertions updated to expect `shadow-[0_0_30px_rgba(255,255,255,0.20)]` instead of `shadow-[0_0_20px_rgba(255,255,255,0.15)]` (if such assertions exist)
- [ ] RegisterPage.test.tsx: existing 33 tests still pass (per recon Part 10)
- [ ] Navbar.test.tsx: Get Started non-transparent variant assertions removed `bg-primary` and `hover:bg-primary-lt`, added `bg-white`, `text-hero-bg`, canonical shadow
- [ ] MobileDrawer.test.tsx: assertions updated if Change 6c landed (otherwise: no test change needed)
- [ ] All existing tests pass; updated tests pass; no new failures
- [ ] `pnpm typecheck` passes (or whatever the project's typecheck command is — likely included in `pnpm test` or `pnpm build`)
- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds

### Manual eyeball checks (Playwright verification)

- [ ] `/login` (no query) navigates to `/?auth=login` → AuthModal opens in login view; query param stripped from URL
- [ ] `/login?view=register` navigates to `/?auth=register` → AuthModal opens in register view (only if Option B chosen for Change 1c)
- [ ] `/?auth=login` (direct entry, e.g., from a marketing email) opens AuthModal in login view on first render; query param stripped
- [ ] `/?auth=register` (direct entry) opens AuthModal in register view on first render; query param stripped
- [ ] `/register` page renders cleanly with corrected white-pill CTAs (visually distinguishable from old `text-primary` treatment — `text-hero-bg` reads as the hero-bg color on the white pill, slightly darker/cooler than `text-primary` violet)
- [ ] AuthModal login view: NO Spotify button, NO "or" divider, password toggle works (clicking shows/hides password text, aria-label switches)
- [ ] AuthModal register view: NO Spotify button, NO divider, BOTH password fields have working toggles (independent state — toggling password doesn't toggle confirmPassword)
- [ ] AuthModal forgot-password view: still works, chrome unchanged
- [ ] Email blur on AuthModal with invalid email: error renders immediately
- [ ] Password blur on AuthModal with too-short password: error renders immediately
- [ ] Navbar Get Started: white pill in non-transparent (scrolled) state, transparent treatment over hero
- [ ] MobileDrawer Get Started: matches recon finding (canonical or migrated per Change 6c)
- [ ] TermsUpdateModal: chrome matches AuthModal canonical patterns; mobile backdrop-click gating preserved
- [ ] PrayerWall "Sign in to save prayers to your list" subtitle: NO trailing period (verified by clicking save/bookmark on a prayer while logged out)

### Regression checks

- [ ] `/grow` surfaces unchanged (Spec 6 cluster) — visual diff against pre-Spec-7 baseline shows zero pixel changes on Plans tab, Challenges tab, CreatePlanFlow, ReadingPlanDetail, ChallengeDetail, PlanCompletionOverlay, ChallengeCompletionOverlay, MilestoneCard, DayCompletionCelebration
- [ ] `/` Dashboard unchanged
- [ ] `/daily` (all 4 tabs) unchanged
- [ ] `/local-support/*` (all 3 sub-routes) unchanged
- [ ] `/bible` and `/bible/:book/:chapter` unchanged (BibleReader's chrome is documented intentional drift)
- [ ] AuthContext code path NOT touched (verify via `git diff` filter)
- [ ] `mirrorToLegacyKeys` + transitional comments preserved (verify via `git diff` filter)
- [ ] Existing 60+ AuthModal trigger sites still function (sample-test 5-10 via Playwright: PrayerWall save, PrayerResponse save, journal save, prayer save, meditation card click, devotional Save action — all open AuthModal with appropriate subtitle)
- [ ] Existing AUTH_ERROR_COPY preserved (verify by triggering an auth failure scenario — invalid credentials produces the existing error copy)
- [ ] `/prayer-wall`, `/prayer-wall/:id`, `/prayer-wall/dashboard`, `/prayer-wall/user/:id` all render unchanged except the subtitle drift fix on PrayerResponse + InteractionBar's auth modal openings
- [ ] No new console errors or warnings introduced
- [ ] No new accessibility violations introduced (Lighthouse Accessibility 95+ on `/register` and on routes where AuthModal opens; baseline preserved)

### Definition of Done

- [ ] All 12 changes executed
- [ ] All acceptance criteria above verified
- [ ] Frontend test suite passes: `pnpm test` (no new failures vs the post-Spec-6D baseline of 9,470 pass / 1 pre-existing fail noted in CLAUDE.md § "Build Health")
- [ ] Frontend builds cleanly: `pnpm build`
- [ ] Frontend lints cleanly: `pnpm lint`
- [ ] No new `VITE_*_API_KEY` references introduced (CLAUDE.md § "Enforced standards")
- [ ] No new localStorage keys introduced (verified by grep against the canonical inventory in `.claude/rules/11-local-storage-keys.md`)
- [ ] Animation tokens imported from `frontend/src/constants/animation.ts` (Change 3) — no new hardcoded ms literals introduced
- [ ] Direction doc decisions 1-20 satisfied (each decision either implemented or explicitly preserved per the "Out of Scope" section)
- [ ] No commits made by CC; user commits manually after review
