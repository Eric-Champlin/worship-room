# Brief: Spec 6.11b — Live Presence Component

**Master plan reference:** `_forums_master_plan/round3-master-plan.md` (Spec 6.11b stub, live version, lines 6186-6310) — ID `round3-phase06-spec11b-live-presence-component`

**Spec ID:** `round3-phase06-spec11b-live-presence-component`

**Phase:** 6 (Engagement Features)

**Size:** M (per stub) — in practice substantial: a polling endpoint, a Redis presence-tracking interceptor, a frontend polling hook, an indicator component, a settings toggle, opt-out persistence, crisis-flagged-page suppression, anonymous-visitor session tracking, accessibility-aware screen-reader announcements. The stub is the longest in Phase 6 (~125 lines) for a reason.

**Risk:** Medium (per stub) — "introduces polling traffic; requires carefully-bounded Redis presence tracking."

**Tier:** **xHigh** — a Risk-Medium spec sized M does not normally earn xHigh, but 6.11b earns it for three converging reasons:

1. **The stub itself calls it out:** "This is the single most user-psychology-loaded spec in Phase 6." The master plan author named this spec as the one where pastoral judgment about the user experience matters most. The anti-pressure design rules aren't decoration — they're load-bearing pastoral decisions that a future contributor could "helpfully" undo without knowing why.
2. **It introduces real privacy infrastructure:** a 90-day cookie session id for anonymous visitors, sorted-set entries that age out via TTL, a per-user opt-out preference mirrored locally and on the backend. None of those are individually exotic; together they form a small but real privacy surface that has to be coherent.
3. **It must suppress on crisis-flagged pages.** The stub: "Disabled entirely on pages containing crisis-flagged posts (don't surface presence on the most vulnerable moments)." This is a safety-surface gate. Getting it wrong means presence ("15 people here now") surfaces alongside a crisis-flagged post — a real harm to the most vulnerable users.

**Practical execution implication:** xHigh thinking for plan + execute + review. Eric reviews: the anti-pressure rules surface-by-surface (no animations, no "be the first," hidden at N=0, no friends enrichment), the crisis-flagged suppression logic and its tests, the privacy surface (cookie session ids never collide with identity, opt-out is honored end-to-end), the rate limiting + cache TTL math, and every copy string. Same care posture as 6.8.

**Prerequisites:**
- 3.11 (Reactive Store Backend Adapter) — part of Phase 3, ensures the Prayer Wall is reading from the backend.
- 3.12 (Phase 3 Cutover) — not named in the stub's prereq line but is the substantive prereq: `VITE_USE_BACKEND_PRAYER_WALL` flipped to true, Prayer Wall live as a real networked surface. Without this, 6.11b has nothing to surface presence ON.
- **Eric confirmed 2026-05-15:** Prayer Wall feed is live. Both prereqs satisfied.
- 6.11 (Sound Effects polish) — listed as prereq but technically sequencing-only. 6.11b's presence indicator does not call sound effects. The 6.11 dependency is wave ordering, not technical. Plan-recon R7 confirms.

**Pipeline:** This brief → `/spec-forums spec-6-11b-brief.md` → `/plan-forums` → execute → `/code-review` → `/verify-with-playwright` (the stub explicitly calls for a 2-browser-context Playwright test asserting count = 2 — see Section 7). The Playwright pass is NOT optional for this spec.

---

## 1. Branch Discipline

Branch: `forums-wave-continued`. Eric handles all git ops manually. CC never commits/pushes/branches/rebases at any phase. `git stash` for diagnostic baseline-compare is permitted only if it brackets within the same turn. Out-of-band sign-off recording: any plan-time divergence requiring Eric's sign-off is recorded in the plan's Execution Log when received, not retroactively.

---

## 2. What 6.11b Builds (Verbatim from the Stub)

**Goal:** Surface the reality that other people are also reading the Prayer Wall — without creating social pressure, comparison, or urgency dynamics.

**Approach:** Backend tracks presence via a Redis sorted set keyed `presence:prayer_wall` with user_id (authenticated) or anonymous session_id (90-day cookie) as the member and the bump timestamp as the score. An MVC interceptor bumps the score on every `/posts` GET. A `GET /api/v1/prayer-wall/presence` endpoint returns the current count (sorted-set members with score newer than 60-minute TTL). Frontend polls every 30 seconds while the tab is visible, pauses on `visibilitychange` to hidden, resumes on visible.

