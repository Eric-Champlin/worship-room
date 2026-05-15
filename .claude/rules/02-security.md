## Rate Limiting & Security
 
### Demo Mode (Logged-Out Experience) Data Policy
 
**Critical Privacy Rule**: Logged-out users can use all features (mood selection, scripture, prayers, journaling prompts, audio playback, quiz, full Bible reader, highlights, notes, memorization, AI Explain/Reflect, search, push notifications), but **zero data persistence to the backend**.
 
- **No database writes** for logged-out users (no mood tracking, no journal saves, no prayer saves)
- **localStorage is allowed** for logged-out users — Bible wave personal data (highlights, notes, bookmarks, memorization cards, reading history, push subscription) lives client-side and persists across visits in the user's browser
- **Session-only mood/scripture in React state**: Mood selections shown in UI are stored in React state/memory only, never persisted to localStorage or sent to the backend
- **Privacy-first**: No cookies, no anonymous IDs, no IP persistence for logged-out users
- **Rate limiting**: We may apply transient IP-based rate limiting at the edge for abuse prevention, but we do not persist or log IPs for logged-out users
 
### Auth Gating Strategy (Current State — Phase 2)
 
Auth gating uses `useAuth()` hook + `useAuthModal()` context. The auth modal is a **UI shell only** — it displays "Sign in to [action]" with login/register options but does not perform real authentication. Real auth (Spring Security + JWT) is Phase 3.
 
**What requires login (triggers auth modal when logged out):**
 
- AI prayer generation, journal entry saving, journal AI reflection
- Meditation: card clicks in MeditateTabContent (auth modal) + route-level redirect on all 6 sub-pages (`/meditate/*` → `/daily?tab=meditate` via `<Navigate>` when logged out)
- Prayer Wall posting, commenting, bookmarking
- Prayer saving
- Local Support bookmarking, Local Support visit-recording (the "I visited" affordance is hidden entirely when logged-out, so no auth modal — bookmark is the only Local Support action that surfaces the modal)
 
**What works without login:**
 
