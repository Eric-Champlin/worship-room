# Forums Wave: Spec 1.10f — Terms of Service and Privacy Policy Surfaces

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 1.10f (v2.9, Phase 1)
**Canonical ID:** `round3-phase01-spec10f-terms-privacy-policy-surfaces`
**Branch:** `forums-wave-continued` (continuation branch — no new branch created per Eric's instruction)
**Date:** 2026-04-29

---

## Affected Frontend Routes

The `LegalVersionGate` provider wraps the entire app, so the stale-acceptance modal can surface on ANY authenticated route at boot. The routes most directly modified by this spec:

- `/register` — consent checkbox added; submit disabled until checked; three legal-doc links open in new tabs
- `/terms-of-service` — NEW page (faithful JSX render of `content/terms-of-service.md`)
- `/privacy-policy` — NEW page (faithful JSX render of `content/privacy-policy.md`)
- `/community-guidelines` — footer wiring only; page itself shipped via Spec 1.10m
- All routes (via `App.tsx` provider stack) — `LegalVersionGate` may surface `TermsUpdateModal` overlay on stale acceptance

`/verify-with-playwright` will need to exercise: the registration consent flow (logged-out), the modal-on-boot for a stale-acceptance simulated user, the friend-request gated-action replay, the two new content pages, and the footer Legal column. Backend-only verification (LegalControllerTest, RegistrationLegalAcceptanceTest, LegalExceptionHandlerTest, etc.) is the authored test suite below — Playwright covers the visual surfaces.

---

## Notes from `/spec-forums` recon (2026-04-29)

Quick sanity check before this spec lands at `/plan-forums`:

1. **MPD-1 is factually inaccurate as worded in the brief.** The master plan DOES have a Spec 1.10f body at `_forums_master_plan/round3-master-plan.md` lines 2706–2825. What MPD-1 means in spirit: the brief substantially **redesigns** Spec 1.10f rather than extracting it. The brief's design is the authoritative one for execution because:
   - The master plan body references `AuthModal` for registration consent — but registration is now a full `RegisterPage` (post-1.9 cutover).
   - The master plan body specifies `VARCHAR(40) NOT NULL DEFAULT 'unversioned'` columns and git-SHA versioning — the brief picks `VARCHAR(20)` nullable + ISO-8601 dates (D1, D2). The brief's choice is simpler, more readable, and preserves the "modal fires on next visit for unmigrated users" behavior without a synthetic 'unversioned' marker.
   - The master plan body specifies HARD enforcement (account-locked-out until accept) — the brief picks SOFT enforcement (browse free, mutations gated) per anti-pressure Rules 11/12 (MPD-4).
   - The master plan body specifies markdown source rendered at build time via Vite plugin — the brief picks hard-coded JSX matching the post-1.10m Spec 1.10m pattern (R8). No new markdown infrastructure introduced.
   - The master plan body specifies `/terms` and `/privacy` route paths — the brief picks `/terms-of-service` and `/privacy-policy` (D12) which match the existing `content/*.md` file names and are more SEO-friendly.
   - The master plan body proposes 30-day advance notice on policy changes — the brief defers email/in-app banner notification entirely (Watch-for #16); only the modal surface ships in 1.10f.

   The brief's redesign is internally consistent and codebase-aware. Treat this brief as authoritative; treat the master plan body as historical context.

2. **Recon verifications passed** (codebase as of 2026-04-29):
   - Latest Liquibase changeset on disk: `2026-04-29-001-seed-qotd-questions-production.xml`. Brief's proposed `2026-04-29-002-add-users-legal-version-columns.xml` is the correct next sequence.
   - No `com.worshiproom.legal` package exists — brief is correct, this spec creates it from scratch.
   - No `frontend/src/components/legal/` directory exists — brief is correct.
   - `CommunityGuidelines.tsx` exists at `frontend/src/pages/CommunityGuidelines.tsx` — confirms Spec 1.10m page has shipped (or partially). Per D13 sequencing note, plan-time recon should confirm whether the Legal footer column exists yet; if not, this spec creates it with all three entries; if yes, this spec adds two new entries.
   - `RegisterPage.tsx`, `AuthContext.tsx`, `SiteFooter.tsx`, `AccessibilityPage.tsx` all exist as the brief states.
   - All three `content/{terms-of-service,privacy-policy,community-guidelines}.md` files exist.

3. **Plan-time codebase recon items for `/plan-forums`** (the brief's recon was solid; these are the remaining gaps to verify before code is written):
   - `[VERIFY at plan]` SiteFooter Legal column current shape — does it have Community Guidelines today, or do we create the column from scratch?
   - `[VERIFY at plan]` Existing `AbstractIntegrationTest` shape — confirm the base class exists at `backend/src/test/java/com/worshiproom/.../AbstractIntegrationTest.java` and follows the pattern documented in `06-testing.md`.
   - `[VERIFY at plan]` Existing `PostsRateLimitConfig` shape (D14 mirrors it) — confirm class location, `@ConfigurationProperties` prefix style, Caffeine bucket-cache structure.
   - `[VERIFY at plan]` Existing `AuthenticatedUser` record fields and where it's populated (D15 extends it) — likely in a JWT auth filter under `com.worshiproom.auth`.
   - `[VERIFY at plan]` Existing modal conventions for `DeleteAccountModal` or similar (Watch-for #12 mobile dismissal pattern, Watch-for #11 ARIA).
   - `[VERIFY at plan]` Existing `useFriends.sendRequest` and `useFriends.acceptRequest` signatures (D9 wraps them with `useGatedAction`).

---

# Spec 1.10f Brief — Terms of Service and Privacy Policy Surfaces

Do NOT change branches. Stay on forums-wave-continued.

## Tier

**MAX.** Med-High risk per the master plan tracker. Acceptance tracking has compliance implications; getting it wrong creates liability exposure even at zero users today (because the schema captures whatever's accepted at registration TIME, and that data follows the user forward). Registration consent must not be bypassable. Modal must not be dismissible-without-tracking. Endpoints must not allow accepting on someone else's behalf. Three of the four risk dimensions the tier policy reserves MAX for apply: legal-compliance boundary, privilege-escalation surface (POST /me/legal/accept must enforce caller == subject), and durable user-data correctness.

## Master Plan Divergence

**MPD-1: There is no master plan body for Spec 1.10f to diverge FROM.** The master plan tracker has `1.10f Terms of Service and Privacy Policy Surfaces (M/Med-High)` as a row but no detailed spec body section was authored. This brief defines the spec from scratch.

> **`/spec-forums` annotation:** Master plan v2.9 actually does have a 1.10f body (lines 2706–2825). The brief redesigns it; see "Notes from `/spec-forums` recon" item 1 above for what changed and why. The brief's design is authoritative for execution. Master plan body is historical context only.

**MPD-2: This spec ships full machinery, not the partial-shipped scope captured by yesterday's audit footnote.** Per Eric's directive ("nothing deferred"), the spec includes:
- Schema migration adding `terms_version` and `privacy_version` to `users`
- `LegalVersionService` (canonical version constants + acceptance logic)
- `GET /api/v1/legal/versions` (returns current versions)
- `POST /api/v1/users/me/legal/accept` (records user acceptance)
- Registration flow: required consent checkbox blocks submission until checked
- Frontend `TermsUpdateModal` that fires on app boot if user's accepted versions are stale
- All wiring + tests

**MPD-3: `community-guidelines` markdown gets accepted alongside ToS + Privacy, even though the document is non-binding.** The reasoning: showing users three documents at registration but only tracking acceptance of two creates ambiguity. Accept all three together. Implementation: `LegalVersionService` exposes 3 version constants; user acceptance writes both `terms_version` and `privacy_version` columns AND a small inferred record that the Community Guidelines version was current at acceptance time (we don't add a third column today; the assumption is "if you accepted ToS+Privacy version X on date Y, you also saw Community Guidelines version current as of date Y"). This deliberately leaves a small gap for future tightening if compliance ever requires explicit per-document tracking.

**MPD-4: Soft modal enforcement, not hard.** When a user has stale version acceptance, the modal appears at app boot. They CAN dismiss it. They CAN browse, read content, listen to music, view their dashboard — anything passive. But gated actions (post a prayer, post a comment, send a friend request, send an encouragement) check version-currency BEFORE proceeding and re-show the modal if stale. This avoids the bait-and-switch UX of trapping users in an undismissable modal at app open. Hard enforcement creates anti-pressure-rule violations; soft enforcement matches the brand voice (Rule 11/12).

## Recon Ground Truth

All facts verified on the active machine (`/Users/eric.champlin/worship-room/`) on 2026-04-29.

**R1 — `users` table schema.** From `2026-04-23-001-create-users-table.xml`: id, email, password_hash, first_name, last_name, display_name_preference, bio, avatar_url, is_email_verified, is_admin, joined_at. From `2026-04-23-002-add-users-timezone-column.xml`: timezone added. **No `terms_version` or `privacy_version` columns exist.** This spec adds them via a new Liquibase changeset (next sequence: as of 2026-04-29 the latest is `2026-04-29-001-seed-qotd-questions-production.xml`, so this one is `2026-04-29-002-add-users-legal-version-columns.xml`).

**R2 — Three legal markdown files exist.** `content/terms-of-service.md`, `content/privacy-policy.md`, `content/community-guidelines.md`. Content is shipped (Spec 1.10f's partial-shipped portion).

**R3 — `RegisterPage.tsx` exists** at `frontend/src/pages/RegisterPage.tsx`. Spec needs to add the consent checkbox and link out to legal pages. The page references "Crisis keyword detection," "free Bible," etc. as feature highlights, suggesting it's already a marketing-rich page.

**R4 — No `legal/` package in backend.** New package `com.worshiproom.legal/` for `LegalVersionService`, `LegalController`, exception classes, and DTOs. Per Phase 3 Addendum #6, gets its own domain-scoped `@RestControllerAdvice`.

**R5 — `AuthController` exists at `com.worshiproom.auth/`.** The registration endpoint (POST `/api/v1/auth/register`) must accept the version pair in the request body and write to the new columns. Cross-cutting change.

**R6 — Phase 3 frontend AuthContext (`frontend/src/contexts/AuthContext.tsx`)** holds the user state. Acceptance status must be available globally. The `useAuth` hook should expose `user.termsVersion` and `user.privacyVersion` for the modal to compare against the canonical current versions.

**R7 — There is NO existing modal-at-app-boot pattern.** No `WelcomeModal` or `OnboardingModal` lives at app root. The closest precedent is `AuthModalProvider` at `frontend/src/components/prayer-wall/AuthModalProvider.tsx` — but that's an imperative-trigger modal, not a boot-time-check modal. Spec 1.10f introduces the boot-time-check pattern. Place the new `LegalVersionGate` provider near the top of the App.tsx provider stack (after `AuthProvider`, before `ToastProvider` so toasts can render under the modal).

**R8 — No existing markdown rendering infrastructure.** Spec 1.10m establishes "hard-code as JSX" for static content pages. Spec 1.10f follows the same pattern: `TermsOfServicePage.tsx` and `PrivacyPolicyPage.tsx` are hard-coded JSX that mirror their `content/*.md` source. (The actual markdown files stay as the editorial canonical reference; the JSX pages are faithful renders. Updating ToS or Privacy requires updating BOTH files — acceptable manual coordination cost; the legal docs change rarely.)

**R9 — Registration flow today returns `{user, token}` on success.** Frontend `AuthContext.register(...)` then sets state. Adding required version-acceptance fields to the registration POST body is the cleanest path; the backend writes the versions to the user row alongside other registration data.

**R10 — Anti-pressure copy rules (Rule 11, Rule 12).** All consent + modal copy must be sentence case + period, no exclamation, no urgency framing. Even the "we updated our terms" modal copy must read as factual notification, not pressure. Sample: "We updated our community standards. Take a moment to review them." NOT "Action required: please re-accept our terms!"

**R11 — `apiFetch` in `lib/api-client.ts`** dispatches `wr:auth-invalidated` on 401 (Phase 1 Addendum). The new POST endpoint follows the same shape; `unblockUserApi` and friends are the structural template.

**R12 — `application-prod.properties` does NOT include a `worshiproom.legal.*` section yet.** New properties go under `worshiproom.legal.terms-version`, `worshiproom.legal.privacy-version`, `worshiproom.legal.community-guidelines-version`. Initial version values: `2026-04-29` (today's date in ISO-8601 — naturally sortable, human-readable, monotonically meaningful).

## Phase 3 Execution Reality Addendum gates — applicability

| # | Convention | Applies to 1.10f? |
|---|---|---|
| 1 | EditWindowExpired returns 409 | N/A — no edit-window endpoints |
| 2 | L1-cache trap | **APPLIES** — POST `/me/legal/accept` updates user row; verify the response (or any subsequent read) reflects the new versions, not stale persistence-context state. Use `entityManager.refresh(user)` if needed. |
| 3 | `@Modifying` flags | **POSSIBLY APPLIES** — if the update is implemented as JPQL `UPDATE`, both `clearAutomatically=true` and `flushAutomatically=true` are required. Per repository pattern, prefer entity-based update via repository.save() — simpler and avoids the gotcha. |
| 4 | SecurityConfig method-specific rule ordering | **APPLIES** — POST `/users/me/legal/accept` requires `.authenticated()`. Place BEFORE `OPTIONAL_AUTH_PATTERNS.permitAll()` per Phase 3 Addendum #4. GET `/legal/versions` is `permitAll` (anyone can fetch current versions; no PII leakage). |
| 5 | Caffeine-bounded bucket pattern | **APPLIES** — POST `/me/legal/accept` needs a per-user rate limit. Use `worshiproom.legal.accept.rate-limit.*` properties. Mirror PostsRateLimitConfig shape. (Likely 5 attempts/hour per user — generous enough to handle accidental double-clicks but bounded.) |
| 6 | Domain-scoped `@RestControllerAdvice` | **APPLIES** — `LegalExceptionHandler` with `basePackages = "com.worshiproom.legal"` for domain exceptions (`InvalidVersionException`, `LegalAcceptanceRateLimitException`). |
| 7 | `CrisisAlertService` unified entry | N/A — no user-generated content |
| 8 | Schema realities — do NOT recreate | **CRITICAL** — `users` table exists; this spec ALTERS it via Liquibase to ADD two columns, NEVER recreates. Use `<addColumn>` per Liquibase convention. |
| 9 | INTERCESSION ActivityType | N/A |
| 10 | `wr_prayer_reactions` shape | N/A |
| 11 | Liquibase filename convention | **APPLIES** — `2026-04-29-002-add-users-legal-version-columns.xml`. Today's date, next sequence after the 3.9 production seed. |
| 12 | BB-45 cross-mount subscription test | N/A — no reactive store |

## Decisions and divergences (15 items)

**D1 — Schema migration shape.**
New Liquibase changeset `2026-04-29-002-add-users-legal-version-columns.xml`:
```xml
<addColumn tableName="users">
  <column name="terms_version" type="VARCHAR(20)">
    <constraints nullable="true"/>
  </column>
  <column name="privacy_version" type="VARCHAR(20)">
    <constraints nullable="true"/>
  </column>
</addColumn>
```
Both columns nullable initially because existing users (mock-seed users in dev) won't have a value. Population strategy: backfill nothing in this spec. The 5 dev-seed users get `null`/`null`, and on next login + visit they see the modal (per MPD-4 soft enforcement). For a production launch, the strategy would be different, but at zero real users today, this is the right call.

**Future tightening:** when real users exist, a future spec could ALTER both columns to NOT NULL after a backfill window. Left as a followup, NOT in scope here.

**D2 — Version format: ISO-8601 date.**
`2026-04-29` style. Reasons: human-readable, naturally sortable lexicographically, communicates change-time meaningfully (compare to opaque hash like `abc123` or version numbers like `1.0.3`). Documented in `LegalVersionService` Javadoc. Future updates bump the date string to the date the new content was committed.

**D3 — `LegalVersionService` exposes 3 version constants as static finals.**
```java
public static final String TERMS_VERSION = "2026-04-29";
public static final String PRIVACY_VERSION = "2026-04-29";
public static final String COMMUNITY_GUIDELINES_VERSION = "2026-04-29";
```
Constants live in the service class. When you update one of the legal docs, you bump its constant in this service. **This is the single source of truth** for "what version is current?" — backend reads from these constants; the frontend reads from `GET /api/v1/legal/versions` which reads from these constants. Frontend NEVER hardcodes versions.

**Why constants, not config properties:** versions change only when the documents change; that's a code-level event (markdown file + page JSX both updated). Config-driven would imply "operator can change this without a deploy" — not desirable for legal docs.

**D4 — `GET /api/v1/legal/versions` is `permitAll`.**
Returns:
```json
{
  "data": {
    "termsVersion": "2026-04-29",
    "privacyVersion": "2026-04-29",
    "communityGuidelinesVersion": "2026-04-29"
  },
  "meta": { "requestId": "..." }
}
```
Anyone can fetch current versions (no PII; no leakage). Frontend uses this to compare against stored user versions and decide whether to show the modal.

**D5 — `POST /api/v1/users/me/legal/accept` requires authentication.**
Body:
```json
{ "termsVersion": "2026-04-29", "privacyVersion": "2026-04-29" }
```
Server validates: (a) `principal != null` (`.authenticated()`), (b) submitted versions match the current canonical versions exactly (rejects accepting a stale version, rejects accepting a future version), (c) caller's userId == path-implied subject (the `/me/` path enforces this). On success, updates `users.terms_version` and `users.privacy_version` columns. Returns 204 No Content.

If submitted versions don't match current: 400 `VERSION_MISMATCH` with a friendly toast on the frontend ("The terms updated again while you were reading. Take another quick look."). Frontend re-fetches `GET /legal/versions`, re-displays the modal.

**D6 — Registration flow integration.**
`AuthController.register(...)` accepts a new request body field:
```json
{
  "email": "...",
  "password": "...",
  "firstName": "...",
  // ... existing fields ...
  "termsVersion": "2026-04-29",
  "privacyVersion": "2026-04-29"
}
```
Both fields REQUIRED (`@NotBlank`). Server validates the same way as `/me/legal/accept` (must match current versions). On registration success, the user row is created with both version columns populated. No follow-up acceptance call needed.

Frontend RegisterPage gets a required checkbox: "I have read and agree to the [Terms of Service] and [Privacy Policy]. I have also reviewed the [Community Guidelines]." (Three links; checkbox is required to enable the submit button.)

**D7 — Frontend `useLegalVersions` hook.**
Reads from `GET /api/v1/legal/versions` on mount. Returns `{ termsVersion, privacyVersion, communityGuidelinesVersion, isLoading, error }`. Wrapped with React's `useMemo`-style caching to avoid re-fetching every render. Refetches on `wr:auth-invalidated` (in case a logged-out / logged-in transition changes context — defensive).

**D8 — Frontend `LegalVersionGate` provider.**
Wraps the app (after `AuthProvider`, before `ToastProvider`). On mount + on user state change, compares `user.termsVersion`/`user.privacyVersion` against current versions from `useLegalVersions`. If stale, exposes `isStaleAcceptance: true` via context. Renders the modal IF stale. Modal can be dismissed (X button or backdrop click). Dismissal sets a session-scoped state flag so the modal doesn't immediately re-fire; reset on next page reload.

**D9 — `useGatedAction` helper for soft-enforcement.**
Each gated-action call site (post creation, comment, friend request, encouragement) wraps the action call with `useGatedAction()`. The hook checks `LegalVersionGate.isStaleAcceptance` before invoking the action. If stale, re-shows the modal AND blocks the action (returns early). User must accept the new versions to proceed.

This is where the soft-enforcement teeth are. Browsing is free; mutations require fresh acceptance.

Initial gated actions: `useFriends.sendRequest`, `useFriends.acceptRequest`, future Phase 3 post creation (Spec 3.10), future Phase 4 post-type creations. Spec 1.10f wires only what exists today (friends). Future specs adopt `useGatedAction` for new mutation endpoints.

**D10 — Modal copy.**
Boot-time stale-version modal:
- Title: "We updated our terms."
- Body: "Take a moment to review the changes. By continuing to use Worship Room, you agree to the latest [Terms of Service], [Privacy Policy], and [Community Guidelines]."
- Buttons: "Review and accept" (primary, opens an inline accept form) and "Later" (secondary, dismisses for the session).

Inline accept form (after clicking "Review and accept"):
- Three labeled buttons: each opens the corresponding doc in a new tab
- Single checkbox at the bottom: "I have reviewed and agree to the updated documents."
- "Accept" button (disabled until checkbox checked)
- "Cancel" button (returns to dismissed state)

On Accept click: POST `/me/legal/accept` with the current versions. On 204: dismiss modal, refresh user state. On 400 VERSION_MISMATCH: re-fetch versions, re-show modal with fresh copy. On 429 (rate limit): toast with anti-pressure copy ("Please slow down a moment. Try again in {N} seconds.").

**D11 — Registration consent checkbox copy.**
"I have read and agree to the [Terms of Service] and [Privacy Policy]. I have also reviewed the [Community Guidelines]."

Plain language. Three links open in new tabs (so the registration form's state isn't lost). Checkbox is required (`required` attribute + form-level validation). Submit button is disabled until checked.

**D12 — Page routes.**
- `/terms-of-service` → `TermsOfServicePage.tsx`
- `/privacy-policy` → `PrivacyPolicyPage.tsx`
- `/community-guidelines` → SHIPPED in Spec 1.10m (this spec doesn't touch it)

Both new pages mirror `AccessibilityPage.tsx` and `CommunityGuidelines.tsx` shape: hard-coded JSX, Layout wrapper, SEO component, max-w-3xl container.

**D13 — Footer additions.**
Spec 1.10m adds the "Legal" footer column with just Community Guidelines. Spec 1.10f extends it with two more entries:
```tsx
const FOOTER_LEGAL_LINKS = [
  { label: 'Terms of Service', to: '/terms-of-service' },
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Community Guidelines', to: '/community-guidelines' },
]
```
**Sequencing note:** if 1.10m hasn't shipped when 1.10f executes, this spec creates the Legal column from scratch with all three entries. If 1.10m has shipped, this spec just adds the two new entries. Recon at plan time to confirm which case applies.

**D14 — Rate limit config.**
```properties
worshiproom.legal.accept.rate-limit.max-per-hour=5
worshiproom.legal.accept.rate-limit.bucket-cache-size=10000
```
Per Phase 3 Addendum #5: Caffeine-bounded, `@ConfigurationProperties(prefix = "worshiproom.legal.accept")`. Mirrors `PostsRateLimitConfig`. Profile-aware (currently no per-profile overrides; same value everywhere).

**D15 — `AuthenticatedUser` exposure of acceptance state.**
The `AuthenticatedUser` record (returned from JWT auth filter) currently carries `userId`, `email`, `roles`. After this spec, it ALSO carries `termsVersion` and `privacyVersion` so backend code can check acceptance state without an extra DB query. Populated from the `users` row at auth-filter time. **Cache invalidation:** when a user accepts new versions via POST, their JWT remains valid but the cached `AuthenticatedUser` is now stale — they would still see "you need to accept" until token refresh. Mitigation: the modal flow's `LegalVersionGate` reads from `user` state in `AuthContext`, NOT from `AuthenticatedUser`. The frontend explicitly refreshes user state after a successful accept (via re-fetching `GET /me`). Backend gating logic is server-side per request and reads from the latest DB row, NOT the JWT-cached version.

## Watch-fors (24 items)

1. **`/me/legal/accept` MUST enforce caller == subject.** Spring Security's `principal.userId()` is the source of truth. NEVER accept a `userId` from the request body or path; the `/me/` segment in the URL is explicit but the principal check is what enforces it.

2. **Version validation on accept: exact match required.** Reject submissions with versions `< current` (you're accepting an outdated doc) AND `> current` (versions in the future suggest tampering). String equality, not lexicographic comparison, since the spec uses string constants.

3. **Registration version validation: same exact-match rule.** Frontend reads current versions from `GET /legal/versions` immediately before submitting registration. Any race (versions update in the brief window between fetch and submit) results in a 400 VERSION_MISMATCH; frontend handles by re-fetching and prompting the user to re-confirm.

4. **`@ConfigurationProperties` validation for the rate-limit class.** Use `@Min(1)` on max-per-hour, `@Min(100)` on bucket-cache-size. Failure at app startup, not at first request.

5. **The new Liquibase changeset MUST include a `<rollback>` block** (per Spec 1.3 / standard Liquibase convention). Rollback drops both columns:
```xml
   <rollback>
     <dropColumn tableName="users" columnName="terms_version"/>
     <dropColumn tableName="users" columnName="privacy_version"/>
   </rollback>
```

6. **`User` JPA entity must be updated** to include the two new fields with `@Column(name = "terms_version")` and `@Column(name = "privacy_version")`. Both nullable (matches schema). Hibernate validation runs at startup (`spring.jpa.hibernate.ddl-auto=validate`); a mismatch between entity and schema fails fast.

7. **`UserDto` shape changes.** If frontend `GET /me` returns user state, the DTO needs to include `termsVersion` and `privacyVersion` so `AuthContext` can populate them. Update `UserDto` AND any DTO mappers that produce it.

8. **Pre-existing dev seed users (Spec 1.8) get NULL versions.** When CC runs the migration locally, the 5 mock users will have `terms_version=NULL, privacy_version=NULL`. If you log in as one and visit the app, the modal fires (since NULL is "stale"). For testing, this is desirable; for any test harness that depends on seed users having a "clean" state, document the behavior change.

9. **The dev seed (`dev-seed.xml`) does NOT need updating in this spec.** New users created by the seed will get NULL legal versions. If a future spec wants seed users to have current versions, it can add a follow-up changeset that updates them. Out of scope here.

10. **Mock prayer-wall seed users (Spec 3.2 / changeset 021) similarly get NULL.** Same reasoning.

11. **The modal must be screen-reader accessible.** `role="dialog"`, `aria-labelledby` pointing to title, `aria-describedby` pointing to body. Focus trap. Escape closes (= dismiss for session). Initial focus on the "Review and accept" button. Returns focus to the previously-focused element on close.

12. **Mobile dismissal pattern.** Backdrop tap should NOT dismiss on mobile (accidental dismissals are common). Desktop backdrop-click is fine. Match Spec 1.9b modal conventions; recon at plan-time to confirm the exact behavior of existing modals like `DeleteAccountModal`.

13. **The "I have reviewed" checkbox state MUST reset between modal opens.** If the user dismisses, then re-opens later, the checkbox starts unchecked. State lives in modal-local React state, not in any persistent store.

14. **Don't auto-trigger acceptance on simply opening the doc links.** Opening `/terms-of-service` in a new tab is browsing. Acceptance requires the explicit checkbox + submit. This is the legal nuance that makes the spec MAX-tier.

15. **`useGatedAction` MUST not silently swallow the user's intended action.** When the modal is re-shown due to gating, the original action (e.g., "post a prayer") should be REPLAYED automatically after successful acceptance. Implementation: `useGatedAction(action)` returns a wrapped function; if the version check fails, it shows the modal AND queues `action` to fire on successful accept. If the user dismisses without accepting, the queued action is dropped.

16. **No version-update notifications via email.** Spec 15.x (Email & Push) might add this later. For 1.10f, the modal is the only user-facing surface that "we updated our terms."

17. **The page text MUST be a faithful render of the markdown source.** Don't paraphrase. Don't summarize. Don't reorganize. The legal doc IS the contract; the page is the surface. If you spot a typo in the markdown, fix the markdown AND the page in the same commit; never let them drift.

18. **Universal Rule 4 (OpenAPI):** Both `GET /api/v1/legal/versions` and `POST /api/v1/users/me/legal/accept` MUST be added to `backend/src/main/resources/openapi.yaml`. Schema for the LegalVersions response. Schema for the AcceptanceRequest body. Schema for VERSION_MISMATCH error response.

19. **`@Validated` on the controller methods** to enforce request body validation. Mirror `PostController` shape.

20. **Anti-pressure copy review.** Every user-facing string (modal title, modal body, toast messages, registration checkbox label, error messages) MUST pass the pastor's-wife test. No exclamation points. No "URGENT" or "REQUIRED" red text. Sentence case.

21. **Don't introduce `react-markdown` for the legal pages.** Hard-code as JSX. Match Spec 1.10m's pattern.

22. **The modal MUST NOT block app boot.** Render asynchronously. The user should see the dashboard / home page first, with the modal appearing as an overlay shortly after. Don't gate route rendering on the modal — that creates an apparent app-load failure if the legal-versions API is slow.

23. **Loading state for `useLegalVersions`.** While fetching, the modal should not flash open prematurely. `isStaleAcceptance` returns `false` during loading; only resolves to `true` once both the user state AND the current versions are loaded AND the comparison shows staleness.

24. **`LegalAcceptanceRateLimitException` (429) must include a `Retry-After` header.** Toast copy: "Please slow down a moment. You can try again in {N} seconds." Per the established rate-limit message format (`02-security.md`).

## Test specifications (target ~50-60 tests for MAX coverage)

**Backend tests (~35-40):**

- `LegalVersionServiceTest` (5 tests): version constants accessible; `isVersionCurrent("terms", "2026-04-29")` returns true; old version returns false; future version returns false; null version returns false.
- `LegalControllerTest` — integration extending `AbstractIntegrationTest` (~15 tests):
  - GET versions: returns current; matches constants; permitAll (anonymous succeeds); cache headers absent (versions are dynamic per future-update potential)
  - POST accept: success returns 204; updates user row (verify via repository); rejects mismatched versions (400); rejects authenticated user submitting wrong version; rejects unauthenticated (401); rejects when caller has no JWT (401); rate-limited (429 with Retry-After header)
  - POST accept verifies L1-cache safety (per addendum #2): subsequent GET /me returns updated versions
- `LegalExceptionHandlerTest` (3 tests): VERSION_MISMATCH → 400 with code; LegalAcceptanceRateLimitException → 429 with Retry-After; InvalidVersionException → 400
- `RegistrationLegalAcceptanceTest` (8 tests): register with current versions succeeds; missing termsVersion → 400; missing privacyVersion → 400; outdated termsVersion → 400; future termsVersion → 400; both versions persisted to user row; registration without accepting fails; registered user has both columns populated
- `LiquibaseLegalColumnsTest` (2 tests): migration applies cleanly; columns are nullable
- `UserDtoTest` (1 test): includes termsVersion and privacyVersion fields when populated

**Frontend tests (~15-20):**

- `useLegalVersions.test.ts` (4 tests): fetches on mount; returns current versions; handles 5xx (returns error state, doesn't crash); refetches on auth-invalidated event
- `LegalVersionGate.test.tsx` (6 tests): no modal when versions match; modal shows when terms stale; modal shows when privacy stale; dismissal hides modal for session; modal re-shows on next page load if still stale; soft-gating blocks gated action and re-shows
- `useGatedAction.test.ts` (3 tests): wrapped action fires when versions current; wrapped action blocks + re-shows modal when versions stale; queued action fires after successful accept
- `RegisterPage.test.tsx` (extend, 4 tests): consent checkbox required; submit disabled until checked; doc links open in new tabs; submission includes current versions in body
- `TermsOfServicePage.test.tsx` (2 tests): renders title; renders at least one section heading
- `PrivacyPolicyPage.test.tsx` (2 tests): renders title; renders at least one section heading
- `SiteFooter.test.tsx` (extend, 1 test): Legal column includes all three doc links

## Files to create

```
backend/src/main/java/com/worshiproom/legal/
  LegalVersionService.java
  LegalController.java
  LegalProperties.java
  LegalAcceptRateLimitConfig.java
  LegalExceptionHandler.java
  LegalException.java                       # base
  VersionMismatchException.java
  InvalidVersionException.java
  LegalAcceptanceRateLimitException.java
  dto/
    LegalVersionsResponse.java
    AcceptLegalVersionsRequest.java

backend/src/test/java/com/worshiproom/legal/
  LegalVersionServiceTest.java
  LegalControllerTest.java
  LegalExceptionHandlerTest.java
  RegistrationLegalAcceptanceTest.java
  LiquibaseLegalColumnsTest.java

backend/src/main/resources/db/changelog/
  2026-04-29-002-add-users-legal-version-columns.xml

frontend/src/pages/
  TermsOfServicePage.tsx
  PrivacyPolicyPage.tsx

frontend/src/pages/__tests__/
  TermsOfServicePage.test.tsx
  PrivacyPolicyPage.test.tsx

frontend/src/hooks/
  useLegalVersions.ts
  useGatedAction.ts

frontend/src/hooks/__tests__/
  useLegalVersions.test.ts
  useGatedAction.test.ts

frontend/src/components/legal/
  LegalVersionGate.tsx
  TermsUpdateModal.tsx

frontend/src/components/legal/__tests__/
  LegalVersionGate.test.tsx
  TermsUpdateModal.test.tsx

frontend/src/services/api/
  legal-api.ts

frontend/src/services/api/__tests__/
  legal-api.test.ts
```

## Files to modify

```
backend/src/main/java/com/worshiproom/auth/AuthController.java     # extend register to accept versions
backend/src/main/java/com/worshiproom/auth/AuthenticatedUser.java  # add termsVersion, privacyVersion fields
backend/src/main/java/com/worshiproom/auth/SecurityConfig.java     # rule for /api/v1/legal/versions (permitAll), /api/v1/users/me/legal/accept (.authenticated())
backend/src/main/java/com/worshiproom/user/User.java               # add termsVersion, privacyVersion JPA columns
backend/src/main/java/com/worshiproom/user/UserController.java     # GET /me returns versions in response
backend/src/main/java/com/worshiproom/user/dto/UserDto.java        # add fields
backend/src/main/resources/db/changelog/master.xml                 # add new changeset entry
backend/src/main/resources/application.properties                  # add worshiproom.legal.accept.rate-limit.* defaults
backend/src/main/resources/openapi.yaml                            # add 2 new endpoints + DTOs

frontend/src/App.tsx                                               # add LegalVersionGate provider; register 2 new routes
frontend/src/components/SiteFooter.tsx                             # extend Legal column with ToS + Privacy links (or create if 1.10m didn't ship first)
frontend/src/contexts/AuthContext.tsx                              # surface user.termsVersion + privacyVersion
frontend/src/types/auth.ts                                         # extend User type
frontend/src/pages/RegisterPage.tsx                                # add consent checkbox + version submission
frontend/src/hooks/useFriends.ts                                   # wrap sendRequest, acceptRequest with useGatedAction (initial gated-action consumers)
frontend/src/hooks/__tests__/useFriends.test.ts                    # extend with gated-action tests
```

## Files explicitly NOT modified

- `content/terms-of-service.md`, `content/privacy-policy.md`, `content/community-guidelines.md` — markdown stays as editorial canonical; pages are faithful renders
- Spec 1.10m's `CommunityGuidelines.tsx` — already shipped (or will ship via the direct prompt) and doesn't need changes
- `dev-seed.xml` — existing dev users get NULL legal versions; that's intentional for testing the modal flow

## Acceptance criteria

- [ ] Liquibase changeset `2026-04-29-002-add-users-legal-version-columns.xml` adds two nullable VARCHAR(20) columns to `users` with rollback block
- [ ] `LegalVersionService` exposes 3 version constants as public static final Strings, all set to `2026-04-29`
- [ ] `GET /api/v1/legal/versions` returns current versions; permitAll; standard envelope
- [ ] `POST /api/v1/users/me/legal/accept` requires authentication; rejects mismatched versions (400); enforces rate limit (429 with Retry-After)
- [ ] Registration flow requires `termsVersion` + `privacyVersion` in request body; rejects missing or mismatched
- [ ] User row created at registration has both columns populated
- [ ] Frontend `RegisterPage` consent checkbox required; submit disabled until checked
- [ ] Three legal doc links in registration consent open in new tabs
- [ ] `LegalVersionGate` provider wraps the app; modal renders when user has stale acceptance
- [ ] Modal dismissable via Escape, X button, "Later" button (session-scoped suppression)
- [ ] Modal re-fires on next page load if user still stale
- [ ] `useGatedAction` blocks gated mutations + re-shows modal when stale
- [ ] After successful acceptance, queued gated action replays
- [ ] Footer Legal column includes 3 entries (ToS, Privacy, Community Guidelines)
- [ ] OpenAPI extended for both new endpoints (Universal Rule 4)
- [ ] All copy passes anti-pressure review (sentence case + period, no exclamation, no urgency)
- [ ] At least 50 tests covering backend service + controller + exception handling + frontend hooks + components + page renders + registration integration

## Out of scope (deferred to other specs)

- Email notifications when versions update (Phase 15.x)
- Auto-population of legal versions for existing dev seed users (followup if needed)
- ALTER columns to NOT NULL after backfill (post-launch followup)
- Per-document acceptance tracking (community guidelines as separate column) — left as future tightening if compliance ever requires
- Versioned legal doc archive (the markdown files are git-versioned; that's the archive)
- "What changed" diff display in the modal — out of scope; just link the new docs
- Different modal copy for "first acceptance" vs "re-acceptance" — same modal serves both via current state
- Acceptance audit log (separate table tracking every acceptance event with timestamp + IP) — followup if compliance ever requires
- Multi-language legal docs — out of scope; English only

## Brand voice / Universal Rules quick reference (1.10f-relevant)

- Rule 4: OpenAPI extended for 2 new endpoints
- Rule 6: All new code has tests
- Rule 9: A11y — modal focus management, ARIA labels, keyboard navigation
- Rule 11: Brand voice — pastor's-wife test on every user-facing string
- Rule 12: Anti-pressure design — soft enforcement, no urgency/scarcity framing
- Rule 13: Crisis supersession N/A
- Rule 14: Plain text only N/A (no UGC)
- Rule 15: Rate limiting on POST /me/legal/accept
- Rule 16: Respect existing patterns — domain-scoped advice, Caffeine bucket pattern, constructor injection, `@ConfigurationProperties`, faithful page-from-markdown rendering
- Rule 17: N/A (within-spec, not a phase cutover)

## Tier rationale

MAX. The dimensions:
1. **Legal-compliance boundary** — wrong acceptance tracking creates real liability exposure. The spec MUST get caller-enforcement, version validation, and audit-trail correctness right on the first try.
2. **Privilege-escalation surface** — `/me/legal/accept` could theoretically be abused to accept on someone else's behalf if the principal check is wrong. Multiple test cases verify this.
3. **Data correctness over time** — versions persist forever (until the column is dropped, which it never will be). Wrong values written once propagate forever. No retroactive fix without a migration.
4. **User-facing modal correctness** — soft enforcement is the brand-voice-aligned choice but requires careful state management (queued action replay, session-scoped dismissal, mobile behavior, screen-reader behavior). Easy to subtly break.

xHigh would be acceptable; MAX is correct given the four risk dimensions stack.
