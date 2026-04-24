# Forums Wave: Spec 1.9 — Frontend AuthContext JWT Migration

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 1.9 (v2.9, Phase 1)
**Branch:** `claude/forums/forums-spec-1-9`
**Date:** 2026-04-24

---

## Affected Frontend Routes

AuthContext is consumed by 54 call sites across the app, and AuthModal is triggered from numerous features. The register flow has a dedicated page at `/register`. Representative routes for `/verify-with-playwright` capture at three viewports (375×667, 768×1024, 1440×900):

- `/register` — dedicated registration page (UI shell, now fully wired to backend via AuthContext.register → auto-login)
- `/prayer-wall` — AuthModal triggered on post/comment/bookmark attempts (primary AuthModal surface)
- `/daily` — AuthModal triggered on Pray/Journal save, Meditate card clicks
- `/local-support/counselors` — AuthModal triggered on search/bookmark (logged-out callout)
- `/` — landing page CTAs that open AuthModal in register view
- `/` (Dashboard, post-login) — display-name rendering from hydrated `useAuth().user.name`

Because the change is global (every route consuming `useAuth()`), the verification pass includes at least one representative authenticated-UI route (Dashboard) to confirm `user.name` alias continues to render and `isAuthResolving` boot state doesn't flash unauthenticated UI.

---

# Spec 1.9 — Frontend AuthContext JWT Migration

**Master plan:** `_forums_master_plan/round3-master-plan.md` (v2.9, Phase 1)
**Tracker:** line 18, ⬜ → ✅
**Canonical ID:** `round3-phase01-spec09-frontend-auth-context-jwt`
**Size:** L
**Risk:** High
**Prerequisites:** 1.5 (backend auth endpoints ✅), 1.6 (`GET/PATCH /users/me` ✅), 1.9b (`Button.isLoading`, `FormError`, `LoadingSpinner` ✅)
**Runs at:** Opus 4.7 `xhigh` effort

---

## Goal

Migrate the frontend from the simulated-auth mock (localStorage-only flags; AuthModal toasts "coming soon" and closes) to a real JWT-backed authentication flow against the Phase 1 backend. After this spec ships, a user who submits the Register form creates a real `users` row, gets a real JWT in client storage, and the app state reflects real backend-hydrated identity. This is the spec that makes the Phase 1 backend observable from the frontend — the first end-to-end round-trip.

Scope is the frontend auth plumbing: AuthContext refactor (real login/register/logout calling `/api/v1/auth/*`), AuthModal form wiring to the new AuthContext methods, a shared API client that attaches the `Authorization: Bearer …` header, timezone capture on registration, and migration of AuthModal's submit buttons + error displays to 1.9b's new primitives. Explicitly NOT in scope: password reset, email verification, account lockout UI, change-password, change-email, logout-all-devices UI, and a test-suite-wide migration off the legacy localStorage seed pattern (see "Out of scope" below for spec pointers).

---

## Master Plan Divergence

The master plan's Phase 1 body for Spec 1.9 predates v2.9's addendum and 1.9b's completed work. Deviations the brief introduces:

1. **Timezone capture included.** Master plan 1.9 body does not call out AuthModal timezone capture. Per v2.9 addendum item #5, this spec MUST include `Intl.DateTimeFormat().resolvedOptions().timeZone` on the register POST body. This was re-homed from Spec 1.5 (which shipped backend-only) because 1.9 is the first spec that actually touches AuthModal. The backend already accepts `timezone` (optional) on `RegisterRequest` — plumbing only.
2. **1.9b primitives consumed.** Master plan 1.9 body predates 1.9b. This brief explicitly migrates AuthModal's ad-hoc `<button className="...">` submit buttons to the new canonical `Button` component with `isLoading` prop, and migrates its ad-hoc `<p role="alert" className="... text-red-400">` error paragraphs to the new canonical `FormError` primitive. These migrations are not optional — 1.9b's rule file edits to `.claude/rules/09-design-system.md` § "Error, Loading, and Empty States" now treat these as the canonical patterns.
3. **Focus-on-error implementation.** The 1.9b execution log explicitly defers focus-on-error to this spec: *"FormField focus-move on error is consuming form's responsibility (documented in Step 8, implemented by Spec 1.9)."* Included here.
4. **Test-seed backwards compatibility preserved.** Master plan 1.9 body does not address the fact that ~500+ tests seed auth via direct `localStorage.setItem('wr_auth_simulated', 'true')` rather than calling `login()`. Refactoring all those tests is a scope explosion. This brief keeps `readAuthState()`'s legacy fallback path functional so existing tests continue to pass; a follow-up spec migrates tests later.
5. **AuthContext interface extends, does not replace, the existing public shape.** Consumers read `user.name`, `user.id`, `isAuthenticated`. All three keep working via a backwards-compat alias layer. New fields are additive. See "Key design decisions" #4.