**Display rules (verbatim):**
- **N = 0:** component renders nothing (no placeholder, no "be the first," no gray "—").
- **N = 1:** "1 person here" — don't assume the single user is "just you"; the lurker might be on another tab.
- **N ≥ 2:** "N people here now"
- Count is **static** (not animated) — counters that tick up/down create urgency.
- **Placement:** feed header top-right, small font, muted color, non-interactive (no tap target — just a status indicator).

**Anti-pressure design (verbatim, Decision 7 from Stage C sign-off):**
- Hidden when count is zero — no "be the first" CTA.
- No "X of your friends are here" enrichment (avoids social comparison).
- No "someone just joined" flash or pulse animation.
- No tooltip or expansion listing who is present (pure count, no identity).
- No historical chart ("more people here than usual") — we don't measure anything past "right now."
- Logged-out visitors see the count and contribute to it (public).
- User can opt out of being counted via `/settings` toggle ("Count me as present when I'm reading"). The opt-out hides the user from the count but does NOT hide the count from them.

**Privacy (verbatim):**
- Authenticated users: counted as their user_id (one contribution per user across multiple tabs/devices).
- Anonymous visitors: counted by a 90-day cookie session id (not the JWT; no identity exposure). Cookie is HttpOnly + Secure + SameSite=Lax.
- No user sees any other user's identity via this endpoint — count only.
- Deleted users' session entries age out of the sorted set naturally (60-min TTL via Redis `ZREMRANGEBYSCORE`).

**Rate limiting (verbatim):**
- `GET /api/v1/prayer-wall/presence`: 120 per minute per authenticated user (every 30 seconds = 2/min normal load, plus headroom for polling burst on tab-refocus).
- Cleanup job: Redis `ZREMRANGEBYSCORE presence:prayer_wall 0 (now - 3600)` runs every 5 minutes via `@Scheduled`.

