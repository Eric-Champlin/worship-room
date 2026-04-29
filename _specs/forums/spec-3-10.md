# Forums Wave: Spec 3.10 — Frontend Service API Implementations

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 3.10 (body at lines 3990-4020)
**ID:** `round3-phase03-spec10-frontend-prayer-wall-api`
**Branch:** `forums-wave-continued` (long-lived; do NOT create a new branch, do NOT checkout, do NOT commit/push)
**Date:** 2026-04-29
**Tier:** MAX (XL/High — user-safety boundary spec; see Tier rationale below)

---

## Affected Frontend Routes

**N/A — backend integration plumbing spec; no UI changes shipped in 3.10.**

This spec creates the API module, post/comment mappers, and error-handling helpers. **Per the brief's "Files explicitly NOT modified" section, no call sites change outside `lib/env.ts`, `.env.example`, and `types/prayer-wall.ts`.** Spec 3.11 (Reactive Store Backend Adapter) wires consumer hooks. Spec 3.12 (Phase 3 Cutover) invokes the routes against the backend end-to-end.

`/verify-with-playwright` SHOULD BE SKIPPED for this spec — the API module is verified by MSW-backed tests, the mappers by unit tests with controlled fixtures, and the error helpers by direct assertion. There is no UI surface to verify visually.

If Eric wants a downstream visual sanity check after Spec 3.11+ wires the consumers, the routes that consume Prayer Wall data are:

- `/prayer-wall`
- `/prayer-wall/:id`
- `/prayer-wall/user/:id`
- `/prayer-wall/dashboard`

---

## STAY ON BRANCH

