## Rate Limiting & Security

### Demo Mode (Logged-Out Experience) Data Policy

**Critical Privacy Rule**: Logged-out users can use all features (mood selection, scripture, prayers, journaling prompts, audio playback, quiz), but **zero data persistence**.

- **No database writes** for logged-out users (no mood tracking, no journal saves, no prayer saves)
- **Session-only**: Mood/scripture shown in UI, stored in React state/memory only
- **Privacy-first**: No cookies, no anonymous IDs, no IP persistence for logged-out users
- **Rate limiting**: We may apply transient IP-based rate limiting at the edge for abuse prevention, but we do not persist or log IPs for logged-out users

### Auth Gating Strategy (Current State — Phase 2)

Auth gating uses `useAuth()` hook + `useAuthModal()` context. The auth modal is a **UI shell only** — it displays "Sign in to [action]" with login/register options but does not perform real authentication. Real auth (Spring Security + JWT) is Phase 3.

**What requires login (triggers auth modal when logged out):**

- AI prayer generation, journal entry saving, journal AI reflection
- Meditation: card clicks in MeditateTabContent (auth modal) + route-level redirect on all 6 sub-pages (`/meditate/*` → `/daily?tab=meditate` via `<Navigate>` when logged out)
- Prayer Wall posting, commenting, bookmarking
- Prayer saving
- Local Support search, Local Support bookmarking

**What works without login:**

- Browsing Daily Hub, switching tabs, typing in textareas (but can't submit/save)
- Draft auto-save to localStorage (Journal)
- Reading Prayer Wall, expanding comments, sharing
- Landing page, quiz, all navigation

### Auth Gating — Dashboard & Growth Features (Phase 2.75)

**Frontend-first auth via `AuthProvider` context.** Until real JWT auth in Phase 3, simulated auth uses localStorage:

- `wr_auth_simulated`: `true`/`false` — dev toggle for simulated login
- `wr_user_name`: simulated display name
- `AuthProvider` exposes `{ isAuthenticated, user, login(), logout() }` context
- "Simulate Login" button visible in dev mode only (`import.meta.env.DEV`)
- `logout()` clears auth state but preserves ALL user data (mood, points, badges, friends, etc.)

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

- **Backend**: Per-user rate limiting on AI endpoints to prevent abuse and control costs
  - **AI Requests**: 20 requests per hour per user (scripture matching, prayers, reflections, prompts) - configurable via environment variables (dev vs prod)
  - **Prayer Wall Posts**: 5 posts per day per user - configurable via environment variables
  - **Implementation**: Spring Security + Redis (production) or in-memory cache (local dev only)
  - **Important**: Local dev can use in-memory; production must use Redis (multi-instance safe)
  - **Configuration**: Rate limits are environment-specific (`.env` or platform env vars), not hardcoded
- **Global**: IP-based rate limiting to prevent DDoS
  - **API Endpoints**: 100 requests per minute per IP
  - **Implementation**: Nginx or Spring Security

### API Key Security & Environment Variables

- **Never commit API keys to repository**
- Use environment variables (`.env` for local, platform env vars for production)
- Rotate keys periodically
- Monitor OpenAI API usage to detect anomalies

### JWT Storage & Security

- **JWT Storage for MVP**: In-memory JWT (React state/context)
  - **MVP Implementation**: Store token in React state/context, lost on page refresh (user must re-login)
  - **Benefits**: Simpler implementation, no CSRF concerns, better XSS protection than localStorage
  - **Trade-off**: User logs out on page refresh (acceptable for MVP)
  - **Future Enhancement**: Migrate to httpOnly cookie + CSRF protection for persistent sessions
- **CSRF Protection**: Not needed for in-memory JWT; required if migrating to cookie-based JWT
- **Token Expiration**: Short-lived tokens (1 hour), refresh token mechanism (future enhancement)

### Password Policy (MVP)

- **Minimum Length**: 12 characters (strong length requirement for sensitive content)
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
  - **Future Enhancement**: Add email verification flow (send confirmation link before account activation)
- **Validation**: Frontend validation (Zod schemas with controlled inputs) + backend validation (Spring Validation)
- **Storage**: BCrypt hashing with salt (Spring Security default)
- **Future Enhancement**: Password strength meter, common password blacklist, 2FA

### CORS Policy

- **Allowed Origins**:
  - **Local Development**: `http://localhost:5173` (Vite dev server)
  - **Production**: `https://worshiproom.com` (or actual production domain)
- **Allowed Methods**: `GET, POST, PUT, DELETE, OPTIONS`
- **Allowed Headers**: `Content-Type, Authorization, X-Request-Id`
- **Credentials**: `false` for MVP (in-memory JWT, no cookies). Set to `true` only if migrating to cookie-based JWT in the future.
- **Implementation**: Spring Boot `@CrossOrigin` or global CORS configuration

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
- **AI-Generated Content** (prayers, reflections, prompts, insights):
  - **Rendering Policy**: Same as user content - plain text only, no HTML/Markdown
  - **XSS Prevention**: AI output is untrusted input - escape on render, never use `dangerouslySetInnerHTML`
  - **Length Limits**: Enforce max length (e.g., prayers: 1000 chars, reflections: 500 chars)
  - **Content Moderation**: AI output is pre-moderated by OpenAI, but implement profanity filter as additional safety layer
- **Journal Entries**: Encrypt at rest (in addition to plain text policy)
- **AI Prompts**: Check for injection attacks
- **Mood Check-In Text**: 280-char limit, crisis keyword detection (see `01-ai-safety.md`)