- Browsing Daily Hub, switching tabs, typing in textareas (but can't submit/save)
- Draft auto-save to localStorage (Journal)
- Reading Prayer Wall, expanding comments, sharing
- **Local Support search and results display (Decision 12 — Spec 5):** browsing churches, counselors, and Celebrate Recovery groups is intentionally public — anyone can find local support without an account. Especially for crisis-adjacent surfaces (Counselors, Celebrate Recovery), removing barriers to discovery is a moral imperative, not just a UX preference. Search input, geolocation, geocoding, results list, results map, "View Details" deep links, "Get Directions" external links, and the share dropdown all work freely; only bookmark and visit-recording are gated.
- Landing page, quiz, all navigation
- **Bible features (intentionally unauthenticated):** Bible reader, highlighting verses, taking notes, bookmarking, building memorization decks, viewing reading heatmap and progress map, AI Explain, AI Reflect, full-text search, PWA install
- **`/bible/my` (post-Visual-Rollout Spec 8B):** Fully public. Device-local highlights, notes, bookmarks, memorization cards, journal entries, and the BB-43 reading heatmap are all viewable without authentication. See "Bible Wave Auth Posture" below for the device-storage banner detail.
- **BB-41 push notifications:** A logged-out user can grant notification permission and receive daily verse pushes. The subscription is keyed by browser, not by user account.

#### Query-param-driven AuthModal (Spec 7 — Visual Rollout)

The Visual Rollout introduced two deep-link query parameters for opening the AuthModal:

- `/?auth=login` — opens AuthModal in **login** mode on top of `/`
- `/?auth=register` — opens AuthModal in **register** mode on top of `/`

Implementation lives in `AuthQueryParamHandler` inside `App.tsx`, which reads `useSearchParams` on every render and dispatches `openAuthModal({ mode })` when `?auth=login|register` is present, then strips the query param via `setSearchParams({}, { replace: true })` so the URL stays clean while the modal is open.

The legacy `/login` route is now `<Navigate to="/?auth=login" replace />`. Same shape applies to `/register` (which is a real registration page and continues to render `RegisterPage`, but cross-surface auth-gating CTAs that previously hard-routed to `/login` now use the query-param deep link instead).

This pattern is canonical for any future cross-surface CTA that needs to surface auth without a full-page navigation. Use the query-param deep link rather than a hard route — it preserves the user's current page context (their scroll position on the homepage, the visible content behind the modal) while interrupting only with the modal.
 
### Bible Wave Auth Posture (BB-0 through BB-46)
 
The Bible wave deliberately adds **zero new auth gates**. Reading the Bible, building personal history (highlights, notes, bookmarks, memorization cards), running AI Explain/Reflect, viewing the heatmap and progress map, searching scripture, and receiving push notifications are all available without an account. This is a deliberate design decision — the unauthenticated experience must be complete for the project's positioning to hold.
 
Phase 3 will introduce optional sync for users who DO have accounts so that personal history can be preserved across devices, but the unauthenticated experience will never be crippled to push signup.

**Visual Rollout addenda (Spec 8B):**
- **`/bible/my` is fully public post-Spec-8B.** Logged-out users see the My Bible page with their device-local highlights, notes, bookmarks, memorization cards, journal entries, and reading heatmap. The first-time visitor sees a "Your data lives on this device" banner (`wr_mybible_device_storage_seen` once-per-user dismissal flag) explaining the device-local storage scope.
- **`markChapterRead` is no longer auth-gated post-Spec-8B.** Chapter visit writes happen on every chapter mount via `recordChapterVisit()` regardless of authentication state. Per-day visit data persists in `wr_chapters_visited` for both logged-in and logged-out users so the BB-43 reading heatmap reflects activity for everyone.
 
### Notification Permissions (BB-41)
 
Push notification permission is a browser-level action separate from app login. Worship Room requests permission via two flows:
 
- **Explicit opt-in:** A "Notifications" section on `/settings` with an "Enable notifications" button. This is the path users find when they go looking.
- **Contextual prompt:** A small non-modal card at the bottom of the BibleReader after the user completes a reading session. Fires at most once per user (tracked via `wr_notification_prompt_dismissed`) and only on the second-or-later reading session of the day, not the first.
 
Worship Room never requests notification permission on first visit — that's a known anti-pattern that results in users permanently denying. iOS Safari before 16.4 does not support web push at all; iOS Safari 16.4+ supports it only for PWAs added to the home screen, so the BB-41 prompt shows a modified message with PWA install instructions on iOS.
 
The push subscription is stored in `wr_push_subscription` (localStorage) for now. A Phase 3 backend spec will add the real push server and POST the subscription to it.
 
### Auth Gating — Dashboard & Growth Features (Phase 2.75)
 
**Frontend-first auth via `AuthProvider` context.** Until real JWT auth in Phase 3, simulated auth uses localStorage:
 
- `wr_auth_simulated`: `true`/`false` — dev toggle for simulated login
- `wr_user_name`: simulated display name
- `AuthProvider` exposes `{ isAuthenticated, user, login(), logout() }` context
- "Simulate Login" button visible in dev mode only (`import.meta.env.DEV`)
- `logout()` clears auth state but preserves ALL user data (mood, points, badges, friends, Bible highlights/notes/memorization cards, etc.)
 
**What requires login (entire dashboard is auth-gated):**
 
- Mood check-in: only appears for logged-in users (logged-out users see landing page)
- Dashboard (`/`): only renders when `isAuthenticated` — otherwise renders `Home` (landing page)
- All dashboard widget interactions (activity checklist, streak, points, badges)
- `recordActivity()`: no-ops when user is not authenticated
- Friends: all actions (add, accept, decline, block, encourage, nudge)
- Leaderboard: participation requires login (global board viewable without, but user won't appear)
- Settings (`/settings`): entire page auth-gated
- Profile (`/profile/:userId`): viewable by anyone, but "Add Friend" / "Encourage" require login
- Insights (`/insights`, `/insights/monthly`): auth-gated
- Notifications: bell only visible when authenticated
 
**Mood data privacy rule (MANDATORY):**
 
- Mood data (check-in mood level, text, timestamps) is NEVER visible to friends
- Only engagement data is shareable: streak count, faith points, level, badges
- Privacy settings control visibility of engagement data (everyone / friends / only me)
 
### Rate Limiting

**Current implementation (Key Protection wave, Spec 1 `ai-proxy-foundation`):**
- **Mechanism**: bucket4j token bucket with a Caffeine-backed bounded bucket map keyed by client IP. NOT Spring Security, NOT Redis. Single-instance, in-process.
- **Scope**: Applied to `/api/v1/proxy/**` only (health endpoints and other routes excluded via `RateLimitFilter.shouldNotFilter`). Forums Wave endpoints will add their own per-endpoint limits when they ship.
- **Profile defaults**: Dev profile 120/min with 30-request burst; prod profile 60/min with 10-request burst. Configured via `proxy.rate-limit.requests-per-minute` and `proxy.rate-limit.burst-capacity` in `application-{profile}.properties` — NEVER hardcoded.
- **Enforcement granularity**: Per-IP (not per-user) until JWT auth lands in Forums Wave Phase 1. Once auth is wired, per-user limits take precedence for authenticated endpoints, with per-IP as the fallback for unauthenticated ones.
- **Response**: 429 `RATE_LIMITED` with `Retry-After` header (integer seconds). Every successful response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers.
- **Bucket-map bounding** (MANDATORY — see "Bounded External-Input Caches" rule below).

**BOUNDED EXTERNAL-INPUT CACHES (MANDATORY RULE):**

Any map, cache, or lookup structure keyed by untrusted external input — client IP, `User-Agent`, arbitrary request header values, opaque client-supplied tokens, etc. — MUST be bounded. Use Caffeine (`Caffeine.newBuilder().maximumSize(N).expireAfterAccess(Duration).build()`) or an equivalent bounded cache. An unbounded `ConcurrentHashMap` keyed on external input is a denial-of-service vector: an attacker cycling input values grows the map indefinitely until the JVM runs out of heap.

Spec 1 Round 2 caught this on the rate-limit bucket map (`maximumSize(10_000)` + `expireAfterAccess(15m)`, ~1 MB worst case). The same rule applies to every future cache of this shape — session stores, idempotency keys, request-ID dedupe caches, per-IP circuit breakers, and so on. **Phase 3 canonical references:** `PostsRateLimitConfig` + `PostsRateLimitService` (per-user post-creation buckets), `PostsIdempotencyService` (per-(userId, idempotencyKey) cache, 24h TTL, max 10K entries), `CommentsRateLimitConfig`, `BookmarksRateLimitConfig`, `ReactionsRateLimitConfig`. Future per-feature limits (1.5b password reset, 1.5e change-email, 6.8 Verse-Finds-You, 8.1 username-change, 10.7b user-report, 10.11 export, 16.1 offline cache) MUST follow this pattern, never `ConcurrentHashMap`. Configuration via `@ConfigurationProperties(prefix = "worshiproom.{feature}")` reading `application-{profile}.properties`. `/code-review` MUST flag any new unbounded map keyed on external input.

**Frontend AI cache (BB-32)**: BB-30 Explain and BB-31 Reflect use the client-side `bb32-v1:*` localStorage cache to avoid duplicate Gemini calls for the same verse range. This is a courtesy reduction in upstream calls, NOT a security boundary — the backend rate limiter is the actual enforcement (per-IP today, per-user once auth wires up).

**Forums Wave targets (deferred to Phase 1):**
- **AI Requests**: 20/hour per authenticated user (per master plan)
- **Prayer Wall Posts**: 5/day per user (per master plan)
- **Deploy-time Redis**: Redis-backed bucket4j for multi-instance deploys is the documented upgrade path. Single-instance Caffeine is acceptable until then.

**Global DDoS protection**: Deferred to the deployment layer (Nginx/edge). Not a Spring Boot concern in this architecture.
 
### API Key Security & Environment Variables
 
- **Never commit API keys to repository**
- Use environment variables (`.env` for local, platform env vars for production)
- Rotate keys periodically
- Monitor OpenAI API usage to detect anomalies
- **VAPID keys (BB-41)**: The push notification VAPID public key is read from `VITE_VAPID_PUBLIC_KEY` at build time. The private key lives only on the backend (Phase 3 spec) and is never shipped to the frontend.
 
### JWT Storage & Security
 
- **JWT Storage for MVP**: In-memory JWT (React state/context)
  - **MVP Implementation**: Store token in React state/context, lost on page refresh (user must re-login)
  - **Benefits**: Simpler implementation, no CSRF concerns, better XSS protection than localStorage
  - **Trade-off**: User logs out on page refresh (acceptable for MVP)
  - **Future Enhancement**: Migrate to httpOnly cookie + CSRF protection for persistent sessions
- **CSRF Protection**: Not needed for in-memory JWT; required if migrating to cookie-based JWT
- **Token Expiration**: Short-lived tokens (1 hour), refresh token mechanism (future enhancement)
- **Spec 6.11b note**: Spec 6.11b enabled CORS `allowCredentials(true)` for the anonymous presence cookie (`wr_presence_session`); this does NOT change JWT storage (still in-memory React state). The presence cookie is an opaque UUID with zero identity — see CORS Policy section above.
 
### Password Policy (MVP)
 
- **Minimum Length**: 8 characters (matches NIST modern minimum and common industry practice)
- **Requirements**: No complexity rules (length is more important than uppercase/number requirements)
- **Rate Limiting**: Login attempts rate-limited to prevent brute force
  - **Per email**: 5 attempts per 15 minutes
  - **Per IP**: 20 attempts per 15 minutes (uses hashed IP with short TTL)
  - **Lockout behavior**: When rate limit hit, return `429 Too Many Requests` with `Retry-After` header (do not reveal whether email exists)
- **Auth Failures**: Invalid credentials return `401 Unauthorized` with generic message (same for unknown email vs wrong password: "Invalid email or password")
  - **Timing leak prevention**: Perform password hash verification even for unknown emails (dummy hash comparison) to equalize response timing (more robust than fixed delay)
- **Registration (MVP)**: Do not expose email existence via `/register` endpoint
  - **Guarantee**: Response body, status code, and response time must be indistinguishable for existing vs new emails
  - **New email**: Create account, return `200 OK` with message "Registration successful"
  - **Existing email**: No-op (do not create duplicate), return same `200 OK` with same message (prevents enumeration)
  - **Rationale**: Generic message works for both cases without lying (more honest than "Account created" for existing emails)
  - **Email sending**: Do not send different emails (or any email) based solely on account existence (prevents inbox-based enumeration)
  - **Email verification flow** — Spec 1.5d drafted; deferred until SMTP infrastructure ships (current tracker status: ‼️ — SMTP-blocked until domain purchase). When 1.5d ships, it adds `email_verified_at` on users, `@RequireVerifiedEmail` gate on write endpoints, 7-day grace period for reads. See Auth Lifecycle section below.
- **Validation**: Frontend validation (Zod schemas with controlled inputs) + backend validation (Spring Validation)
- **Storage**: BCrypt hashing with salt (Spring Security default)
- **Future Enhancement**: Password strength meter, common password blacklist, 2FA
 
### CORS Policy

- **Allowed Origins** (comma-separated, loaded from `proxy.cors.allowed-origins` in `application-{profile}.properties` — NEVER hardcoded in Java):
  - **Local dev**: `http://localhost:5173,http://localhost:5174,http://localhost:4173` (Vite dev + preview ports)
  - **Production**: `https://worshiproom.com,https://www.worshiproom.com` (apex + www, both required)
- **Allowed Methods**: `GET, POST, PUT, PATCH, DELETE, OPTIONS` — PATCH is REQUIRED (Forums Wave endpoints use PATCH for partial updates)
- **Allowed Headers**: `Content-Type, Authorization, X-Request-Id`
- **Exposed Headers** (MANDATORY — without these, browsers hide them from frontend JavaScript even though they arrive on the wire): `X-Request-Id, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After`
- **Credentials**: `true` (post-Spec-6.11b — was `false` previously). The flip enables the anonymous-session cookie (`wr_presence_session`, 90-day, HttpOnly + Secure + SameSite=Lax + Path=/api/v1) issued by `PresenceTrackingInterceptor` to round-trip cross-origin (frontend on Vercel / Vite dev server, backend on Railway). JWT remains in-memory React state — this flip does NOT migrate auth to cookie-based JWT. Origin allowlist remains specific (no `*` permitted with credentials on, already true in our config).
- **Implementation**: Global `CorsConfig` with `WebMvcConfigurer.addCorsMappings`, `@Value("${proxy.cors.allowed-origins}")`-bound `String[]`. No inline `@Value` defaults (they duplicate `application.properties` and create drift).
 
### X-Forwarded-For Trust Policy

`X-Forwarded-For` and `X-Real-IP` headers are trivially forgeable by any client. The `IpResolver` (used by `RateLimitFilter`, and any future per-IP feature) MUST trust them ONLY when the app sits behind a reverse proxy that sanitizes incoming values.

- **Implementation**: `proxy.trust-forwarded-headers` boolean in `application-{profile}.properties`.
  - **Dev profile**: `false` (local dev has no reverse proxy — client IP is `remoteAddr`)
  - **Prod profile**: `true` (Railway/Vercel sanitize XFF — strip the client's value, overwrite with the real observed IP)
- **When `false`**: `IpResolver` ignores XFF and X-Real-IP entirely; returns `request.getRemoteAddr()`.
- **When `true`**: `IpResolver` reads the leftmost XFF entry first, then X-Real-IP, then `remoteAddr` as fallback.

**Why flag-based, not IP-format validation**: An attacker can set `X-Forwarded-For: 203.0.113.99` (a valid-looking IP) per request. Format validation filters garbage but doesn't stop the attack — each request still generates a fresh rate-limit bucket. The only way to actually prevent XFF spoofing is "do not trust XFF unless a trusted proxy set it." Flag-based matches the threat model precisely.

This rule is mandatory for any proxy filter or feature that reads client IP. Spec 1 Round 2 caught this on `IpResolver`; the same rule applies to future per-IP features (geo-lookup, audit logs, etc.).

### Never Leak Upstream Error Text (MANDATORY)

When a proxy endpoint (`/api/v1/proxy/ai/*`, `/api/v1/proxy/places/*`, `/api/v1/proxy/audio/*`) catches an upstream API failure, the HTTP response body sent to the client MUST contain ONLY a user-safe generic message. The upstream exception's message, stack trace, response body, and headers are server-side debugging information and MUST NOT reach the client.

- **Pattern**: Services catch SDK/HTTP exceptions, log the full detail server-side with the request ID, and throw `UpstreamException("AI service is temporarily unavailable. Please try again.", cause)`. The shared `ProxyExceptionHandler` emits the user-safe message in the `ProxyError` body; the `cause` chain is never serialized.
- **Rationale**: Upstream errors often contain API keys, internal URLs, quota details, or cryptic vendor-specific codes that are useless or dangerous to expose.
- **Verification**: Every proxy service test MUST include a "generic SDK exception throws UpstreamException (no internal leak)" test that asserts the caught exception's message does NOT appear in the thrown `ProxyException`'s message. Spec 2's `GeminiServiceTest.genericSdkErrorThrowsUpstream` is the canonical example.

### Security Response Headers

Every HTTP response Worship Room emits — including filter-raised 401s and 429s — carries a fixed set of six security response headers, set by `SecurityHeadersFilter` in `backend/src/main/java/com/worshiproom/config/SecurityHeadersConfig.java`. The filter runs at `Ordered.HIGHEST_PRECEDENCE + 6` so headers land on responses written from inside `JwtAuthenticationFilter` and `LoginRateLimitFilter` before those filters short-circuit the chain. Same architectural shape as `CorsConfig`, same reason: Spring Security's declarative `http.headers(...)` API does NOT decorate filter-raised responses.

The six headers (canonical values pinned by `SecurityHeadersConfigTest.csp_directiveStringMatchesCanonical`):

- `Strict-Transport-Security: max-age=31536000; includeSubDomains` — 1-year HSTS; NO `preload` (one-way door).
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` — Worship Room is never legitimately embedded.
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://worship-room-production.up.railway.app https://api.spotify.com; frame-src 'self' https://open.spotify.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests` — `unsafe-inline` in `style-src` deliberate (Tailwind/Vite); removal tracked as future spec 1.10g-bis.
- `Permissions-Policy: accelerometer=(), camera=(), geolocation=(self), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()` — geolocation allowed for Local Support; everything else denied.

**Header values are code constants, not config.** Security headers are policy. Tuning lives at `backend/docs/runbook-security-headers.md`. Adding a new image CDN, frame-ancestors loosening, and the long-term unsafe-inline removal are documented there with concrete worked examples.

**Frontend nginx coverage gap:** `frontend/nginx.conf` does not mirror these headers — static-asset responses served directly by nginx have no security headers today. Documented as deferred; future spec can mirror if static-asset coverage becomes a priority.

### Input Validation & Sanitization
 
- **All User Inputs**: Validate length, format, content
- **Scripture References**: Validate format (e.g., "John 3:16")
- **Prayer Wall Posts & Journal Entries**:
  - **Content Policy**: Store as plain text only (NO HTML, NO Markdown in MVP)
  - **Rendering**: Display as plain text with line breaks preserved (`white-space: pre-wrap`)
  - **XSS Prevention**:
    - Backend: Defensively strip/remove all `<...>` tags on input (belt-and-suspenders approach)
    - Frontend: Treat all content as text - React escapes by default, NEVER use `dangerouslySetInnerHTML`
    - Hard rule: No HTML rendering for user-generated content
  - **Future Enhancement**: Consider Markdown support with safe renderer (sanitized, no inline HTML/JS)
- **Bible notes (BB-8)** and **Bible journal entries (BB-11b)**: Same plain-text policy. 10K char limit on notes, no HTML, no Markdown rendering. Stored in localStorage; Phase 3 will encrypt at rest when synced to the backend.
- **AI-Generated Content** (prayers, reflections, prompts, insights, BB-30 explanations, BB-31 reflections):
  - **Rendering Policy**: Same as user content - plain text only, no HTML/Markdown
  - **XSS Prevention**: AI output is untrusted input - escape on render, never use `dangerouslySetInnerHTML`
  - **Length Limits**: Enforce max length (e.g., prayers: 1000 chars, reflections: 500 chars, BB-30 explanations: ~2000 chars)
  - **Content Moderation**: AI output is pre-moderated by the upstream model, but treat all output as untrusted in render
- **Journal Entries**: Encrypt at rest in Phase 3 (in addition to plain text policy)
- **AI Prompts**: Check for injection attacks
- **Mood Check-In Text**: 280-char limit, crisis keyword detection (see `01-ai-safety.md`)
---

## Forums Wave Security Additions

### Auth Lifecycle (Phase 1 — Specs 1.5b through 1.5g — mixed shipped / deferred)

Specs 1.5b–1.5g close auth lifecycle gaps identified during v2.8 pre-execution review. Two have shipped (1.5c, 1.5f); four are deferred until SMTP infrastructure is in place (1.5b, 1.5d, 1.5e, 1.5g).

- **1.5b Password Reset** ‼️ deferred (SMTP-blocked) — Spec drafted: email-triggered single-use token, 1-hour expiry, anti-enumeration (always 200), rate limited (5/hour per email + 10/hour per IP). Invalidates all sessions on success.
- **1.5c Change Password** ✅ shipped — Current-password gated; invalidates all OTHER sessions (current stays alive). Backend implementation includes `ChangePasswordRateLimitConfig`.
- **1.5d Email Verification** ‼️ deferred (SMTP-blocked) — Spec drafted: `email_verified_at` on users; `@RequireVerifiedEmail` annotation gates write endpoints (returns 403 `EMAIL_NOT_VERIFIED`). 7-day read grace period. Resend rate-limited 5/hour.
- **1.5e Change Email** ‼️ deferred (SMTP-blocked) — Spec drafted: Password-gated + new-email verification. Old email gets alert notification. Anti-enumeration on new-email uniqueness.
- **1.5f Account Lockout** ✅ shipped — 5 failures in 15 min → 15-min lockout (423 `ACCOUNT_LOCKED`). Per-IP rate limit (20/hour) at filter layer catches distributed attacks. Admin manual-unlock endpoint.
- **1.5g Session Invalidation** ‼️ deferred (Redis + SMTP dependencies) — Spec drafted: Redis-backed `jwt_blocklist` keyed by `jti`; `active_sessions` table for per-user tracking. Password/email change → automatic logout-all. `/settings/sessions` lists active devices with Revoke buttons.

See `_forums_master_plan/round3-master-plan.md` Appendix E for full spec stubs. Live tracker status in `_forums_master_plan/spec-tracker.md`.

### JWT Authentication (Phase 1 — Spring Security)

- **Token type:** Short-lived access token (1 hour expiry)
- **Storage:** In-memory (React state/context) — lost on page refresh (acceptable for MVP)
- **Algorithm:** HS256 with `JWT_SECRET` from env vars
- **Claims:** `sub` (user UUID), `iat`, `exp`, `is_admin` (boolean)
- **Validation:** Spring Security `OncePerRequestFilter` on every `/api/v1/**` request except public endpoints
- **Public endpoints (no JWT required):** `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/legal/versions`, `GET /api/v1/health`
- **Password hashing:** BCrypt with salt (Spring Security default) — per master plan, explicitly mentioned in Spec 1.4
- **Timing-safe auth failures:** Perform BCrypt comparison even for unknown emails (dummy hash) to prevent timing leaks
- **Registration anti-enumeration:** Same 200 response for new AND existing emails (no "email already taken" leak)

### Terms of Service Consent (Spec 1.10f)

- Registration form includes a consent checkbox (NOT pre-checked per GDPR rules)
- Submit disabled until checkbox checked
- Server stores `users.terms_version` and `users.privacy_version` at registration **(Spec 1.10f future work — columns NOT yet on `users` table; only the canonical legal markdown at `content/{terms-of-service,privacy-policy}.md` has shipped to date)**
- On ToS/privacy update: version-mismatch triggers consent modal on next login
- Users who decline the update get interaction-locked (can browse, cannot post/react)
- 30-day advance notice for policy changes

### Trust Levels (Phase 10.4 — Discourse-Inspired)

- Level 0: New user (default on registration)
- Level 1: Basic (after N posts + N days active)
- Level 2: Member (can access sensitive features like 3am Watch)
- Level 3: Regular (can access moderation-adjacent features)
- Level 4+: Moderator / Admin (elevated queue access)
- Trust levels gate feature access, NOT content visibility

### Forums Wave Rate Limits (master plan specifics)

This table is the **target enforcement on spec ship**. Rate limits are NOT yet enforced in production for endpoints from non-shipped phases (Phases 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16). Currently-enforced rate limits are limited to Phase 1 auth-lifecycle (1.5c change-password, 1.5f account-lockout) and Phase 3 endpoints (posts, comments, reactions, bookmarks, reports — backed by `PostsRateLimitConfig`, `CommentsRateLimitConfig`, `ReactionsRateLimitConfig`, `BookmarksRateLimitConfig`, `ReportsRateLimitConfig`). Login-attempts and registration-IP limits ship with Phase 1 auth (`LoginRateLimitFilter`).

| Endpoint category | Limit | Enforcement |
|---|---|---|
| Prayer Wall posts | 5 per day per user | Backend (configurable via env) |
| Comments | 20 per hour per user | Backend |
| Reactions | 60 per hour per user | Backend |
| Friend requests | 10 per day per user | Backend |
| User reports | 3 per week per reporter | Backend (Spec 10.7b) |
| Encouragements | 3 per friend per day | Client-side primary, backend belt-and-suspenders |
| Nudges | 1 per friend per week | Client-side primary, backend belt-and-suspenders |
| Verse-Finds-You endpoint | 10 per hour per user | Backend (Spec 6.8) |
| Login attempts | 5 per 15 min per email | Backend |
| Registration | 3 per hour per IP | Backend |
| AI requests | 20 per hour per user | Backend (when AI features ship) |

### Crisis Detection Supersession (Universal Rule 13)

When a user's content triggers crisis-flag detection (Phase 10.5/10.6):
- Crisis resources banner takes precedence over ALL feature behavior
- 3am Watch suppresses for that user for the duration of the crisis flag
- Verse-Finds-You suppresses for 48 hours
- Welcome email sequence pauses for 72 hours
- No algorithmic content surfacing during active crisis state
- Crisis detection is authoritative — features MUST respect it, not override it

### Moderation Security

- Reports about admins/moderators route to a separate Eric-only queue (Spec 10.7b)
- Reported users receive NO notification until a moderator takes action
- Reporter identity never disclosed to reported user via automated channels
- Mass-reporter detection: 6+ closed-no-action reports in 30 days triggers reporting suspension
- Zero-interaction-history flag on user reports prevents weaponized cross-community targeting