---

## Why this spec exists now

Phase 1 backend has shipped: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/users/me`, `PATCH /api/v1/users/me`, JWT filter chain, Spring Security, Liquibase schema, Testcontainers, dev seed data. All of it sits behind a frontend that doesn't call any of it — AuthModal is a toast-that-closes, AuthContext is a localStorage mock, and no component anywhere calls `fetch('/api/v1/auth/login')`. Spec 1.10 (Phase 1 Cutover) cannot be a real end-to-end test until the frontend can actually authenticate.

This spec is also the load-bearing beam under every subsequent phase. Every Phase 2+ feature that reads user-scoped backend data (`GET /api/v1/posts` filtered by user, `POST /api/v1/prayers`, friends list, activity engine endpoints, etc.) needs a JWT in the `Authorization` header. If the API client pattern established here is sloppy, every future service file gets to re-invent it. If it's clean, future services get one-line auth attachment.

---

## Current state (verified via recon)

**AuthContext** (`frontend/src/contexts/AuthContext.tsx`):

- 3 localStorage keys: `wr_auth_simulated` (flag), `wr_user_name`, `wr_user_id`
- `login(name)` takes a single string, sets the three keys
- `logout()` removes `wr_auth_simulated` and `wr_user_name`, preserves `wr_user_id`
- Cross-tab sync via `storage` event listener on `wr_auth_simulated`
- `readAuthState()` reads the three keys on mount; this is the seed path tests rely on
- 54 `useAuth()` call sites across the codebase

**AuthModal** (`frontend/src/components/prayer-wall/AuthModal.tsx`):

- 3 views: `login` | `register` | `forgot-password`
- On submit: validates fields, then calls `onShowToast('Account creation is on the way. For now, explore freely.')` and closes. **Does not call `useAuth().login()`**.
- Email regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Password min length: 12 (matches backend)
- Register requires: firstName, lastName, email, password, confirmPassword
- Login requires: email, password
- Forgot-password: email only; toasts "Password reset is coming soon. Hang tight."
- Inline error display: `<p role="alert" className="... text-red-400">` with `AlertCircle` icon — NOT using `FormError` primitive
- Submit button: raw `<button type="submit" className="... rounded-full bg-white ...">` — NOT using `Button` component, no `isLoading` state

**AuthModalProvider** (`frontend/src/components/prayer-wall/AuthModalProvider.tsx`):

- Opens the modal with optional subtitle and `initialView`
- Mounts `AuthModal` with `onShowToast` from the `useToast` hook
- The `onShowToast` parameter becomes obsolete once AuthModal has real success/error paths — but kept for the forgot-password "coming soon" toast

**Production callers of `login()` / `logout()`:**

- `login()`: ZERO production callers. Only 4 test call sites in `contexts/__tests__/AuthContext.test.tsx`.
- `logout()`: called from production (need to verify call sites during planning — recon not exhaustive on this)

**Test seed pattern (~500 tests):**

```ts
function seedAuth() {
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
  // sometimes: localStorage.setItem('wr_user_id', 'my-user-id')
}
```

This is the fundamental constraint: migration cannot break this.

**Backend contracts (verified in `backend/src/main/java/com/worshiproom/auth/`):**

- `POST /api/v1/auth/register`
  - Request: `{ email, password, firstName, lastName, timezone? }` (timezone is `@Size(max=50)` — optional, no `@NotBlank`)
  - Response: `{ data: { registered: true }, meta: { requestId } }` — **no token, no user**
  - Validation: password min 12, email max 255, first/last name max 100
- `POST /api/v1/auth/login`
  - Request: `{ email, password }`
  - Response: `{ data: { token, user: { id, email, displayName, firstName, lastName, isAdmin, timezone } }, meta: { requestId } }`
- `POST /api/v1/auth/logout`
  - Request: empty, auth optional
  - Response: 204 No Content (currently no-op; real session invalidation is Spec 1.5g)
- `GET /api/v1/users/me`
  - Request: `Authorization: Bearer <token>` required
  - Response: `{ data: UserResponse, meta: { requestId } }` where `UserResponse` has 15 fields including `displayName`, `timezone`, `isAdmin`, `isEmailVerified`, etc.

**Existing frontend fetch pattern** (e.g., `services/journal-reflection-service.ts`):

- Uses `VITE_API_BASE_URL` (from `.env.example`)
- `fetch` + `AbortController` for timeout (30s)
- Parses envelope `{ data, meta? }`
- No shared client; each service implements its own fetch wrapper

**1.9b primitives ready to consume:**

- `Button` with `isLoading` prop (sets `aria-busy`, `aria-disabled`, forces `disabled`, hides children via `opacity-0` to preserve width, overlays `LoadingSpinner`)
- `FormError` — 3 severities (`error` default, `warning`, `info`); `error` is `role="alert"` + `aria-live="assertive"` with muted `red-950/30` background + `red-100` text; dismiss button has 44×44 touch target + `aria-label="Dismiss message"`
- `LoadingSpinner` standalone (sr-only label, `motion-safe:animate-spin`, `motion-reduce:opacity-60`)
- Rule file `.claude/rules/09-design-system.md` § "Error, Loading, and Empty States" at line 842

---

## Key design decisions (numbered, locked — not to be re-litigated during planning)

1. **Token storage: `localStorage` under key `wr_jwt_token`.** XSS-vulnerable by design; mitigated by Spec 1.5g's blocklist (not yet shipped) and by the backend's 1-hour JWT expiry. Alternatives evaluated and rejected: in-memory (breaks page reload and multi-tab), HttpOnly cookie (requires CORS + CSRF infrastructure that's not in the backend yet and changes `SecurityConfig`). Rule 7 (`11-local-storage-keys.md`) catalogs this as a new key.
2. **On boot, token presence does NOT imply authenticated.** If a token exists, call `GET /api/v1/users/me` once. On 200, hydrate the user; on 401, clear token; on network error, stay in `isAuthResolving=true` state briefly then fall through to unauthenticated. Don't cache `UserResponse` in localStorage — always re-hydrate from the server on boot. (Optimization deferred to a future spec if it ever becomes needed.)
3. **Legacy localStorage fallback preserved.** `readAuthState()` order-of-precedence on boot: (a) if `wr_jwt_token` exists, try `GET /users/me` → real path; (b) else if `wr_auth_simulated === 'true'`, fall through to legacy mock auth state (reads `wr_user_name`, `wr_user_id`) — this keeps ~500 existing tests passing; (c) else unauthenticated. The legacy fallback is tagged as "mock mode" internally (not exposed to consumers) so a future test-migration spec can identify it.
4. **`AuthContextValue` shape — additive migration.**
   Before:

   ```ts
   interface AuthContextValue {
     isAuthenticated: boolean
     user: { name: string; id: string } | null
     login: (name: string) => void
     logout: () => void
   }
   ```

   After:

   ```ts
   interface AuthContextValue {
     isAuthenticated: boolean
     isAuthResolving: boolean  // NEW — true during initial /users/me hydration
     user: AuthUser | null      // extended shape, .name kept for back-compat
     login: (credentials: { email: string; password: string }) => Promise<void>
     register: (request: RegisterRequest) => Promise<void>  // NEW
     logout: () => Promise<void>  // now async (calls /auth/logout)
   }

   interface AuthUser {
     id: string
     name: string          // alias for displayName — kept for 54 existing call sites
     displayName: string
     email: string
     firstName: string
     lastName: string
     isAdmin: boolean
     timezone: string | null
     isEmailVerified: boolean  // for when 1.5d ships and features want to gate on it
   }
   ```

   The `login` signature change (string → object) is breaking for the 4 test call sites in `AuthContext.test.tsx`; those tests are updated in the same spec.
5. **Shared API client at `frontend/src/lib/api-client.ts`.** Exports `apiFetch(path, init)` that (a) prepends `VITE_API_BASE_URL` if `path` starts with `/`, (b) attaches `Authorization: Bearer <token>` header if a token is present, (c) parses the standard envelope `{ data, meta }` and returns `data` typed, (d) on 401 clears the token and dispatches a custom `auth-invalidated` event on `window` — AuthContext listens and does a clean logout. Errors thrown as typed `ApiError { code, status, message, requestId }`. Timeout default 30s via `AbortController` (matches existing services). **Small and surgical** — this is NOT a full HTTP client refactor; existing `journal-reflection-service.ts` et al. keep their own fetch wrappers. Only new code (auth, `/users/me`, and future phases) uses the client.
6. **Timezone capture on register.** `Intl.DateTimeFormat().resolvedOptions().timeZone` evaluated at form submit time in AuthModal's register handler. Sent on register POST. No user-facing UI for this — silent capture. Edge case: if the API returns `undefined` or a non-IANA value (very old browsers / privacy extensions), send empty string and the backend's `@Size(max=50)` permits null.
7. **Register → auto-login.** Backend's `RegisterResponse` returns `{ registered: true }` only — no token. Frontend pattern: call `/auth/register`, on success immediately call `/auth/login` with the same credentials to obtain the token. Two sequential calls, both gated behind one "isLoading" state on the submit button. If registration succeeds but auto-login fails for any reason, show a FormError inviting the user to log in manually (edge case, but must be handled).
8. **Error code → user copy mapping.** AuthContext's `login`/`register` catch `ApiError` from `apiFetch` and re-throw as typed `AuthError`. AuthModal catches `AuthError` and maps `code` to user-facing copy via a small in-file map. Codes that matter for 1.9: `VALIDATION_ERROR` (shape issues), `INVALID_CREDENTIALS` (401 on login), `EMAIL_ALREADY_REGISTERED` (409 on register — verify backend code string during planning), `RATE_LIMITED` (429), `ACCOUNT_LOCKED` (reserved for 1.5f; display anti-pressure copy even though it won't fire yet). Anti-pressure copy checklist applies (see Copy Deck in /plan-forums output).
9. **`Button.isLoading` consumption.** Three submit buttons migrate: login submit, register submit, forgot-password submit. All three get `isLoading={isSubmitting}`. The Spotify "Continue with Spotify" button stays as a plain disabled button — it's out of scope.
10. **`FormError` consumption.** Six current error-display sites in AuthModal migrate (firstName, lastName, email, password, confirmPassword, resetEmail). Form-level errors (e.g., "Invalid email or password" from the backend) render in a single `FormError` at the top of the form with severity `error`, `aria-live="assertive"`. Field-level errors render inline below each input as `FormError` with severity `error` (inline sizing variant — verify FormError API during planning; if it doesn't have a "compact" mode, this brief is upgraded to either introduce one or keep the inline layout with `FormError`'s default sizing).
11. **Focus-on-error.** On submit failure (validation OR backend error), move focus to the first invalid field. Implementation: collect `ref`s for all inputs in the current view; on submit failure, determine the first field with an error and call `.focus()` on it. Keeps `FormField`/`aria-describedby`/`aria-invalid` wiring unchanged.
12. **Logout.** `useAuth().logout()` becomes async: (a) fire-and-forget `POST /api/v1/auth/logout` (no await on the response — UX prioritized over server ack), (b) clear `wr_jwt_token`, (c) clear legacy `wr_auth_simulated` and `wr_user_name`, (d) set state to unauthenticated. Existing consumers that call `logout()` synchronously still work — they just don't `await` — because the pre-change signature was fire-and-forget-ish already.
13. **Cross-tab sync.** Add a second `storage` event listener for the new `wr_jwt_token` key. Token deletion in tab A → AuthContext in tab B does a clean logout. Token write in tab A → tab B re-hydrates via `/users/me`.
14. **Forgot-password view stays stubbed.** Keeps toasting "Password reset is coming soon. Hang tight." Spec 1.5b is the real implementation and is blocked on SMTP (Phase 15.1). Do NOT wire the forgot-password form to any endpoint in this spec.
15. **Error display copy (anti-pressure).** Samples (full Copy Deck is /plan-forums's responsibility, applying the checklist):
    - `INVALID_CREDENTIALS`: "That email and password don't match our records. Try again, or use Forgot Password."
    - `EMAIL_ALREADY_REGISTERED`: "An account with this email already exists. Try logging in."
    - `RATE_LIMITED`: "Too many attempts. Please wait a moment and try again."
    - `VALIDATION_ERROR` on password: uses the backend's field-level message ("Password must be at least 12 characters") — don't rewrite per-field server messages client-side.
    - Generic network error: "Couldn't reach the server. Check your connection and try again."
    - No exclamation points, no corporate apology, no urgency framing. Error severity uses 1.9b's muted `red-950/30` palette (NOT emergency red).

---

## Files to create

- `frontend/src/lib/api-client.ts` — shared `apiFetch` + `ApiError` class
- `frontend/src/lib/__tests__/api-client.test.ts`
- `frontend/src/lib/auth-storage.ts` — thin wrapper around `localStorage` for `wr_jwt_token` (get/set/clear) so the key name is referenced in exactly one place
- `frontend/src/lib/__tests__/auth-storage.test.ts`
- `frontend/src/services/auth-service.ts` — `registerUser(request)`, `loginUser(credentials)`, `logoutUser()`, `getCurrentUser()` — all call `apiFetch`
- `frontend/src/services/__tests__/auth-service.test.ts`
- `frontend/src/types/auth.ts` — `AuthUser`, `AuthError`, `RegisterRequest`, `LoginCredentials` type definitions (shared across context + service + components)
- `frontend/e2e/spec-1-9-auth-flow.spec.ts` — Playwright flow capturing register → auto-login → authenticated UI state at 3 viewports (375/768/1440), following the capture harness pattern established in `frontend/e2e/spec-1-9b-captures.spec.ts`

## Files to modify

- `frontend/src/contexts/AuthContext.tsx` — the main refactor. Preserve the legacy `readAuthState` fallback path. Add JWT token boot-time hydration via `getCurrentUser`. Expose new async `login`/`register`/`logout` + `isAuthResolving`. Keep `user.name` alias.
- `frontend/src/contexts/__tests__/AuthContext.test.tsx` — update the 4 breaking `login('name')` calls to `login({ email, password })`. Add new tests for: token hydration on boot, 401 clears token, auto-login after register, backwards-compat legacy-key fallback.
- `frontend/src/components/prayer-wall/AuthModal.tsx` — wire submit handlers to `useAuth().login` / `useAuth().register` / `useAuth().register` then auto-login. Migrate submit buttons to `Button` with `isLoading`. Migrate 6 error-display sites to `FormError`. Add timezone capture on register submit. Add focus-on-error. Keep forgot-password stubbed.
- `frontend/src/components/prayer-wall/__tests__/AuthModal.test.tsx` (create if not present; verify during planning) — real submit-path tests with mocked `apiFetch`
- `frontend/src/components/prayer-wall/AuthModalProvider.tsx` — `onShowToast` prop still used for forgot-password "coming soon" toast; do not remove
- `frontend/src/components/audio/ListenTracker.tsx` — currently reads `wr_auth_simulated` directly, bypassing `useAuth`. This still works (legacy key preserved), but add a brief comment noting the bypass and that a follow-up should use `useAuth`. Don't change the behavior here.
- `.claude/rules/11-local-storage-keys.md` — add `wr_jwt_token` entry with type `string` (JWT), description "Bearer token for authenticated API calls; 1-hour expiry per backend Spec 1.4; cleared on logout and on 401 responses."
- `frontend/.env.example` — verify `VITE_API_BASE_URL` line is present and correct (recon confirmed it is; just verify during planning no accidental deletion)
- `frontend/src/contexts/AuthContext.tsx` JSDoc — document the legacy fallback for future-me

## Files to delete

None. (The `wr_auth_simulated` key migration is tracked for a future spec; deleting it now breaks the test suite.)

---

## Database changes

None. All schema work was done in Specs 1.3, 1.3b, 1.6.

---

## API changes

None (frontend-only spec). The frontend consumes existing endpoints:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users/me`