Same convention as the rest of the wave (established in Spec 3.7). Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`. Eric handles git manually.

---

## Tier

**MAX.** Spec 3.10 is the user-safety boundary spec for Phase 3. Every Prayer Wall read and write transitions to backend code paths, optimistic update rollback governs the perceived UX, and the crisis classifier path becomes user-facing. Wrong here = real users see wrong content (cross-author leakage), get silently rate-limited mid-prayer (write fails with no feedback), or — worst case — bypass crisis flagging when the optimistic UI shows their post but the backend rejected it. MAX is reserved for crisis-detection / user-safety / security-boundary specs; 3.10 qualifies on all three counts.

## Master Plan Divergence

The master plan body for Spec 3.10 (line 3990 of `_forums_master_plan/round3-master-plan.md`) frames this spec as "Create `frontend/src/services/api/prayer-wall-api.ts` exposing the same function signatures as the existing localStorage service. Wire the `services/index.ts` swap point." Recon on the active machine (`/Users/eric.champlin/worship-room/`) reveals two structural problems with that framing:

**MPD-1: There is no existing localStorage service for Prayer Wall.** Pages and components import `getMockPrayers, getMockComments, MOCK_CURRENT_USER` directly from `@/mocks/prayer-wall-mock-data`. Verified call sites: `pages/PrayerWall.tsx:27`, `pages/PrayerWallDashboard.tsx:28-31`, `pages/PrayerDetail.tsx:21`, `components/prayer-wall/CommentItem.tsx:5`, `lib/prayer-wall/reactionsStore.ts:1`, plus several test files. There is no `services/prayer-wall-storage.ts` to mirror. The brief reframes this spec as creating BOTH the abstraction layer AND the API implementation in the same delivery — and naming the gap explicitly so future Phase 4+ specs (post type expansion) consume the abstraction, not the mocks.

**MPD-2: There is no `services/index.ts` and the project's canonical pattern is not a swap-point.** Phase 2 (`useFaithPoints` dual-write) and Phase 2.5 (`useFriends`, `useSocialInteractions`, `useMutes`) established the pattern: env flag in `lib/env.ts` (returns boolean from strict `'true'` check), the hook reads the flag inline, after the localStorage write the hook fires the API call as fire-and-forget. There is NO `services/index.ts` swap module; the swap is at the call site. Spec 3.10 should follow this established pattern, NOT invent a new `services/index.ts`.

**However**, Phase 3 differs from Phase 2/2.5 in one crucial way: Phase 2 dual-writes events the user already saw locally (the localStorage write IS the user-facing truth; the backend mirror is bookkeeping). Phase 3's Prayer Wall MUST sync across devices — the backend has to BECOME the source of truth when the flag flips, not parallel-mirror. So Spec 3.10's flag has different semantics than the Phase 2/2.5 flags:

- **Phase 2/2.5 flag ON:** localStorage is still source-of-truth; backend gets a copy (dual-write).
- **Phase 3 flag ON:** backend IS source-of-truth; localStorage becomes a fallback / offline cache (read-swap).

This is significant enough to flag explicitly in the spec body so the planner doesn't apply Phase 2/2.5 dual-write patterns by reflex.

**MPD-3: Pagination "wrapped to match the existing localStorage interface" — there is no localStorage pagination interface.** The current implementation does `getMockPrayers().slice(0, 20)` synchronously. Backend pagination is `?page=N&limit=20` with envelope `{ data: PostDto[], pagination: { page, limit, total, hasMore } }`. The brief specifies the new signature as async-with-cursor, NOT a faithful mirror.

**MPD-4: Optimistic update rollback for reactions is correct, but bookmarks need a different model.** Reactions are toggle (on/off, instant local feedback critical). Bookmarks are also toggle but lower-stakes. The master plan body lumps them. The brief separates: reactions get optimistic + rollback (the existing reactive store already does this for localStorage; backend just becomes the persistent backing). Bookmarks get optimistic + rollback. Comments and post creation are NOT optimistic — they're write-then-display-server-response (otherwise crisis classifier results don't reach the user). Edits are NOT optimistic — they need server validation of the edit-window check.

## Recon Ground Truth

All facts verified on the active machine (work laptop, `/Users/eric.champlin/worship-room/`) on 2026-04-29.

**R1 — Backend endpoints inventoried** (from `PostController.java`, `PostCommentController.java`, `QotdController` post-3.9; ~14 routes total):
- `GET /api/v1/posts` — feed (paginated; `page`, `limit`, `category`, `postType`, `qotdId`, `sort`)
- `GET /api/v1/posts/{id}` — single post
- `GET /api/v1/users/{username}/posts` — author's posts (paginated)
- `GET /api/v1/posts/{id}/comments` — comments for a post (paginated)
- `GET /api/v1/users/me/reactions` — reactions map (current user across all posts)
- `GET /api/v1/users/me/bookmarks` — bookmarked posts (paginated)
- `GET /api/v1/qotd/today` — today's QOTD (post-3.9)
- `POST /api/v1/posts` — create (idempotency-key header, returns 201)
- `PATCH /api/v1/posts/{id}` — edit (5-min window, 409 EDIT_WINDOW_EXPIRED past window per Phase 3 Addendum #1)
- `DELETE /api/v1/posts/{id}` — soft delete (204)
- `POST /api/v1/posts/{id}/reactions` — toggle (201 on add, 200 on remove per Spec 3.7 D11)
- `DELETE /api/v1/posts/{id}/reactions?reactionType=` — remove (204)
- `POST /api/v1/posts/{id}/bookmark` — add (201 new, 200 idempotent per Spec 3.7 D5)
- `DELETE /api/v1/posts/{id}/bookmark` — remove (204)
- `POST /api/v1/posts/{id}/comments` — create comment
- `PATCH /api/v1/posts/{id}/comments/{commentId}` — edit comment
- `DELETE /api/v1/posts/{id}/comments/{commentId}` — soft delete comment

**R2 — Backend response envelope.** Single-resource: `{ data: T, meta: { requestId } }`. List: `PostListResponse { data: PostDto[], pagination: { page, limit, total, hasMore }, meta: { requestId } }`. `apiFetch` strips the envelope and returns `data`.

**R3 — Backend `PostDto` shape vs frontend `PrayerRequest` shape — mapping is non-trivial and lossy.** Backend has nested `author: AuthorDto`, plus `postType`, `candleCount`, `scriptureReference`, `scriptureText`, `visibility`, `moderationStatus`, `crisisFlag`, `bookmarkCount`, `updatedAt` that frontend `PrayerRequest` does not have. Frontend has flat `authorName`, `authorAvatarUrl`, `userId`, `isAnonymous`. The mapper `postDtoToPrayerRequest()` is a load-bearing function: it must (a) flatten `author` → `authorName/authorAvatarUrl/userId`, (b) drop `crisisFlag` (UI does not display it; classifier supersession is server-side), (c) drop `moderationStatus` (filter at fetch time — only show `'approved'`), (d) drop `candleCount`, `scriptureReference`, `scriptureText`, `visibility`, `bookmarkCount`, `updatedAt` (UI does not consume them today; preserve in a parallel raw store if Phase 4 needs them, OR extend `PrayerRequest` with optional fields — recon-time decision). See D5.

**R4 — `PrayerComment` shape is closer to backend `PostCommentDto`** but still requires mapping. Backend includes nested author, `editedAt`, `parentCommentId`. Frontend has flat author and no edited/threaded support today. Mapper drops the extra fields.

**R5 — `apiFetch` already exists** at `frontend/src/lib/api-client.ts`. Returns `data` from envelope, throws `ApiError` with `code/status/message`, dispatches `wr:auth-invalidated` on 401 (AuthContext clears auth state). 30s default timeout via `AbortController`. **Use this for all 3.10 calls** — do NOT create a parallel fetch wrapper.

**R6 — `lib/env.ts` flag pattern is canonical.** `isBackendActivityEnabled()`, `isBackendFriendsEnabled()`, `isBackendSocialEnabled()`, `isBackendMutesEnabled()` all return `USE_BACKEND_X === 'true'` (strict, fail-closed). Spec 3.10 adds `isBackendPrayerWallEnabled()` reading `VITE_USE_BACKEND_PRAYER_WALL`. Default `false` until Spec 3.12 cutover.

**R7 — Reactions reactive store** lives at `frontend/src/lib/prayer-wall/reactionsStore.ts` with localStorage key `wr_prayer_reactions`. Shape `Record<string, { isPraying: boolean, isBookmarked: boolean, isCandle: boolean }>`. The `isCandle` field shipped in Spec 3.7. `usePrayerReactions` hook is Pattern A (subscription via standalone hook with `useSyncExternalStore`). **Spec 3.10 does NOT change the store's public surface** — that is Spec 3.11's job. Spec 3.10 only ensures the API path exists and the env-flag gate works.

**R8 — `services/api/friends-api.ts` is the canonical reference** for the `services/api/{feature}-api.ts` pattern. Function-per-endpoint, thin wrappers around `apiFetch`, JSDoc cites the spec ID. Test file at `services/api/__tests__/friends-api.test.ts` uses MSW. **Spec 3.10 mirrors this pattern.**

**R9 — Pre-existing pages that will need updates** (call-site recon):
- `pages/PrayerWall.tsx` — feed listing, infinite scroll behavior, category filter, challenge filter, QOTD highlight band
- `pages/PrayerWallDashboard.tsx` — five tabs (prayers, comments, bookmarks, reactions, settings) — each tab loads from a different endpoint
- `pages/PrayerDetail.tsx` — single post view, comments thread, reactions, bookmark button
- `components/prayer-wall/InlineComposer.tsx` — post creation
- `components/prayer-wall/CommentsSection.tsx` — comment listing + creation
- `components/prayer-wall/QotdComposer.tsx` — QOTD-tagged post creation
- `components/prayer-wall/SaveToPrayersForm.tsx` — bookmark UI
- `components/prayer-wall/InteractionBar.tsx` — toggle pray + light candle + bookmark

**R10 — AuthModal trigger.** `useAuthModal` exposes `openAuthModal()`. Today, gated actions (toggle praying as anonymous, bookmark as anonymous, post) call `openAuthModal()` directly. With backend, anonymous reads work (verified — backend allows null principal on `GET /posts`), but writes return 401 (filter rejects before controller). The `wr:auth-invalidated` event from `apiFetch` fires on 401 from a Bearer token (stale JWT). For "no Bearer token + write attempt," we need a separate flow — see D8.

**R11 — Test harness for MSW.** Friends-api tests at `services/api/__tests__/friends-api.test.ts` use MSW v2 (`http.post`, `http.delete`, `http.patch` from `msw`). Spec 3.10 mirrors that setup. Existing global MSW handlers in `frontend/src/test/mocks/` may already include some endpoints — recon at plan-time, do not assume.

**R12 — Reaction store hydration.** `lib/prayer-wall/reactionsStore.ts` reads from localStorage on module load. Today there is no "hydrate from server" entrypoint. Spec 3.11 owns hydration; Spec 3.10 just ensures `getMyReactions()` API call exists and returns the right shape so 3.11 can wire it.

**R13 — Comment ordering and threading.** Backend returns comments paginated, sorted by `created_at ASC` for a given post. Frontend today renders flat list (no threading). Backend `PostCommentDto.parentCommentId` exists but is null today (Phase 4.4 introduces threading). Spec 3.10's comment fetcher returns flat ordered-by-creation; threading is Phase 4.4's problem.

**R14 — Bookmark idempotency contract.** Backend POST `/bookmark` returns 201 on first add, 200 on duplicate add (Spec 3.7 D5). Frontend optimistic update should treat both as success. The DELETE returns 204 even if the bookmark didn't exist (idempotent unbookmark). API wrapper normalizes both to a void Promise.

**R15 — Reaction toggle return shape.** Backend POST `/reactions` returns `ToggleReactionResponse { state: 'added' | 'removed', prayingCount, candleCount }` with status 201 (added) or 200 (removed). Frontend optimistic update reads `state` to confirm the requested direction was applied.

**R16 — Crisis-flag handling on the read path.** `posts.crisis_flag=true` posts SHOULD be filtered server-side from the feed (Phase 3 Addendum #7 — `CrisisAlertService` is the supersession point). Recon-confirm at plan-time: does `PostService.listFeed` filter by `crisis_flag = false`? If yes, frontend has no work. If no, that's a backend gap and 3.10 should NOT paper over it client-side — escalate as a separate finding.

**R17 — Idempotency-Key header on POST `/posts`.** Backend `PostsIdempotencyService` accepts `Idempotency-Key` header (24h TTL, max 10K entries — Phase 3 Addendum #5 Caffeine bucket). Frontend should generate a `crypto.randomUUID()` per post-creation attempt; duplicate submission returns the same created post.

**R18 — Rate-limit response.** Backend rate-limit-exceeded returns 429 with `Retry-After` header (seconds). `apiFetch` does NOT specifically handle 429 — it surfaces as `ApiError` with `status: 429`. Spec 3.10 maps this to a friendly toast: "Slow down a moment — you can post again in {Retry-After} seconds." Per the project's anti-pressure copy rules: no exclamation points, sentence case, no urgency framing.

## Phase 3 Execution Reality Addendum gates — applicability

| # | Convention | Applies to 3.10? |
|---|---|---|
| 1 | EditWindowExpired returns 409 | **APPLIES** — frontend must surface 409 EDIT_WINDOW_EXPIRED with a friendly toast distinct from generic 4xx |
| 2 | L1-cache trap | N/A — frontend spec, no JPA |
| 3 | `@Modifying` flags | N/A |
| 4 | SecurityConfig method-specific rule ordering | N/A — backend spec is shipped; frontend just calls |
| 5 | Caffeine-bounded bucket pattern | N/A — backend rate-limit/idempotency are shipped |
| 6 | Domain-scoped `@RestControllerAdvice` | N/A |
| 7 | `CrisisAlertService` unified entry | **APPLIES INDIRECTLY** — confirm server filters `crisis_flag=true` from the feed (R16); do NOT papier-over client-side |
| 8 | Schema realities — do NOT recreate | N/A |
| 9 | INTERCESSION ActivityType total = 13 | N/A |
| 10 | `wr_prayer_reactions` shape | **APPLIES** — `isPraying/isBookmarked/isCandle` shape is canonical; mapper from backend `ReactionsResponse` must produce this exact shape |
| 11 | Liquibase filename = today's date + next sequence | N/A — no schema changes |
| 12 | BB-45 cross-mount subscription test | N/A for 3.10 (Spec 3.11 will need to verify the test still passes after store hydration) |

## Decisions and divergences (10 items)

**D1 — Create `services/api/prayer-wall-api.ts` AND `lib/prayer-wall/postMappers.ts`.**
Function-per-endpoint API module mirrors `friends-api.ts` shape. Mapper module isolates the load-bearing `PostDto → PrayerRequest` and `PostCommentDto → PrayerComment` translations. Mapper has its own test file because mapping mistakes are how cross-author data leakage happens; thorough fixtures here are a safety net. Recommended file structure:

```
services/api/prayer-wall-api.ts          # ~17 functions, thin apiFetch wrappers
services/api/__tests__/prayer-wall-api.test.ts  # MSW-backed
lib/prayer-wall/postMappers.ts            # postDtoToPrayerRequest, commentDtoToPrayerComment, reactionsResponseToReactionsMap
lib/prayer-wall/__tests__/postMappers.test.ts
```

**D2 — No `services/index.ts` swap module; flag-gate is at the call site.**
Per MPD-2 above. Each consuming hook / page reads `isBackendPrayerWallEnabled()` inline and branches between `getMockPrayers()` (when false) and `prayerWallApi.listFeed(...)` (when true). This matches the established Phase 2/2.5 convention. The flag default is `false` until Spec 3.12 cutover.

**D3 — Read-swap semantics, not dual-write.**
Per MPD-2 above. When the flag is ON, the backend is the source of truth — reads come from the backend, writes go to the backend. localStorage is NOT written to in parallel. This differs from Phases 2 and 2.5 deliberately: Prayer Wall has cross-device sync requirements that dual-write cannot provide. Document this explicitly in the spec body so the planner does not apply Phase 2/2.5 dual-write reflex.

**Implication for offline behavior:** When the flag is ON and the network fails, reads fall back to whatever was last cached (local IndexedDB or in-memory query cache — recon-time decision, see D7). Writes that fail with NETWORK_ERROR queue for retry OR surface a toast — see D9.

**Implication for cutover:** Spec 3.12 flips `VITE_USE_BACKEND_PRAYER_WALL` from `false` → `true`. After cutover, posts created during the localStorage era are NOT visible. This is acceptable — the seed data only ever existed in dev anyway. Production users have nothing to migrate. Document this in the cutover spec body.

**D4 — Function signatures (the 17-function call surface).**
The `prayerWallApi` exports the following async functions. Names are deliberately verbose to match call-site clarity:

```typescript
// READS
listPosts(params: { page: number; limit: number; category?: PrayerCategory; postType?: PostType; qotdId?: string; sort?: 'bumped' | 'recent' }): Promise<PostListResult>
getPostById(id: string): Promise<PrayerRequest>
listAuthorPosts(username: string, params: { page: number; limit: number; sort?: 'recent' }): Promise<PostListResult>
listComments(postId: string, params: { page: number; limit: number }): Promise<CommentListResult>
getMyReactions(): Promise<Record<string, ReactionEntry>>  // matches reactive-store shape
listMyBookmarks(params: { page: number; limit: number }): Promise<PostListResult>
getTodaysQuotd(): Promise<QuotdQuestion>  // delegates to spec 3.9 endpoint

