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
- Local Support search, Local Support bookmarking
 
**What works without login:**
 
- Browsing Daily Hub, switching tabs, typing in textareas (but can't submit/save)
- Draft auto-save to localStorage (Journal)
- Reading Prayer Wall, expanding comments, sharing
- Landing page, quiz, all navigation
- **Bible features (intentionally unauthenticated):** Bible reader, highlighting verses, taking notes, bookmarking, building memorization decks, viewing reading heatmap and progress map, AI Explain, AI Reflect, full-text search, PWA install
- **BB-41 push notifications:** A logged-out user can grant notification permission and receive daily verse pushes. The subscription is keyed by browser, not by user account.
 
### Bible Wave Auth Posture (BB-0 through BB-46)
 
The Bible wave deliberately adds **zero new auth gates**. Reading the Bible, building personal history (highlights, notes, bookmarks, memorization cards), running AI Explain/Reflect, viewing the heatmap and progress map, searching scripture, and receiving push notifications are all available without an account. This is a deliberate design decision — the unauthenticated experience must be complete for the project's positioning to hold.
 
Phase 3 will introduce optional sync for users who DO have accounts so that personal history can be preserved across devices, but the unauthenticated experience will never be crippled to push signup.
 
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
 
- **Backend**: Per-user rate limiting on AI endpoints to prevent abuse and control costs
  - **AI Requests**: 20 requests per hour per user (scripture matching, prayers, reflections, prompts) - configurable via environment variables (dev vs prod)
  - **Prayer Wall Posts**: 5 posts per day per user - configurable via environment variables
  - **Implementation**: Spring Security + Redis (production) or in-memory cache (local dev only)
  - **Important**: Local dev can use in-memory; production must use Redis (multi-instance safe)
  - **Configuration**: Rate limits are environment-specific (`.env` or platform env vars), not hardcoded
- **Frontend AI cache (BB-32)**: BB-30 Explain and BB-31 Reflect use the local `bb32-v1:*` cache layer to avoid duplicate Gemini calls for the same verse range. This is a courtesy reduction in upstream calls, NOT a security boundary — the backend rate limiter must still enforce per-user limits when Phase 3 wires real auth.
- **Global**: IP-based rate limiting to prevent DDoS
  - **API Endpoints**: 100 requests per minute per IP
  - **Implementation**: Nginx or Spring Security
 
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
- **Bible notes (BB-8)** and **Bible journal entries (BB-11b)**: Same plain-text policy. 10K char limit on notes, no HTML, no Markdown rendering. Stored in localStorage; Phase 3 will encrypt at rest when synced to the backend.
- **AI-Generated Content** (prayers, reflections, prompts, insights, BB-30 explanations, BB-31 reflections):
  - **Rendering Policy**: Same as user content - plain text only, no HTML/Markdown
  - **XSS Prevention**: AI output is untrusted input - escape on render, never use `dangerouslySetInnerHTML`
  - **Length Limits**: Enforce max length (e.g., prayers: 1000 chars, reflections: 500 chars, BB-30 explanations: ~2000 chars)
  - **Content Moderation**: AI output is pre-moderated by the upstream model, but treat all output as untrusted in render
- **Journal Entries**: Encrypt at rest in Phase 3 (in addition to plain text policy)
- **AI Prompts**: Check for injection attacks
- **Mood Check-In Text**: 280-char limit, crisis keyword detection (see `01-ai-safety.md`)