---

## Success criteria (concrete, measurable)

1. **Real register flow works end-to-end.** Fill AuthModal register form with a new email + 12+ char password → submit → POST /auth/register succeeds → auto-login POST /auth/login succeeds → modal closes → `useAuth().isAuthenticated === true` → user's display name appears in UI. Verified manually against a running backend AND via Playwright.
2. **Real login flow works end-to-end.** Dev seed user (one of the 5 from Spec 1.8) + known password → submit login → JWT stored → UI reflects authentication.
3. **Logout calls backend and clears state.** Click logout → POST /auth/logout fired (visible in Network tab) → token cleared → `isAuthenticated === false` → unauthenticated UI.
4. **Token hydration on reload.** After login, reload the page → brief `isAuthResolving=true` state → GET /users/me succeeds → `isAuthenticated === true` without re-submitting credentials.
5. **Expired/invalid token clears cleanly.** Manually corrupt `wr_jwt_token` in devtools → reload → GET /users/me returns 401 → token cleared → unauthenticated.
6. **Legacy test seed still works.** Representative sample test suites (pick 3–5 from each of: dashboard, prayer-wall, bible, insights, meditate) continue to pass with zero modifications.
7. **Field-level errors render via `FormError` at each site.** 6 field error sites in AuthModal + form-level error surface. Screenshots captured in Playwright for all three viewports.
8. **Submit buttons show `isLoading` state.** During pending fetch, submit button shows embedded spinner, is disabled, and `aria-busy="true"` per 1.9b contract.
9. **Focus-on-error moves focus to first invalid field.** Assertable in RTL tests via `document.activeElement`.
10. **Timezone captured on register.** Integration test mocks `Intl.DateTimeFormat().resolvedOptions().timeZone` and asserts the POST body contains the value.
11. **Baseline test count holds or grows.** Post-1.9b baseline is 8864 pass / 11 pre-existing fail. Post-1.9 must match or exceed 8864 pass with no new failures. New tests from this spec expected: 25–40 (S=5–10, M=10–20, L=20–40, this is L-sized).
12. **`/verify-with-playwright` run clean.** Zero WCAG AA violations on AuthModal at 3 viewports per `@axe-core/playwright`. Follows the capture-harness pattern from `frontend/e2e/spec-1-9b-captures.spec.ts`.
13. **Bundle size.** `pnpm build` completes; main bundle size delta under +15KB gzipped (budget for new `api-client` + `auth-service` + expanded `AuthContext`).
14. **`./mvnw test` green on backend.** Unchanged by this spec but verified post-frontend-integration to confirm no accidental backend changes.