// POST WRITES
createPost(input: CreatePostInput, idempotencyKey?: string): Promise<PrayerRequest>
updatePost(id: string, input: UpdatePostInput): Promise<PrayerRequest>
deletePost(id: string): Promise<void>

// REACTION WRITES
toggleReaction(postId: string, reactionType: 'praying' | 'candle'): Promise<{ state: 'added' | 'removed'; prayingCount: number; candleCount: number }>
removeReaction(postId: string, reactionType: 'praying' | 'candle'): Promise<void>

// BOOKMARK WRITES
addBookmark(postId: string): Promise<{ created: boolean }>  // false on idempotent re-add
removeBookmark(postId: string): Promise<void>

// COMMENT WRITES
createComment(postId: string, content: string, idempotencyKey?: string): Promise<PrayerComment>
updateComment(postId: string, commentId: string, content: string): Promise<PrayerComment>
deleteComment(postId: string, commentId: string): Promise<void>
```

Where `PostListResult = { posts: PrayerRequest[]; pagination: { page: number; limit: number; total: number; hasMore: boolean } }` and similarly for `CommentListResult`.

**D5 — `PostDto → PrayerRequest` mapping policy: extend `PrayerRequest` with optional new fields, do NOT silently drop.**
Recon (R3) showed backend `PostDto` carries fields the frontend type does not have: `postType`, `candleCount`, `scriptureReference`, `scriptureText`, `visibility`, `moderationStatus`, `crisisFlag`, `bookmarkCount`, `updatedAt`. The naive read says "drop them" but that bites Phase 4 (post type expansion needs `postType`) and Phase 3.7-already-shipped (the `isCandle` field in the reactive store needs `candleCount`).

**Resolution:** extend `frontend/src/types/prayer-wall.ts`'s `PrayerRequest` interface with optional fields:
```typescript
postType?: PostType  // optional; defaults to 'prayer_request' in older code paths
candleCount?: number
bookmarkCount?: number
updatedAt?: string
// scripture fields stay deferred — Phase 4 introduces a Scripture composer
// crisisFlag intentionally NOT exposed — server-side supersession only
// moderationStatus filtered server-side; UI assumes 'approved'
// visibility: defer until Phase 8 friend visibility
```

The mapper passes through the new optional fields when present. Older call sites that don't read them are unaffected. Phase 4.1 (Post Type Foundation) will make `postType` required.

**D6 — `crisisFlag` is intentionally NOT exposed to the frontend.**
Per Phase 3 Addendum #7, `CrisisAlertService` is the supersession point. The server filters `crisis_flag=true` posts from the public feed (R16 plan-time recon required). The mapper drops `crisisFlag` from `PrayerRequest`. Frontend has zero conditional rendering on crisis flags. If R16 reveals the backend does NOT filter, that's a separate Phase 3 backend bug to file as a followup, not a 3.10 client-side fix.

**D7 — Read fallback during NETWORK_ERROR: in-memory query cache only, no IndexedDB persistence.**
Spec 16.1b is dedicated to offline IndexedDB caching. Spec 3.10 should NOT bundle offline persistence. The fallback for a read that hits NETWORK_ERROR while the flag is on:
1. If the requested data was successfully fetched earlier in the session, render the cached version.
2. If never fetched, render `OfflineNotice` (which already exists at `components/pwa/OfflineNotice.tsx`).
3. Surface a small "couldn't refresh" toast.

Implementation: a simple `Map<string, { data: T; fetchedAt: number }>` keyed by URL+params, scoped to the `prayerWallApi` module's lifetime (cleared on page reload). No persistence.

**D8 — AuthModal trigger logic for write attempts when not authenticated.**
Three states matter:
1. **Authenticated with valid JWT** — call backend, all good
2. **Authenticated with stale JWT** — backend returns 401, `apiFetch` clears token + dispatches `wr:auth-invalidated`, AuthContext logs out, page re-renders unauthenticated state, user sees AuthModal on next gated action
3. **Anonymous (no JWT)** — frontend should NOT call backend; intercept BEFORE the API call and call `openAuthModal()` directly

The wrapper around each write function checks `getStoredToken() !== null`. If null AND the action is gated, throw a typed `AnonymousWriteAttemptError` BEFORE the network call. Call sites catch this specific error type and call `openAuthModal()`. This matches existing UX — anonymous users today see AuthModal when they tap pray-toggle.

Reads that work for anonymous users (`listPosts`, `getPostById`) don't trigger AuthModal — they just call the backend with no Bearer token (R10 confirmed backend allows null principal).

**D9 — Toast taxonomy for write failures.**
Map `ApiError` → toast copy (anti-pressure compliant: sentence case + period, no exclamation, no urgency unless honestly time-bounded):

| Error condition | Toast copy |
|---|---|
| `ApiError(NETWORK_ERROR, 0)` (timeout / offline) | "We couldn't reach the server. Try again in a moment." |
| `ApiError(*, 429)` with Retry-After header | "Slow down a moment. You can post again in {N} seconds." (use the helper from `02-security.md` rate-limit-message format) |
| `ApiError(EDIT_WINDOW_EXPIRED, 409)` | "This post is past the 5-minute edit window." |
| `ApiError(VALIDATION_FAILED, 400)` | "Something in your post needs another look. {server message}" |
| `ApiError(*, 401)` | (no toast — `wr:auth-invalidated` already triggers AuthModal) |
| `ApiError(*, 403)` | "You don't have permission to do that." |
| `ApiError(*, 404)` | "That post is no longer available." |
| `ApiError(*, 500+)` | "Something went wrong on our end. Try again in a moment." |
| Unknown error | "Something went wrong. Try again in a moment." |

**Important correction to the original brief's "save locally" toast:** in read-swap mode (D3), the frontend doesn't actually save locally on network error — that message would promise something it doesn't deliver. The replacement copy ("We couldn't reach the server. Try again in a moment.") is pinned in the table above. Keep the offline-write-queueing for Spec 16.1b/16.2.

**D10 — Optimistic vs server-confirmed write paths (per-action policy).**

| Action | Optimistic? | Rationale |
|---|---|---|
| Toggle praying | YES | Reactions are toggle, sub-100ms perceived feedback is critical, rollback is straightforward (re-toggle) |
| Toggle candle | YES | Same as praying |
| Add/remove bookmark | YES | Toggle, low stakes, rollback is straightforward |
| Create post | NO | Server response carries the canonical id, `crisisFlag` may flag it, idempotency-key flow needs server ack |
| Edit post | NO | Server validates 5-min window (409 EDIT_WINDOW_EXPIRED) |
| Delete post | YES (soft) | Hide locally immediately, restore on error |
| Create comment | NO | Server may flag for crisis; comments display server-confirmed content |
| Edit comment | NO | Same edit-window check (409) |
| Delete comment | YES (soft) | Same as delete post |

For the YES-optimistic actions: maintain a `pendingMutations: Set<string>` in the consumer hook. On rollback, revert state and toast. **Note:** the consumer-hook mutation state is Spec 3.11's surface, not 3.10's. Spec 3.10 only ships the API functions; 3.11 wires the optimistic + rollback logic at the hook layer.

## Watch-fors (29 items — XL/High earns extensive coverage)

1. **Cross-author data leakage in mapper** — `postDtoToPrayerRequest` must NEVER mix author fields between two `PostDto` instances. Test with a fixture array of 5 different authors and assert each output `PrayerRequest` matches its input by id.

2. **Reactions map shape parity with reactive store** — `reactionsResponseToReactionsMap` MUST output exactly `Record<string, { isPraying: boolean; isBookmarked: boolean; isCandle: boolean }>`. Field names are `is*`-prefixed (Phase 3 Addendum #10). Bookmarks come from a separate endpoint; merging into the same map is the consumer hook's job (3.11), not 3.10's.

3. **`getMyBookmarks` is a different endpoint than `getMyReactions`** — bookmarks are NOT reactions in the backend. The frontend reactive store conflates them in a single `wr_prayer_reactions` map; the API exposes them separately. Do not route bookmarks through the reactions endpoint.

4. **Idempotency-Key generation timing** — generate ONE key per user-initiated post submission, NOT per retry. If the user types and clicks "Post" once, that's one key; if the apiFetch call retries internally (it doesn't today, but defensively), it MUST send the same key. Generate the key in the consumer hook BEFORE the API call, pass it explicitly.

5. **Pagination boundary semantics** — `hasMore: false` from backend means stop scrolling. Do not interpret an empty page as the end if `hasMore: true` (rare but possible due to filters + permissions).

6. **Sort key passthrough** — `sort=bumped` (last_activity_at desc) vs `sort=recent` (created_at desc). Backend defaults to `bumped` for feed, `recent` for author posts. Frontend should default to `bumped` for the main feed (matches existing UX).

7. **Anonymous read with stale JWT** — if user has a stale JWT but the read endpoint allows anonymous, `apiFetch` will still send the Bearer token, get a 401, and dispatch `wr:auth-invalidated`. This silently logs them out mid-read. Mitigation: for endpoints that allow anonymous (R10), call apiFetch with `skipAuth: true` when the consumer is in an explicit "browse anonymously" mode. Recon at plan time: how does the app distinguish "I'm intentionally anonymous" from "I'm logged in but my JWT expired"? Current code just checks `isAuthenticated`. May need a small protocol decision.

8. **Comment ordering** — backend returns ASC by created_at; frontend may render newest-first. Confirm at plan time which order the existing UI uses. If newest-first, the API wrapper SHOULD NOT reverse the array — the consumer hook does, so cursor pagination still works.

9. **MSW handler registration** — global handlers in `frontend/src/test/mocks/` may already define some endpoints (e.g., `/api/v1/posts`). Per-test handlers OVERRIDE globals. Plan-time recon: enumerate existing global handlers; spec-3-10 tests should override only what they need.

10. **`IdempotencyKeyMismatchException`** is a backend exception (R17 — already exists) returning 409. If the frontend somehow sends the same Idempotency-Key with a DIFFERENT body, the backend rejects with 409 IDEMPOTENCY_KEY_MISMATCH. This should never happen in practice (each user-post-attempt generates a fresh UUID) but the toast should treat it as "Try again" since the user has no way to recover.

11. **Anonymous post writes** — `is_anonymous: true` is a flag on the create body, NOT a session-level state. Do not conflate with "user is anonymous" (no JWT). Anonymous posts are posts authored BY a logged-in user where they choose to hide their name. Authentication is still required.

12. **Reaction toggle race** — user double-taps pray button. Without guarding, two concurrent POST `/reactions` calls may interleave: result depends on backend order. Mitigation: consumer hook tracks `pendingMutations` per `(postId, reactionType)`; while pending, ignore additional taps. This is a 3.11 concern (the hook owns mutation state), but document the contract here so 3.11 has a clear spec.

13. **Bookmark double-tap** — same race shape. Same mitigation in 3.11.

14. **Comment max length** — backend enforces 1000 chars (Spec 3.6 ContentTooLongException returns 400). Frontend should pre-validate to avoid the round-trip. Read the limit from a shared constant (recon at plan time: does Spec 3.5/3.6 expose the limit via OpenAPI components? If not, hardcode and add a TODO followup.).

15. **Post content max length** — backend enforces 2000 chars for prayer requests (Spec 3.5). Phase 4.3 raises to 5000 for testimonies. Frontend should read the limit per-post-type (the constant exists in `constants/prayer-wall.ts` or similar — recon to confirm).

16. **Composer state on post-creation success** — clear the form, show the new post at top of feed. Implementation in 3.11 (consumer); 3.10 just returns the created `PrayerRequest`.

17. **Composer state on post-creation failure** — preserve the user's input. Show toast. Allow retry. The Idempotency-Key should be REGENERATED on retry only if the user edited the content; if they retry the exact same content, reuse the key (deduplicates on server).

18. **Edit window timer** — UI today shows a countdown (recon to confirm). Backend's edit window is 5 minutes from `created_at`. Server time vs client time skew: trust the server (PATCH returns 409 past the window). Don't disable the edit button client-side based on local clock; let the server reject.

19. **Cross-tab sync** — if the user has two tabs open and posts in tab A, tab B doesn't auto-update. localStorage's storage event would handle this in dual-write mode but does nothing in read-swap. Out of scope for 3.10; potential followup. Document in spec body.

20. **Profile/dashboard tabs use different endpoints** — `PrayerWallDashboard.tsx`'s five tabs (prayers, comments, bookmarks, reactions, settings) need: `listAuthorPosts(myUsername)` for prayers, no endpoint for "my comments" yet (gap — flag for plan-time recon; may be Phase 8 territory), `listMyBookmarks` for bookmarks, `getMyReactions` for reactions. The "my comments" tab may need to render N/A in flag-on mode until that endpoint ships.

21. **Reactions tab semantics** — what does "my reactions" tab show? Today it likely renders posts the user has prayed-for. Backend `getMyReactions` returns a map of `postId → { isPraying, isCandle }`. To render the tab, the frontend must (a) fetch the reactions map, (b) for each post in the map with at least one `true`, fetch the post. That's an N+1. Plan-time decision: does the dashboard need a dedicated `GET /api/v1/users/me/reacted-posts` endpoint (paginated) instead? Recommend YES, defer to a Phase 8 spec, and render the tab as N/A in flag-on mode for 3.10.

22. **QOTD-tagged post creation** — `qotdId` is a CreatePostRequest field. Today the QotdComposer passes the current QOTD id; that flow continues unchanged.

23. **Challenge-tagged post creation** — `challengeId` is a CreatePostRequest field. Same shape as `qotdId`.

24. **Field naming: `qotdId` snake/camel** — frontend uses `qotdId` (camelCase); backend OpenAPI emits camelCase too (`@JsonProperty` defaults). No conversion needed.

25. **`scripture_reference` and `scripture_text` are present in backend but unused in frontend today** — these come from Spec 3.5 (post composition). The frontend composer doesn't have a scripture picker yet. Per D5, mapper passes them through optionally so Phase 4 doesn't need a re-shape.

26. **Empty-feed UX** — when `listPosts` returns zero posts (e.g., category filter with no matches), the existing `FeatureEmptyState` component is used. Same component works in flag-on mode.

27. **Loading states** — every async-converted call site needs a loading state. Existing skeletons in `components/skeletons/` may already cover this (`PrayerCardSkeleton`?); recon at plan time. If not, this scope expands — flag explicitly. (Could be a Spec 1.9b followup if gaps surface.)

28. **Test fixture builder discipline** — write a `buildPostDto(overrides?)` and `buildPostListResponse({ posts, pagination })` helper to avoid 100 lines of inline JSON in each test. Ditto for comments. Mirror the friends-api test conventions.

29. **`useEffect` cleanup on unmount** — every consumer hook that fires fetch on mount needs an `AbortController` to cancel if the component unmounts mid-fetch (avoids React state updates on unmounted components). `apiFetch` accepts a signal — wire it through.

## Test specifications (target ~40-50 tests, master plan AC says ≥25)

The master plan AC is "≥25 tests covering both flag states with MSW mocks." That's the floor. For an XL/High MAX-effort spec touching every Prayer Wall data path, recommend ~40-50 tests split across:

**API module tests (`prayer-wall-api.test.ts`)** — ~25 tests
- listPosts: success, empty, paginated next-page, with category filter, with postType filter, with qotdId filter, with sort, with anonymous (no JWT), with stale JWT (401 → wr:auth-invalidated), 500 error → ApiError
- getPostById: success, 404, 401-with-stale-JWT
- listComments: success, empty, paginated
- getMyReactions: success (returns map shape), 401
- listMyBookmarks: success, empty, paginated
- createPost: success with idempotency key, 400 validation, 429 rate limit (with Retry-After), idempotent re-submit returns same post, anonymous-write rejection
- updatePost: success, 409 EDIT_WINDOW_EXPIRED, 403 not-author
- deletePost: success (204), 403, 404
- toggleReaction: success added (201), success removed (200), 429
- addBookmark: success (201), idempotent (200)
- removeBookmark: success (204), idempotent (no-op 204)
- createComment: success, 400 too long, anonymous-write rejection
- updateComment: success, 409 EDIT_WINDOW_EXPIRED
- deleteComment: success, 403

**Mapper module tests (`postMappers.test.ts`)** — ~10 tests
- postDtoToPrayerRequest: nested author flattens correctly, no cross-author leakage in array, optional fields preserved, crisisFlag dropped, scripture fields preserved
- commentDtoToPrayerComment: nested author flattens, parentCommentId preserved, editedAt preserved
- reactionsResponseToReactionsMap: empty input, single post, multiple posts, isCandle present, isCandle missing (defaults false)

**Integration touchpoints (light, in 3.10 scope)** — ~5-10 tests
- env flag default false (calls go to mock)
- env flag true (calls go to API)
- AnonymousWriteAttemptError throws when no JWT and write attempted
- Toast taxonomy: each ApiError type produces the expected toast copy (test the helper that maps ApiError → toast props, not the actual toast UI)

## Files to create

```
frontend/src/services/api/prayer-wall-api.ts
frontend/src/services/api/__tests__/prayer-wall-api.test.ts
frontend/src/lib/prayer-wall/postMappers.ts
frontend/src/lib/prayer-wall/__tests__/postMappers.test.ts
frontend/src/lib/prayer-wall/apiErrors.ts          # toast-copy mapping helper + AnonymousWriteAttemptError
frontend/src/lib/prayer-wall/__tests__/apiErrors.test.ts
```

## Files to modify

```
frontend/src/lib/env.ts                  # add isBackendPrayerWallEnabled()
frontend/.env.example                    # add VITE_USE_BACKEND_PRAYER_WALL=false (default)
frontend/src/types/prayer-wall.ts        # extend PrayerRequest with optional Phase 3.7+ fields per D5
```

## Files explicitly NOT modified (deferred to Spec 3.11)

- `frontend/src/lib/prayer-wall/reactionsStore.ts` — store hydration is 3.11
- `frontend/src/hooks/usePrayerReactions.ts` — consumer hook update is 3.11
- `frontend/src/pages/PrayerWall.tsx` and other pages — call-site swaps to API are 3.11
- `frontend/src/components/prayer-wall/*` — consumer rewires are 3.11

This split is critical: 3.10 lays the abstraction; 3.11 wires consumers. Splitting two XL/L specs into two PRs keeps blast radius bounded. The cutover (3.12) is independent.

## Acceptance criteria (extends master plan body)

The master plan body's 9 AC items are the floor. Additions for the MAX-effort framing:

- [ ] All 17 API functions implemented with matching signatures (D4)
- [ ] Flag default `false` in `.env.example`
- [ ] Flag off: existing localStorage / mock behavior unchanged (regression check via existing PrayerWall page tests)
- [ ] Mapper produces exact `Record<string, { isPraying, isBookmarked, isCandle }>` shape for `getMyReactions` (Phase 3 Addendum #10)
- [ ] Mapper drops `crisisFlag` from output (Phase 3 Addendum #7)
- [ ] Mapper passes through `postType`, `candleCount`, `bookmarkCount`, `updatedAt`, `scriptureReference`, `scriptureText` as optional fields on `PrayerRequest` (D5)
- [ ] Idempotency-Key generated by frontend per post-create attempt (R17)
- [ ] AnonymousWriteAttemptError thrown before any write API call when no JWT present (D8)
- [ ] Toast copy taxonomy maps ApiError → friendly anti-pressure message per D9 table
- [ ] 409 EDIT_WINDOW_EXPIRED produces a distinct toast from generic 4xx (Phase 3 Addendum #1)
- [ ] 429 with Retry-After uses the rate-limit-message format from `02-security.md`
- [ ] At least 40 tests covering API module + mapper + error handler (master plan says ≥25; brief argues 40+ for MAX-effort coverage)
- [ ] No call-site changes outside `lib/env.ts`, `.env.example`, `types/prayer-wall.ts` (3.11 owns consumer rewires)
- [ ] OpenAPI types regenerated and used as the source-of-truth for backend response shapes wherever possible (Universal Rule 4)

## Out of scope (deferred to other specs)

- Reactive store backend hydration (Spec 3.11)
- Consumer hook rewires (`usePrayerReactions`, page-level fetches) (Spec 3.11)
- Cutover flag flip + manual smoke test + a11y evidence (Spec 3.12)
- Offline write queue (Spec 16.2)
- IndexedDB read-cache (Spec 16.1b)
- Cross-tab sync (open question — followup)
- "My comments" dashboard tab endpoint (gap — Phase 8 territory)
- "My reacted-posts" paginated endpoint (gap — Phase 8 territory)
- Threaded comment replies (Phase 4.4)

## Brand voice / Universal Rules quick reference (3.10-relevant)

- Rule 4: TypeScript types from OpenAPI (`pnpm openapi:generate` regenerates `types/api/`). Manual hand-typing of API response shapes is ONLY allowed if the OpenAPI generator hasn't been run for that endpoint yet (recon at plan time).
- Rule 11: Brand voice — pastor's-wife test on every toast string in D9 taxonomy.
- Rule 12: Anti-pressure copy — no exclamation points, sentence case + period, no urgency framing in error messages. The 429 "slow down" toast walks the line; the friendly tone is intentional, no urgency.
- Rule 14: Plain text only for user-generated content. Comments + post content render as `white-space: pre-wrap`. No markdown rendering. (3.10 doesn't change rendering, but the API layer must NOT silently sanitize or strip whitespace.)
- Rule 15: Rate limiting on ALL endpoints — backend already handles; frontend toasts the 429 friendly message.

## Tier rationale

MAX, not xHigh. The user-safety boundaries:
1. **Cross-author data leakage** — mapper bug → wrong author shown on a prayer request. This is the worst-case Prayer Wall failure mode.
2. **Crisis classifier supersession bypass** — if mapper exposes `crisisFlag` and a UI conditional misuses it, posts that should be hidden become visible.
3. **Anonymous-write privilege escalation** — if the AuthModal trigger is wrong, anonymous users could attempt writes that hit the backend, triggering rate-limits scoped to no-user-id buckets.
4. **Optimistic rollback correctness** — bug in rollback logic shows the user "your prayer was posted" when it wasn't (or vice versa).

These are not "code review will catch" risks; they're "deeply test, multiple recon passes, and Eric reviews the mapper code line-by-line" risks. MAX is correct.

## Recommended planner instruction

When invoking `/plan-forums`, run the **Plan Tightening Audit** (per the post-Pass-3 plan-forums skill) with extra scrutiny on these lenses:
- Lens 5 (SecurityConfig rule ordering) — N/A backend-side; ensure frontend AnonymousWriteAttemptError fires correctly
- Lens 6 (validation surface) — ensure mapper validates inputs, not just relies on backend
- Lens 7 (Pattern A clarification) — `usePrayerReactions` is Pattern A; 3.10 must not break the contract
- Lens 8 (BB-45 cross-mount test) — verify after 3.11; flag for 3.11
- Lens 10 (test count vs brief) — brief target 40-50; the master plan body says ≥25; document the overrun explicitly
- Lens 15 (crisis content via CrisisAlertService) — confirm via plan-time recon that backend filters `crisis_flag=true` from feed (R16)
