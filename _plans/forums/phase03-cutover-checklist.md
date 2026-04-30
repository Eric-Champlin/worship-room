# Phase 3 Cutover Checklist — Prayer Wall Read-Swap

**Purpose:** Activate the backend read path for `/prayer-wall`, `/prayer-wall/:id`, `/prayer-wall/dashboard`, and `/prayer-wall/user/:id`. After this checklist runs, the four routes read from `/api/v1/posts/**` instead of in-memory mock data, and write paths fire `createPost`/`createComment`/`updatePost`/`deletePost` against the backend. localStorage is no longer written for Prayer Wall data — `wr_prayer_reactions` continues to be the local cache for reaction state, hydrated from the backend on auth changes via Spec 3.11.

**Phase 3 status before this spec:** 11/12 specs shipped (3.1–3.7, 3.9, 3.10, 3.11). 3.8 (Reports backend) reverted to ⬜ pending re-execution. Spec 3.12 (this) is the cutover.

**Cutover date:** _____________ (Eric fills in)

---

## Overview

Phase 3 delivered the Prayer Wall backend — `posts`, `post_reactions`, `post_bookmarks`, `comments`, `qotd_questions` tables; six controllers (`PostController`, `CommentController`, `ReactionController`, `BookmarkController`, `QotdController`, plus the user-scoped `MeController` endpoints); the unified `prayerWallApi` frontend client (Spec 3.10) wrapping 17 functions; and the `usePrayerReactions` reactive store hydration (Spec 3.11) that reconciles backend reactions/bookmarks with the local cache on auth changes.

Spec 3.12 wires the four page consumers to that infrastructure. The cutover is a single env-var flip: `VITE_USE_BACKEND_PRAYER_WALL=false` → `true`. Each page branches on `isBackendPrayerWallEnabled()` — flag-off preserves the existing mock-data path verbatim (regression contract per Universal Rule W2), flag-on hits the real backend. This is a **read-swap**, not dual-write — when flag-on, localStorage is no longer written for Prayer Wall data.

A second flag, `VITE_USE_BACKEND_MUTES`, is also flipped from `false` to `true` per master plan deviation #1; mute mutations resume firing real backend writes after a smoke test confirms the mute → backend row appears via psql.

For users, Prayer Wall feeds now show real, server-stored prayers — created by real users on the platform — instead of the static mock set. Existing tests continue to pass because the regression contract preserves the flag-off path.

---

## 1. Pre-flight checks