---

## Pre-execution recon items for /plan-forums to verify

1. **`logout()` production call sites.** Recon didn't exhaustively enumerate. `/plan-forums` should `grep -rn 'logout()' frontend/src` (excluding test files and the AuthContext definition) to catalog the real callers and confirm the async signature doesn't surface a `void`/`Promise<void>` type error anywhere.
2. **`FormError` component API.** Recon confirmed it supports `error`/`warning`/`info` severities, optional dismiss, `role="alert"` + `aria-live`. `/plan-forums` should read `frontend/src/components/ui/FormError.tsx` and confirm whether a compact/inline variant exists for per-field rendering, or whether the default sizing is acceptable adjacent to inputs. If neither fits, either (a) add a size prop to `FormError` in this spec, or (b) keep the existing inline `<p role="alert">` pattern for per-field errors and use `FormError` only for form-level errors. Decision locked in the plan.
3. **Backend error codes.** `/plan-forums` reads `backend/src/main/java/com/worshiproom/auth/AuthExceptionHandler.java` and `AuthException.java` to enumerate the exact `code` strings returned from the auth endpoints. The brief's Decision 8 names codes like `INVALID_CREDENTIALS` and `EMAIL_ALREADY_REGISTERED` — verify these match what the backend actually returns. If backend uses different strings, the brief's Copy Deck mapping updates.
4. **`AuthContext` test seed rescue surface.** `/plan-forums` should pick 5 representative test files (one from `components/dashboard/__tests__/`, one from `pages/__tests__/`, one from `pages/meditate/__tests__/`, one from `hooks/__tests__/`, one integration test from `__tests__/`) and confirm the legacy-fallback path keeps their tests green. If ANY test breaks, surface it before execution starts — we may need to widen the fallback path.
5. **`AuthModal` test file existence.** Recon did not confirm whether `frontend/src/components/prayer-wall/__tests__/AuthModal.test.tsx` exists. If not, it's created in this spec.
6. **`Button` `asChild + isLoading` warning.** 1.9b's execution log notes: "`asChild + isLoading` logs dev-only console.warn". Confirm none of AuthModal's submit-button usage accidentally uses `asChild` (it shouldn't — these are real buttons, not links).
7. **Rate limit behavior on `/auth/login`.** Per Spec 1.5, `LoginRateLimitFilter` is in play. `/plan-forums` should confirm what response shape a 429 returns so the frontend maps `RATE_LIMITED` correctly. Verify during planning; no spec change anticipated.
8. **`ListenTracker.tsx` bypass.** Recon found this component reads `wr_auth_simulated` directly. `/plan-forums` should confirm this continues to work under the legacy-fallback rules and decide whether a comment is added (brief says yes) or whether a follow-up ticket is created (brief says: comment is sufficient for now).

---

## Out of scope (explicit)

- **Password reset flow** → Spec 1.5b (blocked on SMTP/Phase 15.1). Forgot-password view stays stubbed with the existing "coming soon" toast.
- **Change password from Settings** → Spec 1.5c.
- **Email verification** → Spec 1.5d (blocked on SMTP).
- **Change email** → Spec 1.5e (blocked on SMTP).
- **Account lockout UI** → Spec 1.5f. Backend behaviors when they ship may return `ACCOUNT_LOCKED` code; this spec reserves copy for it but won't see it fire until 1.5f.
- **Logout-all-devices UI** → Spec 1.5g.
- **Test-suite migration off `wr_auth_simulated` seed pattern** → Future follow-up spec (not tracked yet; add to master plan v3.0 reconciliation backlog). Estimated 30–60 min with good codemod or half a day manually.
- **OAuth / Spotify SSO** → Not in Phase 1. "Continue with Spotify" button stays disabled; styling unchanged.
- **Token refresh tokens** → Not in scope. 1-hour JWT expiry means user re-auths every hour; acceptable for Phase 1. Refresh token infrastructure is a future spec.
- **Generic 401 interception across existing `journal-reflection-service.ts`, `google-local-support-service.ts`, etc.** → Future incremental migration. Only new code in this spec uses `apiFetch`.
- **Settings page surfaces (timezone UI, profile edit)** → Phase 8 (Unified Profile System). `PATCH /users/me` exists (Spec 1.6) but no UI consumer yet.
- **Welcome email / onboarding email** → Phase 15.1b. Registration just creates the user; no emails fired.
- **Removing `user.name` alias from the context value** → Future cleanup when all 54 call sites are migrated to `displayName`. Low priority; `name` alias is trivial.

---

## Gotchas worth naming in the spec

1. **Registration returns `{ registered: true }` with no token.** Auto-login immediately after register is a required flow step, not an afterthought. If the spec implementer treats it as "optional polish," the UX breaks (user registers, gets no feedback, has to log in manually).
2. **The JWT is 1 hour.** A user who idles for >1 hour and then tries to act will hit a 401 on their next API call. The `auth-invalidated` event path must handle this gracefully — no loud error, just a quiet logout with a toast ("Session expired, please log in again" or similar anti-pressure copy).
3. **Multi-tab logout must NOT clobber in-flight submits.** If tab A is in the middle of submitting a prayer and tab B logs out, the `storage` event fires in tab A → AuthContext logs out → any in-flight fetch gets a 401 and cascades. This is fine (and correct) but the UX should not show a confusing error — the logout itself is the signal.
4. **Timezone capture edge cases.** Some browsers with aggressive privacy settings return `undefined` or `"UTC"` (not the real TZ) from `Intl.DateTimeFormat().resolvedOptions().timeZone`. Handle defensively: if undefined or empty, send empty string; backend's `@Size(max=50)` tolerates null.
5. **Backend's `DUMMY_HASH` is irrelevant here.** It's server-side only (timing-equalization for non-existent emails). Frontend never sees it. Don't conflate with test seed hashes.
6. **Existing consumers reading `user.name` will break if the alias is forgotten.** 54 call sites. Mass grep before and after to confirm none silently break.
7. **`readAuthState()` boot sequence is sync, but JWT hydration is async.** Transition carefully: initial state returns `isAuthResolving=true` if a token exists (keeps consumers from prematurely treating the user as unauthenticated); a `useEffect` on mount performs `/users/me` and transitions state. Tests of hooks that depend on `isAuthenticated` may need `waitFor`.
8. **The `storage` event does NOT fire in the tab that wrote the key.** Cross-tab sync requires writing from tab A and reading from tab B. A single-tab login → navigate → unrelated hook firing `storage` event is a test-environment-only concern (RTL + userEvent does not fire `storage` events by default).
9. **`VITE_API_BASE_URL` may be empty in some test environments.** Handle defensively — if empty, `apiFetch` uses relative URLs (just the path). Vitest tests must not need a running backend; they use mocked fetch.
10. **Register form shows password min-length error.** Ensure the client-side min-length matches the backend's `@Size(min=12)`. Currently: both are 12. Any drift here is a test smell.

---

## Closing note on documentation safety

**What this spec adds (additive):**

- Rule 7 (`11-local-storage-keys.md`): new entry for `wr_jwt_token`.
- New files under `frontend/src/lib/`, `frontend/src/services/auth-service.ts`, `frontend/src/types/auth.ts`, `frontend/e2e/spec-1-9-auth-flow.spec.ts`.
- New tests under each component's `__tests__/` directory.
- New copy in AuthModal error states (documented in /plan-forums's Copy Deck).

**What this spec changes (modifying):**

- `AuthContext.tsx` — refactored but backwards-compatible public shape (54 consumers unaffected except where they opt into the new `isAuthResolving` / `register` / `isEmailVerified` fields).
- `AuthModal.tsx` — internal refactor; behavior change (now talks to backend); public props unchanged.
- `AuthContext.test.tsx` — 4 call-site updates + new assertions.

**What this spec does NOT invalidate:**

- The ~500 existing tests using `localStorage.setItem('wr_auth_simulated', 'true')` — legacy fallback preserves them.
- Any of the 54 production `useAuth()` call sites — `user.name`, `user.id`, `isAuthenticated` keep working.
- Any existing service file (`journal-reflection-service.ts`, `google-local-support-service.ts`, etc.) — they continue to own their own fetch wrappers.
- v2.9 addendum — this spec implements addendum item #5 (timezone re-home), does not alter the addendum.

**What this spec deliberately leaves for v3.0 master plan reconciliation (post-1.10):**

- Absorbing this spec's implementation reality into the master plan 1.9 body (currently stale, predates 1.9b).
- Adding a follow-up spec ID for test-suite migration off `wr_auth_simulated`.
- Normalizing existing services onto `apiFetch` incrementally.

This spec is the first in Phase 1 where the frontend actually talks to the backend in a production code path. Treat recon findings as load-bearing; the 500-test constraint is not negotiable, and the 1.9b primitives consumption is not optional.