**Accessibility (verbatim):**
- Component has `role="status"` and `aria-live="polite"` so screen readers announce changes (but only on change, not every poll).
- Icon is decorative (`aria-hidden="true"`); the numeric count is the accessible name.
- Focus never lands on the count (it's a status, not a control).

**Acceptance criteria (verbatim, 14):**
- [ ] Component hidden when count is 0
- [ ] Component renders "1 person here" when count is 1
- [ ] Component renders "N people here now" when count ≥ 2
- [ ] Presence bumped on every `/posts` request (authenticated and anonymous)
- [ ] Anonymous visitors use cookie session id, not JWT or IP
- [ ] Count excludes users with `preferences.presence.opted_out = true`
- [ ] Frontend polls every 30 seconds while tab visible
- [ ] Polling stops on `visibilitychange` to hidden
- [ ] Polling resumes on `visibilitychange` to visible
- [ ] Server cache TTL 30 seconds verified
- [ ] Rate limit: 121st request in 1 minute returns 429
- [ ] Sorted set cleanup job runs every 5 minutes
- [ ] Settings toggle persists to both local and backend preference
- [ ] Component not rendered on pages with crisis-flagged post surfacing
- [ ] Screen reader announces changes but not every poll
- [ ] At least 14 tests across backend + frontend covering edge cases

This brief honors the stub verbatim and adds: an explicit safety section on crisis-flagged page suppression (Section 4), plan-time recon for the things the stub leaves to recon (Section 3), watch-fors for the realistic failure modes (Section 6), and a slightly fleshed-out test specification (Section 7).

<!-- chunk1-end-unique-anchor-spec-6-11b -->

---

## 3. Recon Ground Truth (Plan-Time)

**R1 — the `/posts` interceptor surface.**
The stub says "presence is bumped on every `/posts` request." Plan reads the existing `PostController` (and any related controllers reachable on the Prayer Wall feed path) to enumerate exactly which endpoints get instrumented. Confirms: are there multiple `/posts` paths (e.g., `/api/v1/posts`, `/api/v1/posts/{id}`, `/api/v1/posts/answered`)? Does the interceptor bump on ALL of them, or only the feed-listing call? The stub implies all reads count as presence — plan confirms.

**R2 — the anonymous-session cookie.**
The stub specifies a 90-day cookie, HttpOnly + Secure + SameSite=Lax, not the JWT. Plan determines:
- Does the app already issue any cookie? (CSRF token, session cookie, analytics cookie?) The new presence cookie must not collide.
- Cookie name (the stub doesn't specify; plan picks one, e.g., `wr_presence_session`).
- How the cookie is generated server-side on first anonymous request — a `Set-Cookie` from the interceptor itself, or a separate filter?
- Confirm the cookie is NOT readable by JS (HttpOnly), is Secure-only, SameSite=Lax (per stub).

**R3 — the Redis sorted-set + 60-minute TTL semantics.**
The stub says: "score newer than 60-minute TTL" defines who is "present." Plan confirms:
- The sorted set is `presence:prayer_wall`; member = `user:{userId}` or `anon:{sessionId}`; score = bump-timestamp (epoch seconds or ms — plan picks one and is consistent).
- The count query is `ZRANGEBYSCORE presence:prayer_wall (now - 3600) +inf` and returns the cardinality (or `ZCOUNT` directly).
- The 5-minute cleanup is `ZREMRANGEBYSCORE presence:prayer_wall 0 (now - 3600)` — keeps the set bounded.
- Confirm 5.6 Redis is available (it was for 6.8's cooldown; should still be). If not, plan STOPS.

**R4 — the cache TTL 30s.**
The stub specifies "server cache TTL 30 seconds" for the `GET /presence` endpoint. Plan reads existing Spring Cache setup (the stub recon note 2 says `@Cacheable` should be trivial). Confirms:
- Does a Spring Cache abstraction exist today, or does plan introduce it? If introducing, that's a small additional scope to flag.
- The cache key is global (one count for the whole Prayer Wall) — NOT per-user. Plan confirms.
- TTL handling on cache miss (lock-or-recompute pattern? simple time-based?) — plan picks the simpler shape.

**R5 — the opt-out preference shape.**
The stub: opt-out persists to BOTH local (localStorage) and backend ("preferences.presence.opted_out"). Plan reads:
- Whether `preferences` already exists as a backend-stored shape on the user, or whether this is the first per-user preference written server-side beyond `wr_settings.*`.
- If 6.8's `wr_settings.verseFindsYou.enabled` and similar are *purely* localStorage today, this spec adds the *first server-side preference* — that's a notable surface (a new endpoint or extension to an existing `/users/me/preferences` shape). Plan determines whether to extend `/users/me`, add a new `/users/me/preferences` endpoint, or pick another existing pattern.
- The localStorage mirror is `wr_settings.presence.optedOut` per stub; confirm naming matches the existing nested pattern in `.claude/rules/11-local-storage-keys.md`.
- The count-exclusion check happens server-side: when computing the count, exclude any sorted-set member whose `user:{userId}` corresponds to a user with `presence.opted_out = true`. Plan determines the most efficient way to do this (join? cached set of opted-out user ids? filter at count time?).

**R6 — the crisis-flagged-page suppression surface.**
The stub: "Disabled entirely on pages containing crisis-flagged posts (don't surface presence on the most vulnerable moments)." This is the single most important recon item for safety. Plan determines:
- Which routes can render crisis-flagged posts? Likely: `/prayer-wall` (the feed), `/prayer-wall/:id` (PrayerDetail), `/prayer-wall/answered`, `/prayer-wall/user/:userId`. Plan enumerates exhaustively.
- How does the frontend know a page contains crisis-flagged content? Today, 6.6b-deferred-2's crisis-scan runs server-side and sets a `crisisFlag` on posts (R-FINDING-C / one-way ratchet from that spec). The frontend likely reads `prayer.crisisFlag` per post. The PresenceIndicator's parent (feed header) needs to know whether *any* post in the current viewport (or whole page) is crisis-flagged.
- Plan picks the cleanest detection mechanism: a context provider that aggregates child `crisisFlag` signals up to the feed header? A separate query to count flagged posts in the current view? An `isVulnerablePage` boolean from the route loader? Plan-recon decides and surfaces to Eric. The brief does NOT pre-commit to a mechanism — it commits to the OUTCOME (presence hidden on any page with a flagged post).

**R7 — the 6.11 sequencing prereq.**
The stub lists 6.11 as a prereq. 6.11's surface (sound-effects toggle) shares zero code with 6.11b (presence indicator). Plan confirms the dependency is sequencing-only and 6.11b proceeds independently. Almost trivially yes — worth explicit.

**R8 — the visibility-aware polling hook.**
The stub specifies polling pauses on `visibilitychange` to hidden, resumes on visible. Plan determines whether an existing hook in the codebase (perhaps from earlier wave work — there were notes about "foreground tab + scroll activity" signal work for 6.8's reading-time trigger) can be reused or extended, or whether `usePresence.ts` builds this from scratch. Re-use is preferred.

**R9 — the rate-limit shape.**
The stub: 120 req/min per authenticated user. Plan determines:
- Existing rate-limit pattern in the codebase (the 6.8 endpoint had 10/hour; 6.11b is much chattier). Same rate-limiter? Different bucket?
- Anonymous visitors poll the same endpoint — do they get a separate bucket keyed on cookie session id, or are they collectively rate-limited by IP? The stub doesn't specify; plan picks the safer shape (per-cookie-session rate limit, same 120/min ceiling) and surfaces.
- The 121st request returns 429 — confirm the existing 429 envelope matches what the frontend hook handles (back off, don't crash).

**R10 — the feed-header surface.**
The stub: "Placement: feed header top-right, small font, muted color, non-interactive." Plan finds the existing feed header component and confirms it has room for a status indicator without disrupting existing layout. If the feed header is dense, plan surfaces and Eric decides whether to redesign.

---

## 4. The Crisis-Flagged Page Suppression — The Safety Gate

This section exists because the suppression rule is the single most important pastoral decision in the spec and deserves its own section.

**The rule (verbatim from stub):** *"Disabled entirely on pages containing crisis-flagged posts (don't surface presence on the most vulnerable moments)."*

**Why it matters:** A user who has just posted a crisis prayer, or who is reading a post flagged crisis, is at a vulnerable moment. Surfacing "15 people here now" alongside that content does at least three harms:
- Implies an audience: "15 people are watching this crisis." That can intensify shame.
- Creates social-comparison dynamics in a context that must be free of them.
- Suggests the moment is a spectacle. It is not. It is a moment requiring care.

The suppression is **all-or-nothing per page.** If a page contains *any* crisis-flagged post in its rendered content, the presence component does not render at all on that page. There is no "dim the count" or "smaller count" or "count without the icon." The whole component is hidden.

**What "contains a crisis-flagged post" means — the cases to cover:**
- The feed listing where one of the rendered posts is crisis-flagged → hide on feed.
- A PrayerDetail page where the post itself is crisis-flagged → hide on detail.
- A user-profile / dashboard listing where one of the rendered posts is crisis-flagged → hide on that profile.
- A search result that includes a crisis-flagged post → hide.
- The Answered Wall (`/prayer-wall/answered`) — by definition shouldn't contain crisis-flagged posts (they wouldn't be marked answered while flagged), but plan-recon R6 confirms what the actual filter does and whether suppression is needed for completeness.

**What "crisis-flagged" means in practice:** the post's `crisisFlag` field is truthy. This is the same flag 6.6b-deferred-2 just wired to be set across `answered_text` write paths, and it is the one-way ratchet (R-FINDING-C from that spec) that cannot be cleared by author edit.

**The detection mechanism is a plan-recon decision (R6), but the OUTCOME is locked.** A future contributor who finds the suppression "too aggressive" and wants to weaken it ("only hide for non-author viewers" or "only hide on detail pages") should be hard-blocked at code review. The whole-component-hidden-on-any-flagged-page rule is load-bearing.

**Two related rules for completeness:**
- The crisis-flag-suppression check happens client-side (the page already has the post data; the check is "any post in this view has crisisFlag=true"). Server-side, the `/presence` endpoint continues to return the count — it doesn't know which page the user is on. The frontend decides whether to render.
- An authenticated user with the opt-out enabled who lands on a crisis-flagged page sees no presence component (because of the page rule) AND is not counted (because of opt-out). Both rules apply additively.

---

## 5. Gates

6.11b is risk-Medium with safety + privacy surfaces, so gates lean strict.

| Gate | Applicability | Notes |
|------|---------------|-------|
| Gate-1 (Liquibase rules) | **Applies (HARD) if R5 finds preferences must persist server-side.** | Either a new `user_preferences` table column / row, or an extension to an existing preferences shape. Append-only changeset; idempotent. Plan-recon R5 determines whether a migration is needed. |
| Gate-2 (OpenAPI updates) | **Applies (HARD).** | Document `GET /api/v1/prayer-wall/presence` with response shape `{ data: { count: N }, meta }`, the 30s cache TTL behavior, the 429 envelope. Document any new preferences endpoint or extension from R5. |
| Gate-3 (Copy Deck) | **Applies (HARD).** | All copy strings in Section 8 below. |
| Gate-4 (Tests mandatory) | **Applies (HARD).** | Stub mandates at least 14 tests. See Section 7. |
| Gate-5 (Accessibility) | **Applies (HARD).** | `role="status"`, `aria-live="polite"`, decorative icon (`aria-hidden="true"`), focus never lands on the count, screen reader announces changes but not every poll. Tested. |
| Gate-6 (Performance) | **Applies (HARD).** | 30-second polling means real traffic. Cache TTL math must hold (30s server cache + 30s client poll cadence + 60-min sorted-set TTL). Rate limit verified. |
| Gate-7 (Rate limiting) | **Applies (HARD).** | 120/min/user, 429 on 121st. Anonymous bucket per R9. |
| Gate-8 (Respect existing patterns) | **Applies.** | Reuse Spring Cache patterns, existing rate-limit infrastructure, existing settings-toggle pattern (the "Gentle extras" home from 6.8 OR the audio section if 6.11 ends up there). Don't invent parallels. |
| Gate-9 (Plain text only) | **N/A** | No content surface. |
| Gate-10 (Crisis detection supersession) | **Applies (HARD) — the defining gate.** | Universal Rule 13: the backend crisis classifier is authoritative; any page containing a crisis-flagged post hides the presence component. See Section 4. **This is Gate-G-CRISIS-SUPPRESSION.** |

**New gates specific to 6.11b:**

**Gate-G-CRISIS-SUPPRESSION (HARD).**
On any page containing a crisis-flagged post, the PresenceIndicator does not render at all. All-or-nothing per page. Tested with at least 2 routes (the feed with a flagged post, and a flagged PrayerDetail page). Code review hard-blocks: partial suppression ("smaller count," "hide icon only," "suppress for non-authors only"), or any logic that surfaces presence on a flagged-content page under any condition.

**Gate-G-ANTI-PRESSURE (HARD).**
The seven anti-pressure rules in Section 2 ship intact, NONE weakened. Specifically: hidden at N=0, no animations, no friends enrichment, no identity tooltip, no historical chart, no social-proof CTA framing, opt-out honored. Each is testable. Code review hard-blocks any addition that contradicts these (e.g., a tooltip listing names, an animated counter, a "join them" framing).

**Gate-G-ANONYMOUS-PRIVACY (HARD).**
Anonymous visitors are counted via the dedicated cookie session id ONLY. NOT by JWT (they don't have one). NOT by IP. The cookie is HttpOnly + Secure + SameSite=Lax. The cookie value carries no identity information — it's an opaque random id. Code review hard-blocks any path where IP, JWT, or browser fingerprint information enters the presence count.

**Gate-G-OPT-OUT-HONORED (HARD).**
A user who has opted out (`preferences.presence.opted_out = true`) is excluded from the count, regardless of how they reached the page. The opt-out does NOT hide the count from them — they continue to see it; they are just not counted. Tested end-to-end: opted-out user generates `/posts` requests, count remains as-was.

**Gate-G-NO-SCOPE-CREEP (HARD).**
6.11b is the presence indicator + its endpoint + the settings toggle + the crisis-flagged suppression + the anonymous cookie. NOT per-post presence, NOT typing indicators, NOT presence history, NOT presence-cross-feature (e.g., on the Daily Hub or Music page). The stub names what's out of scope (Section 9 below); honor it strictly.

<!-- chunk2-end-unique-anchor-spec-6-11b -->

---

## 6. Watch-Fors

Organized by concern area.

### Crisis-flagged suppression (the defining gate)

**W1.** Suppression is ALL-OR-NOTHING per page. One flagged post in the rendered view → component does not render at all. Never "smaller," never "icon-only," never "hidden only for non-authors."
**W2.** Suppression is client-side. The server doesn't know which page the user is on; it just returns the count. The frontend page-level component decides whether to render.
**W3.** The flagged-content check applies to ALL routes that can render flagged posts. Plan-recon R6 enumerates; tests cover at least the feed and a flagged PrayerDetail.
**W4.** Reading `prayer.crisisFlag` from post data is the right signal. Do NOT introduce a separate "is this page sensitive" query or shadow-state — if the post is in the view, its `crisisFlag` is already in the data.

### Anti-pressure design

**W5.** Hidden at N=0 — hardest to remember and most likely to be "helpfully" replaced with "be the first." Don't. A zero-presence Prayer Wall renders no indicator at all.
**W6.** No animation, no pulse, no fade-in on count change. Count appears, count changes, count disappears — all instant.
**W7.** No tooltip listing identities. No "hover to see who's here." No name list under any condition.
**W8.** No friends enrichment. "3 of your friends are here" creates exactly the social comparison the feature exists to avoid. Never.
**W9.** No historical chart, no "more people than usual," no streak. "Right now" only.
**W10.** The N=1 case says "1 person here" — NOT "you're alone" or "just you." The stub is explicit: don't assume the single user is the viewer; the count might be a lurker on another tab.

### Privacy & anonymous-session

**W11.** Anonymous cookie is HttpOnly + Secure + SameSite=Lax. Not JS-readable. Not sent on cross-site requests. Not generated by client code (server issues it).
**W12.** Anonymous cookie value is opaque random. No user_id encoded, no IP encoded, no timestamp meaningful to identity.
**W13.** No identity ever leaves the `/presence` endpoint. Count and meta only. A response that included user_ids or session_ids would be a privacy regression.
**W14.** Cookie does NOT collide with any existing cookie. Plan-recon R2 confirms naming.

### Opt-out

**W15.** Opt-out hides USER from count, NOT count from user. An opted-out user still sees the count (without their own contribution). Asymmetric and intentional.
**W16.** Opt-out persists both locally AND server-side. localStorage mirror is for fast client read; backend is the authority.
**W17.** Opt-out applies on the next bump-eligible request. A previously-counted user who flips the toggle should be excluded within 60 minutes (next sorted-set cleanup) or immediately on next bump (depending on plan-recon R5's chosen mechanism). Either is acceptable; the watch-for is that it does eventually take effect, tested.

### Polling & visibility

**W18.** Polling pauses on `visibilitychange` to hidden — verified by Vitest fake timers + visibility events.
**W19.** Polling resumes on visibility → visible — same test path.
**W20.** A long-hidden tab that becomes visible does NOT make a burst of catch-up requests. One immediate poll on resume, then back to 30s cadence.
**W21.** Rate-limit 429 is handled gracefully — hook backs off, doesn't crash, doesn't re-poll in a tight loop. Plan-recon R9 picks the backoff strategy.

### Cache, sorted-set, cleanup

**W22.** Server cache TTL is 30 seconds and is global (not per-user). One cache entry serves all callers.
**W23.** Sorted-set members use prefixes (`user:` and `anon:`) to disambiguate authenticated from anonymous — same numeric id in both spaces does not collide.
**W24.** The 5-minute cleanup job's `ZREMRANGEBYSCORE` removes stale members BEFORE the count read sees them — confirm cleanup cadence is shorter than or equal to the count's TTL filter, so the set stays bounded.
**W25.** Multiple tabs from the same authenticated user do NOT inflate the count. The sorted-set member is `user:{userId}`, not `user:{userId}:{tabId}`. Multiple bumps for the same user just update the score; the count is cardinality.

### Accessibility

**W26.** `aria-live="polite"` announces changes — but only on count change, not every poll. If the count is stable across 100 polls, the screen reader announces zero times.
**W27.** The icon is decorative; the count is the accessible name. A screen reader hears the number, not the icon's alt text.
**W28.** Focus order never lands on the count — it's not in tab order.

### Cross-cutting

**W29.** No new dependencies introduced beyond the existing Spring/Redis surface unless plan-recon R4 finds Spring Cache needs adding (in which case it's noted as a tracked addition).
**W30.** No git operations — standard discipline.

---

## 7. Test Specifications

The stub mandates **at least 14 tests** across backend + frontend covering edge cases. Target ~18-22 to cover the watch-fors. Backend: JUnit + Testcontainers (Redis). Frontend: Vitest + RTL with MSW. E2E: Playwright (2-browser-context test).

### Backend (Testcontainers + Redis)

**T1.** Presence bumped on authenticated `/posts` GET — sorted-set contains `user:{userId}` with current timestamp.
**T2.** Presence bumped on anonymous `/posts` GET — sorted-set contains `anon:{sessionId}`; cookie is issued on first request.
**T3.** `GET /presence` returns count = number of sorted-set members with score > now - 3600.
**T4.** Count excludes users with `preferences.presence.opted_out = true`.
**T5.** Rate limit: 121st `GET /presence` from same auth user in 1 min returns 429.
**T6.** Cache TTL: 2 consecutive `GET /presence` within 30s hit the cache (one Redis read, two API responses).
**T7.** Sorted-set cleanup job removes entries older than 3600s (test by seeding old entries + invoking the job manually).
**T8.** Anonymous cookie attributes: HttpOnly, Secure, SameSite=Lax, 90-day Max-Age (assertions on the `Set-Cookie` header).
**T9.** Anonymous cookie value is opaque (no user_id, no IP, no JWT encoded — length + entropy check, or just "matches expected random format").
**T10.** Opt-out toggle: a user opts out, generates `/posts` bumps, count does NOT include them.

### Frontend (Vitest + RTL + MSW)

**T11.** N=0 → component renders nothing (the `<div>` is not in the DOM at all, or is empty — plan picks; the test asserts no visible text).
**T12.** N=1 → renders exactly "1 person here."
**T13.** N≥2 → renders exactly "N people here now" for representative Ns (e.g., 2, 15, 100).
**T14.** `aria-live="polite"` and `role="status"` present; icon has `aria-hidden="true"`.
**T15.** Polling fires every 30s while visible (fake timers + MSW spy on the endpoint).
**T16.** `visibilitychange` to hidden → polling stops (no MSW call during hidden time).
**T17.** `visibilitychange` back to visible → polling resumes; one immediate poll, then 30s cadence.
**T18.** **Crisis-suppression on the feed:** rendering a feed where one post has `crisisFlag: true` → PresenceIndicator does NOT render. Even if `/presence` returns N=15.
**T19.** **Crisis-suppression on PrayerDetail:** rendering a flagged post detail page → PresenceIndicator does NOT render.
**T20.** Settings toggle: turning the opt-out on calls the backend preference endpoint AND writes localStorage.
**T21.** 429 response handled — hook backs off, no crash, no infinite re-poll.

### E2E (Playwright)

**T-E2E-1.** Two browser contexts both loading Prayer Wall → `GET /presence` returns count=2 in each (with the stub's testing-note framing).

Minimum ~22 tests, comfortably above the stub's 14-test floor. Plan can collapse some if natural (e.g., T2/T8/T9 could be one well-structured test).

---

## 8. Copy Deck (D-Copy)

All user-facing copy. Eric-approved before execute.

*Count, N=1:* **"1 person here"**
*Count, N≥2:* **"{N} people here now"**
*(N=0 renders no text — component is hidden.)*

*Settings toggle label:* **"Count me as present when I'm reading"**
*Settings toggle helper:* **"Others see how many people are on the Prayer Wall. Turn this off to hide your presence — you'll still see the count."**

*Settings section heading:* plan-recon R5/R10 picks — likely the existing "Gentle extras" section (6.8's home), unless 6.11 ended up creating an audio section that warrants a separate sensory grouping. Match whatever's in production.

**No other user-facing copy.** No tooltip, no "learn more" link on the count, no toast on opt-out toggle, no animation announcement.

**Anti-Pressure Copy Checklist** (per stub): (a) no comparison ✓ (b) no urgency ✓ (c) no exclamation points ✓ (d) no therapy-app jargon ✓ (e) no streak/social-proof framing ✓ (f) no false scarcity ✓

---

## 9. Files

All paths relative to repo root. Plan-recon confirms.

### Create

**Backend:**
- `backend/src/main/java/com/worshiproom/presence/PresenceController.java`
- `backend/src/main/java/com/worshiproom/presence/PresenceService.java`
- `backend/src/main/java/com/worshiproom/presence/PresenceTrackingInterceptor.java` (bumps presence on `/posts` requests)
- `backend/src/main/java/com/worshiproom/presence/PresenceCleanupJob.java` (the 5-minute `@Scheduled` cleanup)
- `backend/src/main/java/com/worshiproom/presence/dto/PresenceResponse.java`
- `backend/src/test/java/com/worshiproom/presence/PresenceIntegrationTest.java`
- A Liquibase changeset IF plan-recon R5 requires server-side preference storage (filename per existing convention, e.g., `2026-MM-DD-NNN-add-user-presence-preference.xml`)

**Frontend:**
- `frontend/src/components/prayer-wall/PresenceIndicator.tsx`
- `frontend/src/hooks/usePresence.ts` (polling hook with visibility-aware pause/resume)
- `frontend/src/types/api/presence.ts` (the response shape)
- `__tests__/` files for each frontend module per Section 7
- An E2E spec: `e2e/spec-6-11b-presence.spec.ts`

### Modify

- The feed header component (location per plan-recon R10) — embed PresenceIndicator with crisis-flagged-page suppression logic.
- The settings page — add the "Count me as present" toggle (location per R5/R10).
- The settings type / default mechanism — add `presence.optedOut` (default `false` for new users; existing users undisturbed).
- OpenAPI spec — document `GET /api/v1/prayer-wall/presence` and any new preferences endpoint.
- `.claude/rules/11-local-storage-keys.md` — document `wr_settings.presence.optedOut`.
- Possibly an MVC config to register `PresenceTrackingInterceptor` against `/posts*`.

### Do NOT modify

- The crisis-detection mechanism or `crisisFlag` field — 6.11b reads it, doesn't change it.
- The 6.6b-deferred-2 work in `PostService.updatePost` — untouched.
- 6.8's Verse-Finds-You surface or its settings.
- The 6.11 sound-effects toggle.
- The shipped Prayer Wall feed mechanics beyond the feed-header embed point.

### Delete

- Nothing.

---

## 10. Acceptance Criteria (from the stub + clarifications)

6.11b is done when:

- [ ] A. PresenceIndicator hidden at N=0; renders "1 person here" at N=1; renders "{N} people here now" at N≥2.
- [ ] B. Presence bumped on every `/posts` request — authenticated AND anonymous.
- [ ] C. Anonymous visitors counted via the dedicated HttpOnly+Secure+SameSite=Lax cookie session id; NOT JWT, NOT IP.
- [ ] D. Count excludes users with `preferences.presence.opted_out = true`.
- [ ] E. Frontend polls every 30s while tab visible; stops on hidden; resumes on visible (one immediate poll, then cadence).
- [ ] F. Server cache TTL 30 seconds verified.
- [ ] G. Rate limit: 121st request in 1 minute returns 429; client backs off without crash.
- [ ] H. Sorted-set cleanup job runs every 5 minutes.
- [ ] I. Settings toggle persists to BOTH localStorage AND backend preference.
- [ ] J. **PresenceIndicator does NOT render on any page containing a crisis-flagged post (Gate-G-CRISIS-SUPPRESSION).**
- [ ] K. Screen reader announces changes but NOT every poll; `role="status"`, `aria-live="polite"`, decorative icon.
- [ ] L. Anti-pressure rules all intact: hidden at N=0, no animations, no friends enrichment, no identity tooltip, no historical chart, no social-proof CTA, opt-out honored.
- [ ] M. Anonymous cookie value carries no identity information (opaque random).
- [ ] N. Opt-out hides USER from count; does NOT hide count from user.
- [ ] O. At least 14 tests across backend + frontend (Section 7 targets ~22).
- [ ] P. E2E Playwright test: 2 browser contexts → count = 2.
- [ ] Q. Backend + frontend lint + typecheck + tests pass.
- [ ] R. OpenAPI updated; new localStorage key documented.

---

## 11. Out of Scope

From the stub, verbatim in intent:
- Per-post presence ("N people looking at this post right now") — too creepy, too performance-expensive.
- Friends-only presence ("2 friends are here") — adds comparison dynamic that contradicts the whole anti-pressure design.
- Historical presence graphs.
- Push notifications when presence crosses thresholds.
- Typing indicators anywhere.
- Presence on non-Prayer-Wall surfaces (Daily Hub, Music, etc.) — future spec if ever, not 6.11b.
- Tooltip / hover-to-reveal listing names.
- Animated counters or pulse-on-change.

---

## 12. Recommended Planner Instruction

> Plan Spec 6.11b from `spec-6-11b-brief.md`. This is the most user-psychology-loaded spec in Phase 6 (per the stub's own framing) and earns xHigh thinking for all phases.
>
> Plan-recon R1-R10 before planning. R6 is the most important — the crisis-flagged-page suppression mechanism. Surface to Eric your chosen detection mechanism (context-provider aggregation vs. route-loader boolean vs. another shape) for sign-off. R5 is the second-most-important — whether preferences need new server-side storage, and if so, the migration shape.
>
> Honor every HARD gate: Gate-G-CRISIS-SUPPRESSION (all-or-nothing per page), Gate-G-ANTI-PRESSURE (seven rules intact, none weakened), Gate-G-ANONYMOUS-PRIVACY (cookie only, no JWT/IP/fingerprint), Gate-G-OPT-OUT-HONORED (user excluded from count, count not hidden from user), Gate-G-NO-SCOPE-CREEP.
>
> If 5.6 Redis is unavailable, STOP. If R6's detection mechanism is unclear, STOP and surface. If R5 reveals server-side preferences need a more substantial scaffolding than expected, STOP and surface — do not silently expand.
>
> Standard discipline: no git operations.

---

## 13. Prerequisites Confirmed

- [x] The live 6.11b master plan stub read in full (lines 6186-6310) — authored against the LIVE stub, not the pristine-baseline backup.
- [x] 3.11 + 3.12 — Eric confirmed 2026-05-15 that Prayer Wall feed is live. Both prereqs satisfied.
- [~] 6.11 — listed as prereq, sequencing-only (6.11 is currently shipping its audit/coverage; 6.11b's surface is independent). Plan-recon R7 confirms.
- [x] 5.6 (Redis) — available (used by 6.8 cooldown). Plan-recon R3 re-confirms.
- [x] 6.6b-deferred-2 — merged 2026-05-15; `crisisFlag` is now reliably set on `answered_text` write paths. 6.11b's suppression mechanism reads that flag.

---

## End of Brief