- [ ] On `forums-wave-continued` branch
- [ ] Working tree clean (`git status` shows only the Spec 3.12 changes)
- [ ] Docker running
- [ ] Backend Postgres container running (`docker-compose up`)
- [ ] Backend dev server running (`./mvnw spring-boot:run`) and serving on `:8080`
- [ ] `/api/v1/health` returns 200 with `providers.fcbh.configured` and other readiness fields
- [ ] Frontend dev server running (`pnpm dev`) and serving on `:5173`
- [ ] Logged in as the dev seed user (`sarah@worshiproom.dev` / `WorshipRoomDev2026!`) — JWT in `wr_jwt_token`. The dev-seed Liquibase changeset (`2026-04-23-003-dev-seed-users.xml`, context='dev', never loaded in prod) creates 5 users but NO pre-seeded posts. The Playwright smoke (Section 11) creates its own post in scenario 2; manual smokes below also create their own data.
- [ ] `VITE_USE_BACKEND_ACTIVITY=true` set in `frontend/.env.local` (already cutover'd by Spec 2.9 — needed because `recordActivity('prayerWall', 'prayer_wall')` calls flow through that path on every post + comment + reaction)

---

## 2. Code change

- [ ] Flip `VITE_USE_BACKEND_PRAYER_WALL=true` in `frontend/.env.example` (CC has done this in Step 1 of the plan; Eric verifies)
- [ ] Flip `VITE_USE_BACKEND_MUTES=true` in `frontend/.env.example` (CC has done this in Step 1 of the plan; Eric verifies — this is the second flag-flip per master plan deviation #1)
- [ ] Update both comment blocks above the flags to reflect post-cutover state — "Activated by Spec 3.12 cutover on 2026-04-30." (CC has done this in Step 1 of the plan; Eric verifies)
- [ ] Set both `VITE_USE_BACKEND_PRAYER_WALL=true` and `VITE_USE_BACKEND_MUTES=true` in local `frontend/.env.local` (Eric does this manually because `.env.local` is gitignored — CC does NOT touch it)
- [ ] Restart the frontend dev server so Vite re-reads the env vars (Vite env vars are baked at build time; a restart is required for the new values to take effect)

---

## 3. Build verification

- [ ] `pnpm tsc --noEmit` clean (zero new TypeScript errors)
- [ ] `pnpm lint` clean (zero new lint errors)
- [ ] `pnpm build` clean (production build succeeds with both flags set to `true`)
- [ ] `pnpm test` — record observed Vitest baseline. The post-3.11 baseline is higher than CLAUDE.md's 8,811 / 11 anchor; Spec 3.12 added 14 new tests across 4 new flag-on test files (`PrayerWall.flagOn.test.tsx`, `PrayerDetail.flagOn.test.tsx`, `PrayerWallDashboard.flagOn.test.tsx`, `PrayerWallProfile.flagOn.test.tsx`). Any NEW failing file or fail count beyond baseline is a regression.

**Observed Vitest baseline (Eric records during execution):** _____________

---

## 4. Manual smoke test — read-side

For each route below: navigate, open DevTools → Network tab, filter by `/api/v1/`, and confirm a backend request fires. Assert the rendered content comes from the backend (not the static mock set). DevTools → Application → LocalStorage should NOT show new Prayer Wall data being written (read-swap discipline).

### Smoke 1: `/prayer-wall` (main feed)

- [ ] Navigate to `/prayer-wall`
- [ ] Network: `GET /api/v1/posts?page=1&limit=20&sort=bumped` returns 200
- [ ] If the dev DB is empty of posts, the empty-state ("This space is for you") renders with the "Share a prayer request" CTA
- [ ] Mock data ("Sarah Johnson", "Praying for clarity", etc. from `prayer-wall-mock-data.ts`) is NOT in the DOM
- [ ] Filter pills (Health, Mental Health, etc.) and the QOTD card render as expected
- [ ] Click a filter pill (e.g., Health) → Network: `GET /api/v1/posts?page=1&limit=20&category=health&sort=bumped` returns 200
- [ ] Backend down test: stop the backend (`./mvnw` Ctrl+C), navigate to `/prayer-wall`, observe the FeatureEmptyState renders with "We couldn't load prayers" + "Try again" button. Restart backend.

### Smoke 2: `/prayer-wall/:id` (detail page)

- [ ] After Smoke 5 (post creation) lands a real post, click into its detail page from the feed
- [ ] Network: `GET /api/v1/posts/<uuid>` returns 200 AND `GET /api/v1/posts/<uuid>/comments?page=1&limit=50` returns 200 (parallel fetch via Promise.all)
- [ ] Detail page renders post content, mark-as-answered button (if owner), and comment input
- [ ] Navigate to `/prayer-wall/00000000-0000-0000-0000-000000000000` (bogus UUID) → Network shows 404 → "Prayer not found" UI renders (NOT the FeatureEmptyState — this distinction matters per W8)

### Smoke 3: `/prayer-wall/dashboard` (private dashboard)

- [ ] Navigate to `/prayer-wall/dashboard`
- [ ] Header shows the AUTHENTICATED user's name (Sarah, NOT MOCK_CURRENT_USER's hardcoded "Sarah Johnson" from `user-1`)
- [ ] **My Prayers tab:** Network: `GET /api/v1/posts?page=1&limit=50&sort=recent` returns 200 → rendered list filtered client-side by `userId === auth.user.id`
- [ ] **Bookmarks tab:** Click → Network: `GET /api/v1/users/me/bookmarks?page=1&limit=50` returns 200 → bookmarked posts render
- [ ] **My Comments tab:** Click → renders the "My comments are coming soon" empty-tab placeholder (Spec 3.10 watch-for #20 — known gap, future endpoint)
- [ ] **Reactions tab:** Click → renders prayers from the union of My Prayers ∪ Bookmarks where `reactions[id].isPraying === true` (per Edge Cases §2 Option A); empty state if none
- [ ] **Settings tab:** Notification preferences placeholder (unchanged from flag-off)

### Smoke 4: `/prayer-wall/user/:id` (public profile)

- [ ] Navigate to `/prayer-wall/user/<sarah-uuid>` (use Sarah's UUID from `wr_user_id`)
- [ ] Network: `GET /api/v1/posts?page=1&limit=50&sort=recent` returns 200 → list filtered client-side by `userId === :id`
- [ ] Profile chrome renders Sarah's name (derived from first loaded post's authorName) — placeholder until Phase 8.1 ships the user profile endpoint
- [ ] **Replies tab:** Click → "Replies are coming soon" empty-tab placeholder
- [ ] **Reactions tab:** Click → empty state (no apiUserPrayers to derive from in flag-on without bookmark fetch)

---

## 5. Manual smoke test — write-side

For each write below: perform the action, then verify backend persistence via the SQL queries in Section 6. Confirm `wr_prayer_reactions` localStorage IS still updated for reaction toggles (the local cache is hydrated from the backend on auth changes, but optimistic local writes continue per Spec 3.11) but NO new key writes happen for posts or comments themselves.

### Smoke 5: Create a post

- [ ] Click "Share a Prayer Request" on `/prayer-wall`
- [ ] Fill content, pick a category (Health), click Submit
- [ ] Network: `POST /api/v1/posts` with `Idempotency-Key` header (UUID) returns 201
- [ ] Backend `posts` row inserted (verify via Section 6 query)
- [ ] Post appears at top of the feed
- [ ] Refresh page → post still in feed (backend, not localStorage)

### Smoke 6: Comment on a post

- [ ] On a post's detail page, type a comment and press Enter
- [ ] Network: `POST /api/v1/posts/<id>/comments` with `Idempotency-Key` header returns 201
- [ ] Backend `comments` row inserted
- [ ] Comment appears in the thread; comment count on the post bumps by 1

### Smoke 7: React (Pray) on a post

- [ ] On `/prayer-wall`, click the Pray icon on the new post
- [ ] Network: `POST /api/v1/posts/<id>/reactions/pray` returns 201
- [ ] Backend `post_reactions` row inserted
- [ ] Pray icon shows active state; count increments by 1
- [ ] Refresh page → state persists (hydration via `usePrayerReactions.init`)

### Smoke 8: Bookmark a post

- [ ] On `/prayer-wall`, click the bookmark icon on the new post
- [ ] Network: `POST /api/v1/posts/<id>/bookmark` returns 201
- [ ] Backend `post_bookmarks` row inserted
- [ ] Navigate to `/prayer-wall/dashboard` → Bookmarks tab → post visible

### Smoke 9: Mark as answered (own post)

- [ ] On `/prayer-wall/<own-post>`, click "Mark as answered"
- [ ] Optionally fill a praise text → Confirm
- [ ] Network: `PATCH /api/v1/posts/<id>` with body `{ "isAnswered": true, "answeredText": "..." }` returns 200
- [ ] Backend `posts` row updates `is_answered=true` and `answered_text='...'`
- [ ] AnsweredBadge appears on the card

### Smoke 10: Delete (own post)

- [ ] On `/prayer-wall/<own-post>` (or dashboard), click Delete and confirm
- [ ] Network: `DELETE /api/v1/posts/<id>` returns 204
- [ ] Backend `posts` row updates `deleted_at=NOW()` (soft-delete per master plan)
- [ ] Post disappears from the feed
- [ ] Navigate back to `/prayer-wall/<id>` → 404 → "Prayer not found" UI

### Smoke 11: Edit-window-expired (409)

- [ ] Create a post, wait 6 minutes, attempt to edit content (NOT mark-as-answered, which is exempt per Phase 3 Addendum #1)
- [ ] Network: `PATCH /api/v1/posts/<id>` returns 409 with `code: 'EDIT_WINDOW_EXPIRED'`
- [ ] Toast shows "This post is past the 5-minute edit window." (warning severity, no exclamation — verifies anti-pressure copy)

### Smoke 12: Rate-limit (10 posts/hour)

- [ ] Create 11 posts in quick succession
- [ ] 11th attempt: Network: `POST /api/v1/posts` returns 429 with `Retry-After` header
- [ ] Toast shows the rate-limit copy from `apiErrors.ts` ("Slow down a moment. You can post again in N seconds.")
- [ ] Wait 1 hour for the bucket to refill (or restart backend in dev to reset)

### Smoke 13: Mutes flag — confirms Spec 2.5.7 cutover

- [ ] Mute another user (any non-self user via the user menu on a post or comment)
- [ ] Network: `POST /api/v1/users/me/mutes` returns 201 (this is the second flag-flip path activating)
- [ ] Backend `mutes` row inserted (verify via `SELECT * FROM mutes WHERE muted_user_id = '<target-uuid>';`)
- [ ] Unmute → Network: `DELETE /api/v1/users/me/mutes/<target-uuid>` returns 204; row removed

---

## 6. Backend SQL verification queries

Open psql via `railway connect postgres` (prod) or `docker exec -it worship-room-postgres psql -U worship_room` (dev). Substitute `<sarah-uuid>` with Sarah's actual UUID from `wr_user_id`.

```sql
-- Sarah's posts
SELECT id, content, category, is_answered, answered_text, created_at FROM posts
  WHERE author_id = '<sarah-uuid>' AND deleted_at IS NULL
  ORDER BY created_at DESC LIMIT 10;

-- Comments on Sarah's posts
SELECT c.id, c.content, c.created_at, p.content AS post_content FROM comments c
  JOIN posts p ON c.post_id = p.id
  WHERE p.author_id = '<sarah-uuid>'
  ORDER BY c.created_at DESC LIMIT 10;

-- Sarah's reactions
SELECT r.post_id, r.reaction_type, p.content FROM post_reactions r
  JOIN posts p ON r.post_id = p.id
  WHERE r.user_id = '<sarah-uuid>'
  ORDER BY r.created_at DESC LIMIT 10;

-- Sarah's bookmarks
SELECT b.post_id, p.content FROM post_bookmarks b
  JOIN posts p ON b.post_id = p.id
  WHERE b.user_id = '<sarah-uuid>'
  ORDER BY b.created_at DESC LIMIT 10;

-- Mutes (Spec 2.5.7 verification)
SELECT muter_id, muted_user_id, created_at FROM mutes
  WHERE muter_id = '<sarah-uuid>'
  ORDER BY created_at DESC LIMIT 10;

-- Crisis alerts (verify Universal Rule 13 + Phase 3 Addendum #7)
SELECT content_id, content_type, author_id, severity, created_at FROM crisis_alerts
  ORDER BY created_at DESC LIMIT 10;
```

Confirm:
- [ ] Sarah's posts query returns the rows created in Smokes 5, 7-12 (those that didn't get rate-limited or deleted)
- [ ] Comments query returns Smoke 6's comment
- [ ] Reactions query has at least one row (Smoke 7)
- [ ] Bookmarks query has at least one row (Smoke 8)
- [ ] Mutes query has the row from Smoke 13 (or zero if you unmuted)
- [ ] Crisis alerts query is EMPTY (we didn't trigger any crisis content during this smoke — that's expected)

---

## 7. Cross-device manual smoke

Per spec D8: confirm the cutover works on both desktop and mobile.

- [ ] Laptop (any browser, frontend dev server): all 13 smokes above succeed
- [ ] Phone (Safari iOS or Chrome Android, connect to dev frontend via local IP, e.g., `http://192.168.x.x:5173`): smokes 1-3 (read-side) succeed; touch targets ≥44×44; text wraps without horizontal scroll

---

## 8. Accessibility smoke (Universal Rule 17)

- [ ] Run axe-core automated scan on `/prayer-wall`, `/prayer-wall/<real-uuid>`, `/prayer-wall/dashboard`, `/prayer-wall/user/<sarah-uuid>` (the four routes the master plan AC requires)
- [ ] Save axe-core JSON output to `_cutover-evidence/phase3-a11y-smoke.json` (replaces the placeholder content created in Step 13 of the plan)
- [ ] Zero CRITICAL violations across the scanned routes (any non-CRITICAL findings recorded as follow-up entries in `_plans/post-1.10-followups.md`)
- [ ] Keyboard-only walkthrough of the primary write flows (open composer → fill content → pick category → submit; expand comments → fill input → submit) completes without dead-ends
- [ ] VoiceOver spot-check on the InlineComposer and CommentInput interactions completes without blocking issues
- [ ] Brief notes saved to `_cutover-evidence/phase3-a11y-notes.md` (replaces the placeholder content created in Step 13 of the plan)

---

## 9. Production deploy plan

- [ ] Verify the Railway frontend Dockerfile exposes `VITE_USE_BACKEND_PRAYER_WALL` and `VITE_USE_BACKEND_MUTES` (mirror the `VITE_API_BASE_URL` pattern from Spec 1.10 and the `VITE_USE_BACKEND_ACTIVITY` pattern from Spec 2.9 — `ARG VITE_USE_BACKEND_PRAYER_WALL` + `ENV VITE_USE_BACKEND_PRAYER_WALL=$VITE_USE_BACKEND_PRAYER_WALL` and the same for `_MUTES` before `RUN pnpm build`). If missing, add the two-line Dockerfile patch.
- [ ] Add `VITE_USE_BACKEND_PRAYER_WALL=true` to Railway frontend service env vars (Variables tab → "+ New Variable")
- [ ] Add `VITE_USE_BACKEND_MUTES=true` to Railway frontend service env vars (Variables tab → "+ New Variable")
- [ ] Trigger a Railway deploy (push to `main`, or trigger a manual deploy from the dashboard)
- [ ] After deploy completes: smoke test ONE post-create + comment flow in prod with the dev seed user (or a registered prod test account); verify the backend received the rows via `railway connect postgres` and the Section 6 queries
- [ ] If the prod smoke test fails: see Rollback plan below

---

## 10. Rollback plan (if prod surfaces issues)

If anything goes wrong in production after the deploy:

1. Set `VITE_USE_BACKEND_PRAYER_WALL=false` AND `VITE_USE_BACKEND_MUTES=false` in Railway frontend service env vars (Variables tab → existing variables → edit value for both)
2. Trigger a redeploy (or wait for the next auto-deploy to pick up the new values)
3. Verify in browser DevTools that subsequent Prayer Wall page loads no longer fire `/api/v1/posts/**` calls — the fail-closed env check (`=== 'true'`) treats any non-`'true'` value as off
4. Verify the four routes resume rendering from the in-memory mock data set
5. Backend rows already written remain in the database (shadow data with no consumer for now) — no cleanup required
6. Reaction state in `wr_prayer_reactions` was hydrated from backend before rollback; after rollback the local cache continues to show those reactions until the user clears localStorage or signs out
7. `wr_prayer_reactions` localStorage data is untouched; users see no difference except the feed reverts to mock prayers
8. Open a followup entry in `_plans/post-1.10-followups.md` describing what failed, including the request ID from any `X-Request-Id` headers captured in the failure
9. Do NOT revert the spec's commit. The flag-flips stay in `.env.example`; the Railway env var override is the rollback mechanism.

---

## 11. Sign-off

- Cutover date: _____________
- Eric's sign-off: _____________
- Local smoke test passed: _____________
- Playwright phase03 spec passed locally (`pnpm test:e2e phase03-prayer-wall-roundtrip`): _____________
- Production smoke test passed: _____________
- A11y evidence committed: _____________
- Phase 3 status after this cutover: 12/12 specs shipped (3.1–3.7, 3.9, 3.10, 3.11, 3.12). 3.8 (Reports backend) remains ⬜ — separate spec.
