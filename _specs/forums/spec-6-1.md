# Forums Wave: Spec 6.1 — Prayer Receipt

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 6.1 (lines 4872–5034). Master plan body is unusually detailed (163 lines, full Copy Deck, full Anti-Pressure Design Decisions block, 22 ACs).
**Source Brief:** `_plans/forums/spec-6-1-brief.md` (authored 2026-05-12, 1730 lines — **brief is binding for design intent; brief wins over master plan body where they diverge** per MPD-1 through MPD-10; this spec's Recon Reality Overrides win over brief where brief's recon is wrong on disk; rules-file standards in `.claude/rules/01-ai-safety.md`, `02-security.md`, `06-testing.md`, `07-logging-monitoring.md`, `09-design-system.md`, `11-local-storage-keys.md` win over both brief and spec on cross-cutting conventions).
**Branch:** `forums-wave-continued` (long-lived working branch — Eric handles all git operations manually; CC must NOT run any git mutations at any phase: no `git checkout`, no `git commit`, no `git push`, no `git stash`, no `git reset`, no `gh pr create`. Only read-only inspection — `git status`, `git diff`, `git log`, `git show` — is permitted. See brief § 1 / W1.).
**Date:** 2026-05-12.

---

## Affected Frontend Routes

6.1 is full-stack (frontend + backend + new frontend dependency `html2canvas`). The user-facing surface spans Prayer Wall routes and the Settings page. `/verify-with-playwright` is **REQUIRED** after `/code-review` (brief § 3, Section 16).

- `/prayer-wall/:postId` — author view (receipt renders above `<InteractionBar>` when `praying_count > 0`); non-author view (receipt absent — only aggregate count visible in InteractionBar)
- `/prayer-wall/dashboard` — author view (mini-receipt summary on own posts: count + scripture verse, no avatars per D-Dashboard-mini)
- `/settings` — `prayerReceiptsVisible` toggle + helper copy (exact route path confirmed at plan recon per R10)

Plus an internal/transient surface that doesn't have a route:

- `PrayerReceiptModal` mounts on top of `/prayer-wall/:postId` when the author taps the receipt count
- `PrayerReceiptImage` mounts hidden off-screen during PNG generation (`html2canvas` captures it; component unmounts after capture per W34)

---

## Metadata

- **ID:** `round3-phase06-spec01-prayer-receipt`
- **Phase:** 6 (Engagement Features — 6.1 is the first spec of Phase 6 and the single most emotionally resonant feature on Prayer Wall; sets the brand-voice and privacy-model bar for the entire phase)
- **Size:** L (per master plan; brief ratifies — three new frontend components + new hook + new constants file + new backend controller/service/DTO + new rate-limit service + Liquibase-free + new frontend dep + 40+ tests)
- **Risk:** Medium (per master plan; brief ratifies — emotionally-loaded feature; getting the privacy model wrong causes real harm; the "empty receipt" anti-pressure case is easy to get wrong; brief Section 14 lays out the four risk surfaces)
- **Tier:** **xHigh** (per brief § 2 / § 14 — privacy model with multiple subtle requirements that interact in user-harm ways if any single rule fails + brand-defining external surface in the shareable PNG + HUMAN-IN-THE-LOOP scripture curation (Gate-29 HARD BLOCK) + anti-pressure design is load-bearing copy. xHigh is the right tier; High would understate the design-judgment surface; MAX is reserved for override moments. Override-to-MAX moments enumerated in brief § 2 and § 14)
- **Prerequisites:**
  - **5.6 (Redis Cache Foundation) ✅** — shipped per `_forums_master_plan/spec-tracker.md` row 78 (brief authored when 5.6 was ⬜; 5.6 has since shipped, so 6.1 execution is unblocked on the Redis dependency). See **R-OVR-S1** below.
  - **Phase 5 complete (5.0 through 5.6 all ✅)** — verified per `_forums_master_plan/spec-tracker.md` rows 72.5–78. PrayerCard FrostedCard migration (5.1), BackgroundCanvas at PW root (5.2), 2-line heading treatment (5.3), animation token migration (5.4), deprecated pattern purge (5.5), Redis cache foundation (5.6) — all shipped. See **R-OVR-S1**.
  - **`posts` table with `praying_count` denormalized column** — verified at `backend/src/main/resources/db/changelog/2026-04-27-014-create-posts-table.xml` (brief R4).
  - **`post_reactions` table with composite PK on `(post_id, user_id, reaction_type)` and CHECK constraint on `reaction_type IN ('praying', 'candle')`** — verified at `backend/src/main/resources/db/changelog/2026-04-27-016-create-post-reactions-table.xml` (brief R3).
  - **`PrayerCard.tsx` exists** — verified at `frontend/src/components/prayer-wall/PrayerCard.tsx` (brief R5 implication).
  - **`InteractionBar.tsx` exists with `prayer` + `reactions` props** — verified at `frontend/src/components/prayer-wall/InteractionBar.tsx` (brief R5).
  - **Frontend stack: React 18.3 + Vite 5.4 + TypeScript 5.6 + Tailwind 3.4; native fetch; NO React Query / Jotai / axios / SWR** — verified per brief R1.
  - **`html2canvas` is NOT in `frontend/package.json`** — confirmed at spec authorship (brief R2). Adding it is a NEW dependency for 6.1, with a HARD ≤30KB gzipped delta budget enforced by Gate-30 (brief § 6 / Test 11).
  - **Mock seed data exists at Liquibase changeset 021** — verified at `backend/src/main/resources/db/changelog/contexts/2026-04-27-021-prayer-wall-mock-seed.xml` (brief R6).
  - **Eric's 60-WEB-verse curation (Gate-29 HARD BLOCK)** — ⬜ pending. Eric curates and places at `frontend/src/constants/prayer-receipt-verses.ts` before `/execute-plan-forums` runs. Plan recon designs the ratification handoff mechanism. See brief § 4 MPD-4, § 6 Gate-29, § 8 W4.

---

## Recon Reality Overrides (2026-05-12)

**This section is the gate where brief recon meets disk reality at spec authorship.** Pattern follows Spec 3.7 § Recon R1/R2/R3, Spec 5.5 § Recon Reality Overrides, and Spec 5.6 § R-OVR. The codebase wins on facts; the brief's design intent (D-FetchPattern through D-Wordmark; MPD-1 through MPD-10; W1 through W49; the 35 gates) is preserved verbatim except where an R-OVR explicitly supersedes a VERIFIED claim.

### R-OVR-S1 — Phase 5 status: 5.6 has shipped (brief said ⬜; tracker says ✅)

**Brief § 8 W2:** *"5.6 status: ⬜. The 6.1 spec can be AUTHORED in parallel (specs serialize separately from execution), but `/execute-plan-forums spec-6-1` is BLOCKED until 5.6 ships and merges to `forums-wave-continued`."*

**Brief § Prerequisites (line 1711):** *"⬜ 5.6 must ship before 6.1 execution (W2); spec can be written in parallel."*

**Disk reality at spec authorship (2026-05-12):** `_forums_master_plan/spec-tracker.md` row 78 shows **5.6 Redis Cache Foundation = ✅**. All of Phase 5 (5.0, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6) is ✅. The Phase 5 W3 block is also resolved.

**Override disposition:** 6.1 is **unblocked for execution on the Phase 5 / 5.6 dependency.** Gate-29 (verse curation) remains the load-bearing pre-execute HARD BLOCK. Other than that, `/plan-forums spec-6-1` can be followed directly by `/execute-plan-forums spec-6-1` once Gate-29 is satisfied. Plan recon ratifies this finding by re-checking `spec-tracker.md` at plan time.

**Brief design intent preserved.** W2 and W3 codify the dependency direction (6.1 needs Redis cache to exist); 5.6 having shipped just means the dependency is met. No design change.

### R-OVR-S2 — `PrayerWallDashboard.tsx` lives in `frontend/src/pages/`, not `frontend/src/components/prayer-wall/`

**Brief § 10 MODIFY:** *"`frontend/src/components/prayer-wall/PrayerWallDashboard.tsx` — add mini-receipt summary on own posts list (D-Dashboard-mini; plan recon reads layout per R9)"*.

**Brief R9 (PLAN-RECON-REQUIRED):** *"The brief author did not read `frontend/src/components/prayer-wall/PrayerWallDashboard.tsx`."* — i.e., the brief flagged this as plan-recon-required.

**Disk reality at spec authorship:** PrayerWallDashboard lives at `frontend/src/pages/PrayerWallDashboard.tsx`. The `frontend/src/components/prayer-wall/PrayerWallDashboard.tsx` path does not exist.

**Override disposition:** The path in brief § 10 MODIFY is corrected to **`frontend/src/pages/PrayerWallDashboard.tsx`**. The brief's design intent (D-Dashboard-mini: count + scripture verse, no avatars, no friend names) is preserved verbatim. Plan-time recon (the upgraded R9 below) reads the file at the corrected path to catalog its layout and pick the mini-receipt insertion point.

The corresponding test file location at brief § 10 ("`frontend/src/components/prayer-wall/__tests__/PrayerWallDashboard.test.tsx`") is similarly corrected to follow the actual page location — plan recon picks `frontend/src/pages/__tests__/PrayerWallDashboard.test.tsx` if a test file already exists there, or creates it at that path if not.

### R-OVR-V1 through R-OVR-V6 — VERIFIED brief claims ratified at spec authorship

All six VERIFIED items in brief § 5 (R1 through R6) were re-verified on disk at spec authorship:

- **R1 Frontend stack: native fetch, no React Query/Jotai/axios** — ratified. `frontend/package.json` matches brief's dependency list.
- **R2 No `html2canvas` / `dom-to-image-more` in deps** — ratified. Adding `html2canvas` is a NEW dependency for 6.1 (Gate-30 budget).
- **R3 `post_reactions` table schema** — ratified. `backend/src/main/resources/db/changelog/2026-04-27-016-create-post-reactions-table.xml` exists; composite PK on `(post_id, user_id, reaction_type)` per master plan Decision 4.
- **R4 `posts.praying_count` denormalized column** — ratified. `backend/src/main/resources/db/changelog/2026-04-27-014-create-posts-table.xml` exists with the column.
- **R5 `InteractionBar.tsx` + `PrayerCard.tsx` exist at expected paths** — ratified.
- **R6 Mock seed data at changeset 021** — ratified.

### R-OVR-N1 — All 6.1 new-file paths confirmed clean

**Disk reality at spec authorship:** confirmed via filesystem check that 6.1's planned new files do NOT exist:

- `frontend/src/components/prayer-wall/PrayerReceipt.tsx` — does not exist ✓
- `frontend/src/components/prayer-wall/PrayerReceiptModal.tsx` — does not exist ✓
- `frontend/src/components/prayer-wall/PrayerReceiptImage.tsx` — does not exist ✓
- `frontend/src/hooks/usePrayerReceipt.ts` — does not exist ✓
- `frontend/src/constants/prayer-receipt-verses.ts` — does not exist ✓ (Gate-29: Eric's curated 60-verse list lands here)
- `backend/src/main/java/com/worshiproom/post/PrayerReceiptController.java` — does not exist ✓
- `backend/src/main/java/com/worshiproom/post/PrayerReceiptService.java` — does not exist ✓
- `backend/src/main/java/com/worshiproom/post/PrayerReceiptShareRateLimitService.java` — does not exist ✓ (per brief D-RateLimit-pattern; this is the additional new file the brief added beyond master plan)

The DTO at `backend/src/main/java/com/worshiproom/post/dto/PrayerReceiptResponse.java` and the integration test at `backend/src/test/java/com/worshiproom/post/PrayerReceiptIntegrationTest.java` are likewise new. Plan recon re-verifies before execute begins.

### R-OVR-N2 — Brief R7 through R16 are deferred to plan-time recon

Items R7 (friend-relationship schema), R8 (PrayerCard.tsx structure read), R9 (PrayerWallDashboard.tsx structure read — at the **corrected path per R-OVR-S2**), R10 (Settings page location), R11 (`wr_settings` localStorage shape), R12 (existing fetch hook patterns), R13 (anonymous-post implementation), R14 (crisis-flag handling), R15 (existing reaction-toggle service for `@CacheEvict` placement), and R16 (existing PostController structure) remain PLAN-RECON-REQUIRED as the brief flagged them. They are NOT overrides at spec time. Plan-time CC reads each at plan time and records findings; if any contradicts a D-decision, plan files an R-OVR there.

**The R7 friend-schema recovery paths** (brief Section 5 R7): Path A (depend on Phase 2.5 shipping) or Path B (fallback to friends-list-always-empty, every intercessor renders as "A friend") — plan recon picks based on disk reality. Both are anti-pressure-compliant per brief D-Friend-fallback.

---

## Goal

When someone taps "Praying" on a Prayer Wall post, the author sees a tangible **prayer receipt** — "3 people are praying for you" — at the top of their own post detail page. This converts "I'll pray for you" (a phrase that often comes and goes without follow-through) into specific, dated, **private** proof that real intercession happened. The receipt is the single most emotionally resonant Prayer Wall feature and is the thing users are most likely to screenshot and save during hard seasons. The shareable PNG output (rendered client-side via `html2canvas`) extends that artifact externally — a small, brand-quality card carrying the count, a curated scripture verse, and the Worship Room wordmark.

Three properties make this xHigh tier rather than High:

1. **The privacy model has multiple subtle requirements that interact in user-harm ways if any single rule fails.** Hidden at zero intercessors. Non-friend intercessors NEVER named to the author. Non-authors get a 403 from the server, full stop. Aggregate count is the SAME regardless of viewer (no inference possible). Author can dismiss receipts via Settings; off-state shows zero shaming copy. Failure on any one of these violates user trust.
2. **The shareable PNG is brand-defining external surface.** Users post it to Instagram and send it to friends; the Worship Room wordmark appears on it. The typography, scripture italic treatment, and copy choices set the brand voice externally in a way that exceeds ordinary UI work.
3. **The 60 curated scripture verses are HUMAN-IN-THE-LOOP curation.** They are not Claude-generated; Eric curates them in a separate session per brief D-Verses. Each verse must pass the gift-not-guilt test. Gate-29 is a HARD BLOCK on `/execute-plan-forums`.

Anti-pressure design is load-bearing copy, not boilerplate. Receipt HIDDEN at zero intercessors (no "be the first to pray" empty state). No growth chart, no leaderboard, no historical receipt aggregation, no comparison framing, no urgency framing, no reciprocity prompting. Scripture is a gift, never a guilt-trip. The settings toggle's off-state is silent. The receipt count never drives a metric the user is encouraged to grow.

---

## Approach

Prayer Receipts are a **derived view** over `post_reactions` (rows where `reaction_type = 'praying'`), surfaced through a new dedicated `<PrayerReceipt>` component that the post author sees at the top of their own post detail page. **No new database tables, no schema changes** — the existing `posts.praying_count` denormalized counter (per master plan Decision 4) provides the aggregate count for free, and `post_reactions` provides the per-user attribution data for the modal. A thin backend endpoint queries both, classifies intercessors as friends-vs-non-friends server-side, and returns a wire format that **never carries non-friend identity data**. The frontend renders what it receives.

### Substack 1 — Backend endpoint `GET /api/v1/posts/{id}/prayer-receipt`

**Hard 403 gate.** `PrayerReceiptController` authenticates the request (existing JWT filter), then verifies `requester.user_id == post.author_id`. Non-authors receive **403** — and the response body contains zero intercessor data (Gate-31). This gate is the primary control; the frontend conditional that hides the receipt for non-authors (W30) is defense in depth, not the load-bearing barrier.

**Response shape (canonical per brief D-Friend-detection / Gate-32):**

```typescript
type PrayerReceiptResponse = {
  total_count: number;
  attributed_intercessors: Array<{
    user_id: string;        // friend's UUID
    display_name: string;   // friend's display name
    avatar_url: string | null;
  }>;
  anonymous_count: number;  // non-friend intercessors (count only)
};
// invariant: total_count == attributed_intercessors.length + anonymous_count
```

Non-friend user_ids, display names, and avatar URLs are **never on the wire.** Privacy by construction: a bug in the frontend cannot leak what the frontend never receives.

`PrayerReceiptService` performs the SQL: select `posts.praying_count` (for `total_count`), then join `post_reactions` (filtered to `reaction_type = 'praying'`) with the friendship table to enumerate friends-of-the-author who reacted. Non-friend reactors contribute only to `anonymous_count`. The exact join shape depends on **R7** — see Recon-Required items below.

**Server-side response envelope follows the standard data/meta shape** per master plan AC (`{ data: {...}, meta: { requestId } }`). The wire shape above is the `data` block.

### Substack 2 — Redis caching with atomic invalidation (brief D-Cache-invalidation / MPD-5)

`PrayerReceiptService.getReceipt(postId)` is annotated `@Cacheable("prayer-receipt", key = "#postId")` using the `CacheConfig` shipped in 5.6. TTL: 30s. Cache key namespace: `cache:prayer-receipt:{postId}` (per brief W32 / W44 — no viewer-id segment because only the author can fetch; one cache entry per post).

**Cache invalidation is atomic with the reaction toggle transaction.** When a user taps Pray or un-Pray on a post:

1. Transaction begins
2. `post_reactions` row inserted/deleted
3. `posts.praying_count` incremented/decremented (existing logic — plan recon verifies atomicity at R15)
4. `@CacheEvict("prayer-receipt", key = "#postId")` fires on the same transaction boundary
5. Transaction commits

This guarantees the next `GET /api/v1/posts/{id}/prayer-receipt` is a cache miss; the backend re-queries; populates fresh entry. **Maximum staleness: ~0ms typical, 30s only when no toggles occur.** Plan recon (R15) reads the existing reaction-toggle service to identify the exact transaction boundary and `@CacheEvict` placement.

**Redis-unreachable fallback** (consumer of 5.6's degraded-with-fallback posture, D-Cache-fallback below): when Redis is down, the receipt endpoint degrades to a direct SQL query (no cache). Receipt continues serving. This is Gate-26's downstream consumer verification. Plan recon confirms 5.6's CacheConfig supports this fallback shape natively.

### Substack 3 — Share endpoint with per-service rate limiting (brief D-RateLimit-pattern / MPD-7)

`POST /api/v1/posts/{id}/prayer-receipt/share` records a share event for the purpose of rate limiting (5 share-as-image requests per post per user per day per master plan AC). **Backed by a new `PrayerReceiptShareRateLimitService` using the EXISTING per-service bucket4j+Caffeine pattern** that all 10+ existing rate limiters use (UploadRateLimitService, ReactionsRateLimitService, ChangePasswordRateLimitService, etc.). 6.1 does **not** consume the new `RateLimiter` interface from 5.6 — the 5.6 strangler pattern defers per-service migration; 6.1 honors it.

Plan recon picks the exact rate-limit key shape (likely `share:{postId}:{userId}`) and bucket configuration. 6th request returns 429 with `Retry-After` header per Gate-W7 / brief test 1 scenario 11.

### Substack 4 — Frontend `usePrayerReceipt` hook (brief D-FetchPattern / MPD-1)

`frontend/src/hooks/usePrayerReceipt.ts` is a thin custom hook using **native `fetch` + `useState` + `useEffect`** — the project convention. Returns `{ data, loading, error, refetch }`. 6.1 does **not** introduce React Query, SWR, Jotai, or axios — adding a data-fetching library is a separate architectural spec. Plan recon (R12) reads 1-2 existing hooks to confirm the canonical shape (auth header injection, error handling, refetch semantics) and matches `usePrayerReceipt` to that pattern.

The hook is conditionally invoked: only the post author fires the request (`viewer.user_id === post.author_id` is the React-tree gate per W30). The backend's 403 is defense-in-depth, not the primary trigger.

### Substack 5 — `<PrayerReceipt>` component (brief D-Hidden-at-zero / Gate-35 / W23)

Mounts within `PrayerCard.tsx` above `<InteractionBar>` **only when** `viewer.user_id === post.author_id` AND `praying_count > 0`. Returns `null` at `praying_count === 0` — no empty state, no "be the first to pray" copy, no "no one has prayed yet" copy. The component is invisible. This is **Gate-35**, the load-bearing anti-pressure principle. Tests assert ABSENCE, not the presence of an empty state.

Rendering tiers:

- **1 intercessor:** "1 person is praying for you" with single avatar
- **2-10 intercessors:** "{N} people are praying for you" with first 3 avatars stacked (friends first by display name; non-friend slots use a generic gradient avatar)
- **10+ intercessors:** Same count + 3-avatar treatment; modal becomes paginated

**Tap the count** opens `<PrayerReceiptModal>`. **Modal lists** friends by display name; non-friends as "A friend" with `...and {N} others` for excess.

**Scripture line** renders below the count in **Lora italic**, AA-contrast color, sized one notch smaller than the count text. Verse computed frontend-side: `dayOfYear(utcDate) % 60` indexes `PRAYER_RECEIPT_VERSES` (brief D-Scripture-rotation / MPD-6).

**Accessibility:** `role="status"` + `aria-live="polite"` on the receipt root so screen readers announce count changes when the page is open (brief D-Aria-live / W35 / W36). Avatar stack has accessible names listing the first 3 intercessors. Modal traps focus, Escape closes, arrow keys navigate intercessor list (brief W37 / W38).

**Count-change animation** (subtle pulse) respects `prefers-reduced-motion: reduce` — when reduced, count change is instant (brief W40 / Gate-20).

**Settings toggle gate:** when `wr_settings.prayerWall.prayerReceiptsVisible === false`, the component returns `null` regardless of count. Off-state shows zero shaming copy anywhere in the codebase (brief W25 / W23).

### Substack 6 — `<PrayerReceiptModal>` (brief Test 3 scenarios)

Standard project modal pattern (plan recon R-Modal identifies the canonical implementation). Lists `attributed_intercessors[]` by display name; renders `anonymous_count` rows as "A friend"; large counts collapse to "...and {N} others". Header: "Your prayer circle today" (master plan Copy Deck). No exact timestamps (privacy); only relative windows if shown at all ("today", "this week", "earlier"). Plan recon decides whether the modal renders timestamps at all in 6.1 or defers to a future spec.

### Substack 7 — `<PrayerReceiptImage>` + PNG generation (brief D-PNG / D-PNG-approach / MPD-2 / MPD-8)

`PrayerReceiptImage.tsx` is the **same visual logic as `<PrayerReceipt>`** but at a fixed share-card size (1080×1080 Instagram square OR 1200×630 Twitter/X card — plan recon picks the default per D-PNG-size; offering both is a plan-time decision). Rendered as a **hidden DOM element** off-screen (`position: fixed; left: -9999px;` or similar). `html2canvas` captures it on demand.

**On-demand mount only** (brief W34): the component is NOT in the DOM at page load. When the user taps "Save as image", the component mounts hidden, the page waits for `document.fonts.ready` (Lora must be loaded — brief W33), `html2canvas` captures, the resulting blob is downloaded or surfaced via `navigator.share()` if available, and the component unmounts.

**The 30KB gzipped budget is a HARD constraint** (Gate-30). A Vitest-or-build-output assertion measures the delta from baseline after the `html2canvas` import. Plan recon designs the exact assertion mechanism (likely a post-build script inspecting `dist/assets/*.js.gz`). If `html2canvas` exceeds the budget, plan recon evaluates `dom-to-image-more` (smaller but less accurate per master plan note #1). If both exceed, escalate to Eric — MAX override moment per brief § 2 (relax budget, switch to server-side, or strip PNG features).

**Server-side PNG generation is rejected as the default** (brief D-PNG): defeats the free-tier hosting cost model + adds backend image pipeline + breaks the privacy-on-device design where receipt content never leaves the user's device until they explicitly share.

**PII-strip path note:** Master plan AC: *"PNG generation reuses PII-stripping path from Spec 6.7."* 6.7 ships **after** 6.1. Plan recon decides whether to stub the PII-strip in 6.1 or defer the AC entirely via a follow-up issue. **Default per brief § 11:** defer via follow-up.

### Substack 8 — Dashboard mini-receipt (brief D-Dashboard-mini / MPD-10)

`PrayerWallDashboard.tsx` (at the corrected path **`frontend/src/pages/PrayerWallDashboard.tsx`** per R-OVR-S2) shows a **mini-receipt summary** on the author's own posts list. **Count + scripture verse only — no avatars, no friend names.** Identity content lives one place (the per-post receipt modal); the dashboard mini is a teaser; tapping the post navigates to the full receipt. Defense in depth on privacy: even in a public-facing screenshot, the dashboard mini-receipt would never leak identities because identities aren't there.

Visual design is a NEW surface that 6.1 introduces. Plan recon (R9) catalogs `PrayerWallDashboard.tsx`'s existing per-post card layout. If there's space for a single-line accent ("3 people are praying • [scripture verse line]"), that's the canonical pattern. If the layout can't absorb a new line cleanly, plan recon proposes a layout for Eric's review.

### Substack 9 — Settings toggle (brief D-Settings-persistence / MPD-9)

Settings page adds a toggle: "Show me my prayer receipts" (master plan Copy Deck). Helper: "Turn this off if you'd rather not see who's praying for you right now. You can turn it back on anytime." Default: `true`.

**Storage:** `wr_settings.prayerWall.prayerReceiptsVisible` (localStorage). Plan recon (R11) reads `.claude/rules/11-local-storage-keys.md` to identify the canonical `wr_settings` structure (likely a single localStorage key with a JSON-blob value containing nested settings). The new field nests under `prayerWall` per existing conventions; default `true`.

**Cross-device sync** is deferred to Phase 8 (the settings-sync phase per master plan sequencing). 6.1 ships localStorage-only. Acceptable per master plan AC (which explicitly lists "or localStorage in Phase 6 era"). Filed as a follow-up issue per AC § 11.

**Off-state is silent.** When toggled off, the receipt UI hides everywhere (PrayerCard, PrayerWallDashboard, modal entry point). The Settings page itself does **not** show copy like "You've hidden receipts" or any reminder/shaming text (brief W25).

### Substack 10 — `.claude/rules/11-local-storage-keys.md` update

Document the new key `wr_settings.prayerWall.prayerReceiptsVisible` (default `true`) per `02-security.md` § Demo Mode Data Policy and the storage-key documentation rule in `11-local-storage-keys.md` ("Document every new key in this file as part of the spec that introduces it"). Plan recon picks the exact placement (likely the Settings section).

### Substack 11 — OpenAPI spec addition

Master plan AC: *"OpenAPI spec updated with the new endpoint."* Plan recon (PLAN-RECON-REQUIRED-OPENAPI) locates the OpenAPI spec file (likely `backend/src/main/resources/openapi.yaml` or a generator-driven path) and adds the `GET /api/v1/posts/{id}/prayer-receipt` definition with the `PrayerReceiptResponse` schema.

---

## Master Plan Divergences (MPDs)

The brief's MPDs 1 through 10 are preserved verbatim as design intent. Each MPD here cross-references the brief section for full context; brief wins on detail.

### MPD-1 — Frontend uses native fetch, NOT React Query

**Master plan ambiguity:** files-to-create lists `usePrayerReceipt.ts` without specifying the data-fetching library.

**Brief design call (D-FetchPattern):** native `fetch` + `useState` + `useEffect` via thin custom hook. Project does not use React Query / Jotai / axios / SWR per verified R1. 6.1 is not the spec that introduces a new data-fetching library.

**Override status:** binding. W11 codifies. If plan-time CC proposes React Query, reject — surface to Eric only if the existing patterns are systemically broken (unlikely).

### MPD-2 — `html2canvas` is a NEW dependency; HARD ≤30KB gzipped budget

**Master plan body:** *"PNG generation is client-side; bundle-size impact tracked (target < 30 KB gzipped additional)."*

**Brief design call (D-PNG):** client-side `html2canvas`, with budget-guardrail Vitest/build-output test (Gate-30). If exceeds, evaluate `dom-to-image-more`. If both exceed, escalate to Eric (MAX override moment).

**Override status:** binding. Gate-30 is HARD per brief § 6. W5/W12 codify.

### MPD-3 — Friend-vs-non-friend classification is BACKEND-resolved; wire format carries ZERO non-friend identity data

**Master plan body:** describes the friend/non-friend distinction in author-side and other-side display rules.

**Brief design call (D-Friend-detection):** backend classifies; response wire format carries `attributed_intercessors[]` (friends only) + `anonymous_count` (number only). No non-friend `user_id` / `display_name` / `avatar_url` anywhere on the wire.

**Override status:** binding. Gate-32 codifies. W28/W29 codify. Privacy by construction — a frontend bug cannot leak what the frontend never receives.

### MPD-4 — Verse curation is HUMAN-IN-THE-LOOP (Gate-29 HARD BLOCK)

**Master plan plan-phase note #4:** *"Confirm the 60 curated scripture verses — Eric should review the curated set before spec execution."*

**Brief design call (D-Verses):** Eric curates 60 WEB verses HIMSELF in a separate session before plan-time. Brief locks file path `frontend/src/constants/prayer-receipt-verses.ts`, structure (`export const PRAYER_RECEIPT_VERSES: ReadonlyArray<{ reference: string; text: string }>` with exactly 60 entries), translation (WEB), and the gift-not-guilt content gate.

**Override status:** binding. **Gate-29 is a HARD BLOCK on `/execute-plan-forums`.** The execute command refuses to run until the verse list is ratified by Eric. W4/W19 codify.

**Override candidate:** if Eric reverses D-Verses and wants plan-time CC to propose a draft set as a starting point, override at brief review. Default: Eric curates separately.

### MPD-5 — Cache invalidation is ATOMIC with reaction insert/delete

**Master plan AC:** *"Redis cache TTL 30s (per 5.6) honored; cache invalidated on reaction toggle."*

**Brief design call (D-Cache-invalidation):** `@CacheEvict("prayer-receipt", key = "#postId")` atomic with `post_reactions` insert/delete + `praying_count` update in the same transaction. 30s TTL is the FLOOR (max staleness when no toggles), not the ceiling. Atomic eviction makes typical staleness ~0ms.

**Override status:** binding. Gate-33 codifies. W8 codifies. Plan recon (R15) confirms exact transaction boundary on the existing reaction-toggle service.

### MPD-6 — Scripture rotation: frontend-computed `dayOfYear(utcDate) % 60`

**Master plan AC:** *"Daily-rotating scripture verse renders and is identical for all users on the same UTC day."*

**Brief design call (D-Scripture-rotation):** frontend computes `dayOfYear(utcDate) % 60`, indexes `PRAYER_RECEIPT_VERSES`. Same verse for all users on the same UTC day. Backend stays stateless and cacheable. Plan recon refines the exact algorithm for leap years and year-boundary handling.

**Override status:** binding. Test 6 (brief § 9) covers leap-year and year-boundary cases.

### MPD-7 — Share endpoint uses EXISTING per-service rate-limit pattern (NOT the new RateLimiter interface from 5.6)

**Master plan AC:** *"Share rate-limited to 5 per post per day (integration test verifies 6th returns 429)."*

**Recon finding (5.6 strangler pattern):** 5.6 introduces the new `RateLimiter` interface as INFRASTRUCTURE but does NOT migrate any existing service to consume it.

**Brief design call (D-RateLimit-pattern):** 6.1 creates `PrayerReceiptShareRateLimitService.java` using the existing per-service bucket4j+Caffeine pattern (same as all 10+ existing rate-limit services). Does NOT consume the new `RateLimiter` interface. 6.1 honors the 5.6 strangler.

**Override status:** binding. W13/W15 codify. Override candidate: Eric may want 6.1 to be the first consumer (strangler-to-adoption transition); default is consistency-with-existing.

### MPD-8 — PNG generation is component-rendered-then-captured, NOT canvas-API-drawn

**Master plan body files-to-create:** *`PrayerReceiptImage.tsx (render-to-PNG)`*.

**Brief design call (D-PNG-approach):** render `PrayerReceiptImage` as a hidden DOM element at share-card size; `html2canvas` captures it. NOT canvas-API drawing primitives. Tailwind/CSS for layout; Lora italic for scripture; the brand wordmark — all CSS-driven. The component IS the design.

**Override status:** binding. Plan recon designs the wait-for-fonts step (`document.fonts.ready`) and the hidden-mount mechanism (W33/W34).

### MPD-9 — Settings toggle persistence is localStorage only (Phase 6 era); cross-device sync deferred to Phase 8

**Master plan AC:** *"Dismissed-setting state persists across devices via Phase 8 settings sync (or localStorage in Phase 6 era)."*

**Brief design call (D-Settings-persistence):** localStorage only in 6.1. Cross-device sync deferred to Phase 8 follow-up. Setting key: `wr_settings.prayerWall.prayerReceiptsVisible` (default `true`).

**Override status:** binding. Filed as follow-up issue per brief § 11 AC list.

### MPD-10 — Dashboard mini-receipt is count + verse only (no identity by design)

**Master plan body files-to-modify:** *`PrayerWallDashboard.tsx — receipt summary on the dashboard posts list`*. **Path corrected per R-OVR-S2** to `frontend/src/pages/PrayerWallDashboard.tsx`.

**Master plan AC:** *"Receipt visible on the author's dashboard summary (non-expanded mini-version showing just total count, no identity)."*

**Brief design call (D-Dashboard-mini):** mini-receipt shows count + scripture verse, no avatars, no friend names. Identity content lives one place (the per-post modal); dashboard is a teaser. Defense in depth on privacy.

**Override status:** binding. W22 codifies. Test 8 (brief § 9) asserts NO avatar elements in the mini-receipt subtree.

---

## Design Decisions (D1–D18)

Quick-reference catalog. Each entry cross-references its MPD where applicable. Full reasoning in brief § 4 and § 7.

| ID | Decision | One-line rationale |
|----|----------|---------------------|
| **D-FetchPattern** | Native fetch + useState/useEffect via thin custom hook; no React Query | Project convention; 6.1 isn't the spec to change it (MPD-1) |
| **D-PNG** | Client-side `html2canvas`, ≤30KB gzipped budget | Server-side defeats free-tier hosting; budget is HARD per AC (MPD-2) |
| **D-Friend-detection** | Backend classifies; wire format never carries non-friend identity | Privacy by construction (MPD-3) |
| **D-Verses** | Eric curates 60 WEB verses separately; Gate-29 HARD BLOCK on execute | Brand-voice/pastoral judgment, not engineering recon (MPD-4) |
| **D-Cache-invalidation** | `@CacheEvict` atomic with reaction insert/delete in same transaction | TTL is the floor, not the ceiling (MPD-5) |
| **D-Scripture-rotation** | Frontend computes `dayOfYear(utcDate) % 60` | Verse data lives on frontend; backend stays stateless (MPD-6) |
| **D-RateLimit-pattern** | Share endpoint uses existing per-service bucket4j+Caffeine; NOT the new RateLimiter interface | 6.1 honors 5.6's strangler (MPD-7) |
| **D-PNG-approach** | Render hidden DOM element at share-card size; `html2canvas` captures | Component IS the design; can't re-implement Tailwind in canvas primitives (MPD-8) |
| **D-Settings-persistence** | localStorage only in 6.1; cross-device sync deferred to Phase 8 | Phase 8 owns settings sync (MPD-9) |
| **D-Dashboard-mini** | Mini-receipt = count + scripture verse only; no avatars, no names | Identity lives one place; dashboard is a teaser (MPD-10) |
| **D-Auth-gate** | `GET /api/v1/posts/{id}/prayer-receipt` returns 403 when `requester.user_id != post.author_id`; hard server-side gate | Privacy gate is server-side; frontend conditional is defense in depth |
| **D-Aria-live** | Receipt root has `role="status"` + `aria-live="polite"` | Master plan AC; canonical pattern for non-disruptive live region |
| **D-Hidden-at-zero** | Receipt returns `null` at `praying_count === 0`; no empty state, no "be the first" copy anywhere | Load-bearing anti-pressure principle (Gate-35) |
| **D-Friend-fallback** | If friend schema missing (R7), implement with friends-list always empty (everyone = "A friend"); Eric ratifies | Two-path recovery for case Phase 2.5 hasn't shipped |
| **D-Brand-voice** | Every user-facing string is "gift not guilt"; no exclamation near receipt count; no comparison/metric/urgency framing | Master plan Anti-Pressure Copy Checklist (Gate-34) |
| **D-Lora-italic** | Scripture renders in Lora italic, smaller size, WCAG AA contrast; same in receipt + PNG | Master plan AC; canonical scripture treatment |
| **D-PNG-size** | PNG is 1080×1080 (IG square) OR 1200×630 (Twitter/X); plan recon picks default | Common shareable aspect ratios; plan-time confirms |
| **D-Wordmark** | PNG footer "Worship Room" — quiet, not loud, no app-store promotion | Master plan Copy Deck |
| **D-Cache-fallback** | When Redis unreachable, receipt endpoint degrades to direct SQL (no cache); continues serving | Consumer of 5.6's degraded-with-fallback (Gate-26 downstream) |

**Override candidates** (decisions Eric is most likely to flip at brief review):
- D-PNG → server-side (if Eric values cross-device PNG consistency over hosting cost)
- D-Verses → plan-time CC proposes draft set (if Eric wants starting point rather than from-scratch curation)
- D-RateLimit-pattern → first consumer of new RateLimiter interface (if Eric wants 6.1 to be the strangler-to-adoption transition)
- D-Settings-persistence → Phase 8 sync inline (if Phase 8 ships earlier than expected)

---

## Phase 3 Execution Reality Addendum — Gates (Gates 1–35)

The Phase 3 Execution Reality Addendum was authored for visual-migration work. 6.1 is full-stack feature work that includes a visual surface + a privacy-critical backend layer + a new external content surface (the PNG). Gates 1–22 (visual/chrome migration) partially apply; Gates 23–28 (5.6's backend infrastructure) partially apply; Gates 29–35 (NEW for 6.1) introduce feature-specific privacy/curation/anti-pressure gates.

| Gate | Description | 6.1 applicability |
|------|-------------|-------------------|
| Gates 1–7 | Standard visual/chrome migration gates | **PARTIAL** — PrayerReceipt + PrayerReceiptModal + PrayerReceiptImage are new visual components; apply 5.5's canonical patterns (FrostedCard if applicable, opacity normalization, etc.) |
| Gate 17 | Universal Rule 17 axe-core (visual a11y) | **APPLIES** — receipt + modal + share button + dashboard mini all pass axe-core with zero violations |
| Gate 18 | Visual parity gate | **N/A** — PrayerReceipt is new; no parity baseline (PNG output gets its own visual regression baseline once shipped) |
| Gate 19 | Brand voice gate | **APPLIES** — EVERY copy string passes the gift-not-guilt test (see Gate-34 below for the 6.1-specific extension) |
| Gate 20 | `prefers-reduced-motion` preservation | **APPLIES** — count-change pulse animation respects reduced-motion (no pulse when reduced) |
| Gate 21 | Lighthouse Performance | **APPLIES** — receipt fetch + render does not regress LCP/FID/CLS; PNG generation is on-demand only (never on initial render) |
| Gate 22 | Daily Hub Catalog (5.5 innovation) | **N/A** — 6.1 doesn't touch Daily Hub; PrayerReceipt visuals conform to 5.5's canonical Prayer Wall patterns |
| Gate 23 (5.6) | Testcontainer-based Redis integration test (no Redis mocking) | **APPLIES** — receipt's Redis cache + eviction tested via Testcontainer |
| Gate 24 (5.6) | Contract test parity between InMemoryRateLimiter and RedisRateLimiter | **N/A** — 6.1 doesn't consume the new RateLimiter interface per D-RateLimit-pattern |
| Gate 25 (5.6) | Every Redis SET has explicit TTL (repo-wide grep) | **APPLIES** — the 30s cache entry for `cache:prayer-receipt:{postId}` has explicit TTL |
| Gate 26 (5.6) | Circuit breaker engagement + recovery | **DOWNSTREAM CONSUMER** — with Redis down, receipt endpoint degrades to direct query (no cache) and continues serving (D-Cache-fallback) |
| Gate 27 (5.6) | Health endpoint reports DEGRADED when Redis unreachable | **N/A directly** — 5.6 owns the health endpoint; 6.1 verifies the downstream consumer continues working |
| Gate 28 (5.6) | No new rate-limit service is migrated in 5.6 — strangler preserved | **CONSUMER OF** — 6.1 honors strangler by following the existing per-service pattern (D-RateLimit-pattern) |
| **Gate 29 (NEW for 6.1)** | **Verse curation ratified by Eric before `/execute-plan-forums` (HARD BLOCK)** | **APPLIES** |
| **Gate 30 (NEW for 6.1)** | **PNG generation bundle delta ≤30KB gzipped, verified by build-output test** | **APPLIES** |
| **Gate 31 (NEW for 6.1)** | **Non-author requesting `GET /api/v1/posts/{id}/prayer-receipt` returns 403, verified by integration test** | **APPLIES** |
| **Gate 32 (NEW for 6.1)** | **Friend-vs-non-friend classification happens server-side; wire format contains zero non-friend identity data** | **APPLIES** |
| **Gate 33 (NEW for 6.1)** | **Cache invalidation is atomic with reaction insert/delete; no stale-count window beyond commit** | **APPLIES** |
| **Gate 34 (NEW for 6.1)** | **Anti-pressure copy review: every user-facing string in receipt + modal + PNG + settings passes Eric's gift-not-guilt audit** | **APPLIES** |
| **Gate 35 (NEW for 6.1)** | **Zero receipts at zero intercessors — component returns null, no "be the first" empty state, no "no one has prayed yet" copy anywhere** | **APPLIES** |

**Gate-29 and Gate-34 are HUMAN-IN-THE-LOOP gates** that Eric satisfies manually before execute and before merge respectively. The other new gates (30, 31, 32, 33, 35) are automated (Playwright, integration tests, build-output assertions).

---

## Watch-Fors (W1–W49)

Quick-reference catalog. Brief § 8 has full body for each.

### Discipline

- **W1 — Branch discipline.** Stay on `forums-wave-continued`. Never run git mutations at any phase.
- **W2 — 5.6 must ship before 6.1 execution.** ✅ **Now resolved per R-OVR-S1.**
- **W3 — Phase 5 must be complete.** ✅ **Now resolved per R-OVR-S1.**

### Hard-block gates

- **W4 — Gate-29 verse curation ratified.** HARD BLOCK on execute.
- **W5 — Gate-30 PNG bundle budget ≤30KB gzipped.** Build-output assertion.
- **W6 — Gate-31 non-author 403.** Integration test asserts 403 status + zero intercessor data in body.
- **W7 — Gate-32 server-side friend classification.** Integration test asserts wire format contains zero non-friend identity data.
- **W8 — Gate-33 atomic cache invalidation.** Insert reaction → fetch reflects new count immediately.
- **W9 — Gate-34 anti-pressure copy review.** Eric reviews every user-facing string before merge.
- **W10 — Gate-35 hidden at zero.** Playwright asserts ABSENCE, not presence of empty state.

### Architectural constraints — what NOT to introduce

- **W11 — No React Query / Jotai / axios / SWR** (D-FetchPattern / MPD-1).
- **W12 — ONLY `html2canvas` (or `dom-to-image-more` fallback); NO server-side PNG** (D-PNG / MPD-2).
- **W13 — No consumption of the new RateLimiter interface from 5.6** (D-RateLimit-pattern / MPD-7).
- **W14 — No Liquibase changesets.** 6.1 introduces no schema changes.

### Scope discipline — what NOT to edit

- **W15 — No edits to existing rate-limit service files** (the 10+ files preserved per 5.6 strangler). See brief § 10 NOT TO MODIFY for full list.
- **W16 — No edits to `.claude/rules/09-design-system.md`.** Receipt-specific design decisions live in the components, not the rules.
- **W17 — No edits to `spec-tracker.md` / master plan.** Eric updates the tracker manually post-merge.
- **W18 — No edits to historical specs.** `_specs/forums/spec-5-1.md` through `spec-5-6.md`, plus `spec-14*.md`.
- **W19 — No edits to `prayer-receipt-verses.ts` once Eric ratifies.** Post-Gate-29, treat as read-only.
- **W20 — Test files in colocated `__tests__/` directories.** Frontend convention.

### Anti-pressure violations

- **W21 — No metric framing.** "3 people are praying for you" — not "You've received 3 prayers!"
- **W22 — No growth chart, leaderboard, or ranking.** Even author-only views.
- **W23 — No empty state at zero.** Component returns `null`. No placeholder UI. Gate-35.
- **W24 — No push notifications wired in 6.1.** Phase 12 owns notifications.
- **W25 — Settings toggle off-state shows no shaming copy.** Silent off-state.
- **W26 — No comparison across posts.** No "your most-prayed-for post" copy.
- **W27 — No prayer-farming optimization affordances.** No "share to get more prayers" prompts, no receipt-related streaks/badges.

### Privacy violations

- **W28 — Non-friend identity NEVER on the wire** (Gate-32).
- **W29 — Frontend never reconstructs friendship.** No `useFriendList()` hook to power 6.1's receipt rendering.
- **W30 — Non-authors never see the receipt component.** React-tree gate before request. Defense in depth.
- **W31 — No log-leak of intercessor identities** at any log level (per `07-logging-monitoring.md` § PII).
- **W32 — Cache key does NOT include viewer identity.** `cache:prayer-receipt:{postId}` — no viewer-id segment.

### Implementation hygiene

- **W33 — Web fonts loaded before `html2canvas` capture.** Wait `document.fonts.ready` (Lora) before capture.
- **W34 — PNG generation is on-demand only.** PrayerReceiptImage is NOT mounted at page load.
- **W35 — `aria-live="polite"` for count changes** (not "assertive").
- **W36 — `role="status"` on receipt root element.**
- **W37 — Focus trap on `PrayerReceiptModal`** + Escape closes + previous focus restored on close.
- **W38 — Arrow keys navigate intercessor list in modal** + accessible names on avatars.
- **W39 — Color contrast WCAG AA (4.5:1) on every text element** (scripture italic, count, modal text, dashboard mini, PNG text).
- **W40 — Receipt count animation respects `prefers-reduced-motion`** (Gate-20 downstream).

### Conventions

- **W41 — Single quotes throughout TypeScript.**
- **W42 — WEB Bible translation throughout** all 60 verses.
- **W43 — Java conventions** (double quotes, indent matches existing).
- **W44 — Cache key namespace conforms to 5.6 `cache:*` convention** (`cache:prayer-receipt:{postId}`).
- **W45 — Lucide icons for any new iconography.** No new icon library.
- **W46 — Tailwind 3.4 (not 4)** for styling.
- **W47 — New file paths match master plan EXACTLY** (modulo R-OVR-S2 correction for `PrayerWallDashboard.tsx` location). Brief § 10 enumerates.
- **W48 — OpenAPI spec updated** for the new endpoint.
- **W49 — Eric updates spec-tracker manually post-merge.** Not in 6.1's diff.

---

## Plan-Recon-Required items (R7–R16 from brief; OPENAPI-1 and MODAL-1 added)

Plan-time CC must complete each at plan phase and record findings (R-OVR entries if any contradicts a D-decision):

- **R7 — Friend-relationship schema.** Search `backend/src/main/resources/db/changelog/` for `friendships` / `friends` table. Read schema. Identify query API (`FriendshipService` / `FriendshipRepository`). If missing, pick recovery path (Path A: depend on Phase 2.5; Path B: friends-list-always-empty fallback — everyone = "A friend"). Eric ratifies the path. Default per D-Friend-fallback: Path B is acceptable if Phase 2.5 hasn't shipped.
- **R8 — `PrayerCard.tsx` structure.** Read end-to-end. Identify viewer plumbing (`useCurrentUser()` or context), InteractionBar mount location, existing author-vs-viewer branch for anonymous posts. Catalog layout for PrayerReceipt insertion.
- **R9 — `PrayerWallDashboard.tsx` layout** at the **corrected path `frontend/src/pages/PrayerWallDashboard.tsx`** per R-OVR-S2. Read end-to-end. Catalog the per-post card layout. Pick the mini-receipt insertion point.
- **R10 — Settings page location.** Locate Settings page; read existing toggle pattern; match new toggle visually + interaction.
- **R11 — `wr_settings` localStorage shape.** Read `.claude/rules/11-local-storage-keys.md`. Identify the canonical `wr_settings` JSON structure. Plan the new `prayerWall.prayerReceiptsVisible` field placement.
- **R12 — Existing fetch hook patterns.** Read 1-2 existing hooks under `frontend/src/hooks/` to confirm the native-fetch convention (auth header, error shape, refetch). Match `usePrayerReceipt` to it.
- **R13 — Anonymous-post implementation.** Read `posts` table schema for `is_anonymous` flag. Verify PostController response shape preserves `author_id` server-side regardless of anonymity. Expected: anonymity affects non-authors only; backend always knows the actual author.
- **R14 — Crisis-flag handling in existing prayer-wall components.** Confirm 6.1 doesn't need special crisis-flag behavior. Default expectation: a crisis post is still a post; receipt behavior unchanged.
- **R15 — Existing reaction-toggle service.** Read (likely `backend/src/main/java/com/worshiproom/post/engagement/ReactionsService.java`). Confirm `posts.praying_count` atomically updated with `post_reactions` insert/delete. Identify exact transaction boundary for `@CacheEvict` placement per MPD-5.
- **R16 — Existing `PostController` structure.** Decide between (a) new `PrayerReceiptController` (master plan default) or (b) method addition on existing PostController. Default: new controller per master plan.
- **PLAN-RECON-REQUIRED-OPENAPI-1 — Locate the OpenAPI spec file** (likely `backend/src/main/resources/openapi.yaml`). Add the new endpoint definition.
- **PLAN-RECON-REQUIRED-MODAL-1 — Identify the canonical project modal pattern.** Read an existing modal (whichever is most representative). Match `PrayerReceiptModal` to it (focus trap, Escape close, focus restore).

---

## Files to Create / Modify / NOT to Modify / Delete

### CREATE

**Frontend source:**

- `frontend/src/components/prayer-wall/PrayerReceipt.tsx` — receipt component; mounted above InteractionBar when viewer is author AND `praying_count > 0`
- `frontend/src/components/prayer-wall/PrayerReceiptModal.tsx` — modal listing intercessors (friends by name, `anonymous_count` as "A friend" with "...and N others")
- `frontend/src/components/prayer-wall/PrayerReceiptImage.tsx` — hidden DOM element at share-card size; `html2canvas` captures for PNG
- `frontend/src/hooks/usePrayerReceipt.ts` — native fetch hook returning `{ data, loading, error, refetch }` (matches existing project convention per R12 / D-FetchPattern)
- `frontend/src/constants/prayer-receipt-verses.ts` — **Eric's curated 60 WEB verses (Gate-29 HARD BLOCK)**

**Frontend tests:**

- `frontend/src/components/prayer-wall/__tests__/PrayerReceipt.test.tsx`
- `frontend/src/components/prayer-wall/__tests__/PrayerReceiptModal.test.tsx`
- `frontend/src/components/prayer-wall/__tests__/PrayerReceiptImage.test.tsx`
- `frontend/src/hooks/__tests__/usePrayerReceipt.test.ts`
- `frontend/src/constants/__tests__/prayer-receipt-verses.test.ts`
- `frontend/tests/e2e/prayer-receipt.spec.ts` (Playwright privacy + anti-pressure suite; final path per plan recon)
- `frontend/scripts/check-bundle-budget.mjs` or equivalent (bundle-budget assertion; final form per plan recon)

**Backend source:**

- `backend/src/main/java/com/worshiproom/post/PrayerReceiptController.java` — REST controller for `GET /api/v1/posts/{id}/prayer-receipt`; 403 enforcement; `POST /api/v1/posts/{id}/prayer-receipt/share` for rate-limited share events
- `backend/src/main/java/com/worshiproom/post/PrayerReceiptService.java` — business logic; `@Cacheable("prayer-receipt", key = "#postId")`; friend classification SQL
- `backend/src/main/java/com/worshiproom/post/dto/PrayerReceiptResponse.java` — wire-format DTO (record)
- `backend/src/main/java/com/worshiproom/post/PrayerReceiptShareRateLimitService.java` — per-service bucket4j+Caffeine rate limiter (5 requests/post/day/user; D-RateLimit-pattern)

**Backend tests:**

- `backend/src/test/java/com/worshiproom/post/PrayerReceiptIntegrationTest.java` — Testcontainer-backed integration tests (LOAD-BEARING for privacy model)

**Backend docs:**

- `backend/docs/redis-conventions.md` — addition documenting the `cache:prayer-receipt:*` key namespace (if 5.6 created this file; plan recon confirms)

**Rules:**

- `.claude/rules/11-local-storage-keys.md` — ADD entry for `wr_settings.prayerWall.prayerReceiptsVisible` (default `true`)

**OpenAPI:**

- Plan recon locates the spec; adds the `GET /api/v1/posts/{id}/prayer-receipt` definition + response schema (PrayerReceiptResponse)

### MODIFY

**Frontend source:**

- `frontend/src/components/prayer-wall/PrayerCard.tsx` — render `<PrayerReceipt>` above `<InteractionBar>` when `viewer.user_id === post.author_id` (plan recon reads structure per R8)
- **`frontend/src/pages/PrayerWallDashboard.tsx`** (corrected path per R-OVR-S2) — add mini-receipt summary on author's own posts list (D-Dashboard-mini)
- Settings page (path per plan recon R10) — add `prayerReceiptsVisible` toggle + helper copy
- `frontend/package.json` — ADD `html2canvas` dependency (version pinned at plan time; budget verified per Gate-30)

**Frontend tests modify (add new scenarios):**

- `frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx` (Test 7 scenarios — author w/ intercessors renders receipt; author w/ zero intercessors does NOT render receipt; non-author does NOT render receipt)
- `frontend/src/pages/__tests__/PrayerWallDashboard.test.tsx` (Test 8 scenarios; corrected location per R-OVR-S2) — mini-receipt at count > 0; absent at zero; no avatars in DOM subtree
- Settings page test (Test 9 scenarios; path per plan recon)

**Backend source:**

- `backend/src/main/java/com/worshiproom/post/engagement/ReactionsService.java` (path confirmed per R15) — add `@CacheEvict("prayer-receipt", key = "#postId")` to reaction-toggle methods, atomic with transaction

**Backend tests modify:**

- `backend/src/test/java/com/worshiproom/post/engagement/ReactionsServiceTest.java` (or equivalent) — add assertions that `@CacheEvict` fires on toggle (Gate-33)

**Rules:**

- `.claude/rules/11-local-storage-keys.md` — add the new setting key per Section 10 above

### NOT TO MODIFY

**Existing rate-limit services** (W15 / D-RateLimit-pattern / 5.6 strangler):

All 10+ files in 5.6 R3 are read-only:

- `backend/src/main/java/com/worshiproom/upload/UploadRateLimitService.java`
- `backend/src/main/java/com/worshiproom/legal/LegalAcceptRateLimitService.java`
- `backend/src/main/java/com/worshiproom/proxy/common/RateLimitFilter.java`
- `backend/src/main/java/com/worshiproom/post/ResolveRateLimitService.java`
- `backend/src/main/java/com/worshiproom/post/report/ReportsRateLimitService.java`
- `backend/src/main/java/com/worshiproom/post/PostsRateLimitService.java`
- `backend/src/main/java/com/worshiproom/post/engagement/BookmarksRateLimitService.java`
- `backend/src/main/java/com/worshiproom/post/engagement/ReactionsRateLimitService.java`
- `backend/src/main/java/com/worshiproom/post/comment/CommentsRateLimitService.java`
- `backend/src/main/java/com/worshiproom/auth/ChangePasswordRateLimitService.java`
- `backend/src/main/java/com/worshiproom/auth/LoginRateLimitFilter.java`
- Plus `backend/src/main/java/com/worshiproom/proxy/common/IpResolver.java` and `RateLimitExceededException.java`

**Design system rules** (W16):

- `.claude/rules/09-design-system.md`

**Spec-tracker / master plan** (W17):

- `_forums_master_plan/spec-tracker.md` — Eric updates manually post-merge
- `_forums_master_plan/round3-master-plan.md`

**Historical specs** (W18):

- `_specs/forums/spec-5-1.md` through `spec-5-6.md`
- `_specs/forums/spec-14*.md`

**5.6 infrastructure** (consumer-only, no edits):

- `backend/src/main/java/com/worshiproom/ratelimit/RateLimiter.java` (the new interface; 6.1 does NOT consume it)
- `backend/src/main/java/com/worshiproom/ratelimit/InMemoryRateLimiter.java`
- `backend/src/main/java/com/worshiproom/ratelimit/RedisRateLimiter.java`
- `backend/src/main/java/com/worshiproom/ratelimit/RateLimiterConfig.java`
- `backend/src/main/java/com/worshiproom/cache/CacheConfig.java` (consumed via `@Cacheable` only)
- `backend/src/main/java/com/worshiproom/cache/RedisConfig.java`
- `backend/src/main/java/com/worshiproom/cache/RedisHealthIndicator.java`

**Liquibase / database** (W14):

- `backend/src/main/resources/db/changelog/**` — no new changesets

### DELETE

None. 6.1 is purely additive.

---

## Testing Strategy

Master plan AC: *"At least 24 tests covering privacy boundaries, count accuracy, scripture rotation, modal behavior, etc."* Brief refines to specific test classes targeting ~40–50 tests across 7 new files + 3 modifications + 1 Playwright suite + 1 build-output assertion. Plan recon finalizes per actual implementation. **Test 1 (PrayerReceiptIntegrationTest) and Test 10 (Playwright privacy + anti-pressure suite) are LOAD-BEARING for the privacy model and cannot be cut.**

### Test 1 — `PrayerReceiptIntegrationTest.java` (NEW) — LOAD-BEARING

Location: `backend/src/test/java/com/worshiproom/post/PrayerReceiptIntegrationTest.java`. Testcontainer-backed with real PostgreSQL + real Redis from 5.6. ~10–12 scenarios:

1. **Author fetches own receipt:** 200; response shape matches `PrayerReceiptResponse`
2. **Non-author fetches another's receipt:** **403 (Gate-31).** Body contains zero intercessor data.
3. **Unauthenticated fetch:** 401 (existing auth filter)
4. **Anonymous-post author fetches own receipt:** 200 (anonymity doesn't block own-data access)
5. **Friend classification:** post with 5 intercessors (2 friends, 3 non-friends); response has `attributed_intercessors.length == 2`, `anonymous_count == 3`, `total_count == 5` (Gate-32)
6. **Wire format leak check:** strict-schema assertion; zero non-friend `user_id` / `display_name` / `avatar_url` anywhere in JSON (Gate-32)
7. **Cache hit:** first fetch (miss), second within 30s (hit)
8. **Cache TTL:** `redisTemplate.getExpire("cache:prayer-receipt:{postId}")` returns positive duration ≤ 30s
9. **Cache invalidation on reaction insert:** fetch → insert reaction → fetch → fresh count (Gate-33)
10. **Cache invalidation on reaction delete:** fetch → delete reaction → fetch → decremented count (Gate-33)
11. **Share rate limit:** 5 share requests succeed; 6th returns 429
12. **Empty receipt:** post with `praying_count == 0`, author fetches → 200 with `total_count: 0`, `attributed_intercessors: []`, `anonymous_count: 0`. (Frontend honors Gate-35 by not rendering; backend honestly returns the zero data.)

### Test 2 — `PrayerReceipt.test.tsx` (NEW)

Location: `frontend/src/components/prayer-wall/__tests__/PrayerReceipt.test.tsx`. Vitest + RTL with mocked `usePrayerReceipt`. ~7–9 scenarios:

1. `praying_count=0`: component returns null; DOM has no `[data-testid="prayer-receipt"]` (Gate-35)
2. `praying_count=1`: renders "1 person is praying for you"
3. `praying_count=3`: renders "3 people are praying for you" with 3 avatars stacked
4. `praying_count=10`: renders count + first 3 avatars + "...and 7 others" text
5. Friend attribution: `attributed_intercessors` renders with `display_name` as accessible name; `anonymous_count` renders as "A friend"
6. Settings toggle off: `prayerReceiptsVisible === false` → component returns null regardless of count
7. `role="status"` + `aria-live="polite"` on receipt root
8. Lora italic on scripture: computed style assertion
9. Hidden in DOM at zero (re-assert by query): `queryByTestId('prayer-receipt')` returns null

### Test 3 — `PrayerReceiptModal.test.tsx` (NEW)

Location: `frontend/src/components/prayer-wall/__tests__/PrayerReceiptModal.test.tsx`. ~6–8 scenarios:

1. Focus trap on open (focus on first focusable element)
2. Escape closes (callback)
3. Focus restored on close
4. Arrow keys navigate intercessor list
5. Tab cycles within modal
6. Friends listed by display_name
7. Non-friends listed as "A friend"
8. Accessible names on avatars

### Test 4 — `PrayerReceiptImage.test.tsx` (NEW)

Location: `frontend/src/components/prayer-wall/__tests__/PrayerReceiptImage.test.tsx`. ~3–4 scenarios:

1. Renders post excerpt
2. Renders count
3. Renders scripture verse
4. Renders Worship Room wordmark

(Actual PNG generation tested in Playwright via visual regression snapshot.)

### Test 5 — `usePrayerReceipt.test.ts` (NEW)

Location: `frontend/src/hooks/__tests__/usePrayerReceipt.test.ts`. ~4–5 scenarios:

1. Initial state: `{ data: null, loading: true, error: null }`
2. Success path: 200 → `{ data: <response>, loading: false, error: null }`
3. 403 path: `{ data: null, loading: false, error: <403> }` (W30)
4. 500 path: `{ data: null, loading: false, error: <500> }`
5. Refetch on settings change

### Test 6 — `prayer-receipt-verses.test.ts` (NEW)

Location: `frontend/src/constants/__tests__/prayer-receipt-verses.test.ts`. ~4–6 scenarios:

1. List contains exactly 60 entries (Gate-29 prerequisite)
2. Every entry has `reference` + `text`
3. Day-of-year 1 → verse index 0
4. Day-of-year 61 → wraparound case (`61 % 60`; plan recon verifies 1-indexed handling)
5. Leap year handling (2024-02-29)
6. Year boundary

### Test 7 — `PrayerCard.test.tsx` update (MODIFY)

Add ~2–3 scenarios:

1. Author viewing own post with intercessors: `<PrayerReceipt>` rendered above `<InteractionBar>`
2. Author viewing own post with zero intercessors: `<PrayerReceipt>` NOT rendered (Gate-35)
3. Non-author viewing post: `<PrayerReceipt>` NOT rendered (W30)

### Test 8 — `PrayerWallDashboard.test.tsx` update (MODIFY)

Location: `frontend/src/pages/__tests__/PrayerWallDashboard.test.tsx` (corrected per R-OVR-S2; plan recon confirms whether file exists or needs to be created). Add ~2–3 scenarios:

1. Mini-receipt on own posts with intercessors: in DOM for `praying_count > 0`
2. Mini-receipt hidden at zero
3. Mini-receipt does NOT include avatars (Gate-32 / D-Dashboard-mini)

### Test 9 — Settings page update (MODIFY)

Path per plan recon. Add ~2 scenarios:

1. Toggle renders and persists to `wr_settings.prayerWall.prayerReceiptsVisible`
2. Off-state shows NO shaming copy (regex `/you've hidden/i` / `/missing/i` returns no matches)

### Test 10 — Playwright privacy + anti-pressure suite (NEW)

Location: `frontend/tests/e2e/prayer-receipt.spec.ts` (path per plan recon). LOAD-BEARING. ~8–10 scenarios:

1. Author with intercessors sees receipt
2. Non-author does NOT see receipt (Gate-32 end-to-end)
3. Author with zero intercessors sees no receipt (Gate-35 end-to-end)
4. Modal opens on count tap
5. Modal closes on Escape
6. Reaction toggle updates receipt
7. "Save as image" generates PNG (blob created)
8. PNG visual regression (snapshot baseline)
9. axe-core a11y on modal (Gate-17)
10. Settings toggle hides everywhere (Gate-35 across routes)

### Test 11 — Bundle budget test (NEW)

Location: `frontend/scripts/check-bundle-budget.mjs` (or test equivalent). 1 assertion: `html2canvas` adds ≤30KB gzipped to bundle (Gate-30). Runs in CI after every commit. Plan recon designs the exact mechanism (Vite plugin or post-build script inspecting `dist/assets/*.js.gz`).

### Net test count

~40–50 new tests across 7 new test files + 3 modifications + 1 Playwright suite + 1 build-output assertion. Comfortably exceeds master plan AC ≥24.

---

## Acceptance Criteria

### Master plan ACs (verbatim, 22 items)

- [ ] Receipt component renders nothing when `praying_count = 0`
- [ ] Receipt shows correct count for 1 / 2-10 / 10+ intercessor cases
- [ ] Attributed avatars show only for friends of the author
- [ ] Non-friend intercessors appear as "A friend" with generic gradient avatar
- [ ] Modal opens on count tap, lists friends by display name and non-friends as "A friend + N others"
- [ ] Other users viewing the post see the aggregate count but NEVER individual intercessor identities
- [ ] Rapid-fire reactions (friend taps Pray, un-Pray, Pray again) resolve to the current state, not transient
- [ ] Redis cache TTL 30s (per 5.6) honored; cache invalidated on reaction toggle
- [ ] Daily-rotating scripture verse renders and is identical for all users on the same UTC day
- [ ] Scripture uses Lora italic at smaller size
- [ ] Share-as-image generates a PNG containing post excerpt + count + verse + wordmark
- [ ] PNG generation reuses PII-stripping path from Spec 6.7 (no EXIF, no GPS, no timestamp fingerprint) — **NOTE: 6.7 ships AFTER 6.1; default per brief § 11 is defer via follow-up issue**
- [ ] Share rate-limited to 5 per post per day (integration test verifies 6th returns 429)
- [ ] Settings toggle `prayerReceiptsVisible` controls visibility; default true
- [ ] When toggled off, author sees no receipts anywhere and no "you've hidden receipts" shaming copy
- [ ] Screen reader announces new prayer count changes via `aria-live="polite"` when page is open
- [ ] Avatar stack has accessible names listing the first 3 intercessors
- [ ] Modal traps focus, Escape closes, arrow keys navigate
- [ ] Color contrast meets WCAG AA on all text including italic scripture
- [ ] Receipt endpoint returns 403 when requester is not the post author
- [ ] PNG generation bundle-size impact ≤ 30 KB gzipped
- [ ] Receipt visible on the author's dashboard summary (non-expanded mini-version showing just total count, no identity)
- [ ] Anonymous-posts author still sees receipts (they know they posted even if readers don't)
- [ ] Dismissed-setting state persists across devices via Phase 8 settings sync (or **localStorage in Phase 6 era — current implementation**)
- [ ] At least 24 tests covering privacy boundaries, count accuracy, scripture rotation, modal behavior

### Brief expansion ACs (D-decisions, MPDs, gates)

- [ ] Frontend uses native fetch + useState/useEffect for `usePrayerReceipt`; NO React Query / Jotai / axios introduced (D-FetchPattern / MPD-1 / W11)
- [ ] PNG generation is client-side `html2canvas` (D-PNG / MPD-2 / W12)
- [ ] `html2canvas` (or `dom-to-image-more` fallback) is the ONLY new frontend dependency added
- [ ] `PrayerReceiptResponse` wire format contains zero non-friend identity data (D-Friend-detection / MPD-3 / W28 / Gate-32)
- [ ] 60 WEB verses curated by Eric, ratified before execute (D-Verses / MPD-4 / Gate-29 / W4)
- [ ] Cache invalidation via `@CacheEvict` atomic with reaction insert/delete transaction (D-Cache-invalidation / MPD-5 / Gate-33 / W8)
- [ ] Scripture rotation: frontend computes `dayOfYear(utcDate) % 60` (D-Scripture-rotation / MPD-6)
- [ ] Share endpoint uses existing per-service bucket4j+Caffeine pattern; NOT the new RateLimiter interface from 5.6 (D-RateLimit-pattern / MPD-7 / W13)
- [ ] PNG rendered via `html2canvas` capture of hidden DOM element, NOT canvas-API drawing (D-PNG-approach / MPD-8)
- [ ] Settings toggle persisted to localStorage; cross-device sync deferred to Phase 8 (D-Settings-persistence / MPD-9)
- [ ] Dashboard mini-receipt shows count + scripture verse only; no avatars, no names (D-Dashboard-mini / MPD-10 / W22)
- [ ] `PrayerReceiptController` 403 enforcement server-side; frontend defense in depth (D-Auth-gate / Gate-31 / W6)
- [ ] PrayerReceipt root has `role="status"` + `aria-live="polite"` (D-Aria-live / W35 / W36)
- [ ] PrayerReceipt returns null at `praying_count === 0`; zero empty-state copy anywhere (D-Hidden-at-zero / Gate-35 / W10 / W23)
- [ ] All user-facing strings pass anti-pressure brand-voice audit (D-Brand-voice / Gate-34 / W9)
- [ ] Scripture rendered in Lora italic, AA contrast, on-screen receipt + PNG (D-Lora-italic)
- [ ] PNG aspect ratio consistent and matches plan-recon's chosen default (D-PNG-size)
- [ ] PNG footer contains "Worship Room" wordmark per Copy Deck (D-Wordmark)
- [ ] No edits to existing rate-limit services / design system rules / spec-tracker / master plan / historical specs (W15–W19)
- [ ] Zero Liquibase changesets in 6.1's diff (W14)
- [ ] No log-leak of intercessor identities at any log level (W31)
- [ ] Cache key is `cache:prayer-receipt:{postId}` (no viewer-id segment) (W32)
- [ ] `@CacheEvict` cache name conforms to 5.6 `cache:*` convention (W44)
- [ ] OpenAPI spec updated with `GET /api/v1/posts/{id}/prayer-receipt` definition (W48)
- [ ] `.claude/rules/11-local-storage-keys.md` documents `wr_settings.prayerWall.prayerReceiptsVisible` (Substack 10 / D-Settings-persistence)

### Follow-up issue ACs

- [ ] Follow-up issue filed for **PII-stripping path integration** (depends on Spec 6.7 shipping)
- [ ] Follow-up issue filed for **Phase 8 settings sync integration** (cross-device sync of `prayerReceiptsVisible`)
- [ ] (If R7 R-Friend-fallback path taken) Follow-up issue filed for **Phase 2.5 friend schema integration** (swap fallback to real classification when friend schema lands)

### Verification ACs

- [ ] All Testcontainer integration scenarios pass (Test 1)
- [ ] All Playwright scenarios pass (Test 10)
- [ ] All Vitest + RTL component tests pass (Tests 2–9)
- [ ] Bundle budget test passes (Test 11 / Gate-30)
- [ ] `/code-review` passes with zero Blocker, zero Major findings
- [ ] Eric's manual brand-voice review (Gate-34) signed off
- [ ] Eric's manual PNG visual review signed off
- [ ] Eric's manual privacy review (Gate-32 / Gate-31 / Gate-35 hand-verified on local or staging)
- [ ] (If staging exists) Staging deployment verifies 30s cache + atomic invalidation on a real Redis
- [ ] Spec-tracker flipped ⬜ → ✅ post-merge by Eric

---

## Out of Scope

Master plan body verbatim:

- Prayer receipt "digest" email (could be a Phase 15 follow-up)
- Historical receipts timeline ("you received 500 prayers this year")
- Receipt analytics or "most-prayed-for" leaderboards (explicitly anti-anti-pressure)
- Gif/animation on receipt appearance (static only; animation breaks the quiet reverence)
- Custom avatars in receipt modal beyond existing avatar URLs
- Prayer receipt for comment-level prayers (only post-level)

Brief expansion — explicit deferrals:

- **Per-service rate-limiter migration to new RateLimiter interface** (D-RateLimit-pattern / MPD-7). Spec 5.7+ owns.
- **PII-stripping path integration with Spec 6.7.** 6.1 defers via follow-up issue.
- **Phase 8 settings sync** (D-Settings-persistence / MPD-9). localStorage only in 6.1.
- **Push notifications on receipt events.** Phase 12 owns (master plan anti-pressure: only summarized as `prayer_received_daily` digest).
- **React Query / Jotai / SWR / axios introduction** (D-FetchPattern / MPD-1).
- **Server-side PNG generation** (D-PNG / MPD-2). Backend image pipeline (Sharp, S3, signed URLs) out of scope.
- **`@Cacheable` annotations beyond the receipt endpoint.** 5.6 added zero; 6.1 adds exactly one.
- **Liquibase schema changes** (W14).
- **Edits to existing rate-limit service files** (W15; strangler preserved).
- **Edits to design system rules / spec-tracker / master plan / historical specs** (W16–W18).
- **A new modal pattern.** Use existing project pattern (plan recon identifies).
- **A new icon library.** Lucide-react is canonical.
- **Cross-feature integration with Quick Lift (6.2), Whispers / Night Mode (6.3), Encouragement Cards (6.4).** Standalone ship.
- **Receipt for candle-reaction users.** Master plan: receipt is specifically about `reaction_type = 'praying'`.
- **Performance optimization beyond the bundle budget.** Hit ≤30KB; don't gold-plate.
- **i18n / RTL support for the PNG layout.** English-only at Phase 6.
- **A11y testing beyond axe-core + manual screen reader walk.** NVDA/JAWS/TalkBack deferred.
- **Mobile-native share sheet beyond `navigator.share()`.** iOS/Android native shims out of scope.
- **Receipt-related analytics events.** No tracking pixels, no funnel events (anti-prayer-farming defense).
- **A11y of the PNG itself.** PNGs are images; the in-app receipt is the accessible surface.
- **Customization of the PNG** (font, color, layout). One canonical design.
- **Receipt for soft-deleted posts** (`deleted_at IS NOT NULL`). Endpoint returns 404 or 410 (plan recon picks).

---

## Copy Deck (Master plan verbatim — Gate-34 brand-voice audit material)

| Surface | Copy |
|---------|------|
| 1 intercessor | "1 person is praying for you" |
| 2+ intercessors | "{N} people are praying for you" |
| Modal header | "Your prayer circle today" |
| Non-friend attribution | "A friend" |
| Large-number excess | "...and {N} others" |
| Share button | "Save as image" |
| Shareable card footer | "Worship Room" |
| Settings toggle | "Show me my prayer receipts" |
| Settings helper | "Turn this off if you'd rather not see who's praying for you right now. You can turn it back on anytime." |

### Anti-Pressure Copy Checklist (master plan verbatim)

(a) No comparison. (b) No urgency. (c) No exclamation points near the receipt count. (d) No metric framing. (e) No quantification of growth. (f) No reciprocity prompting ("now go pray for someone" is also pressure). (g) No guilt-trip scripture. (h) No emoji near sacred content.

### Risk strings to flag during Gate-34 review (brief § 13)

If any of these appear in the diff, Eric flags for revision:

- Exclamation points outside error states
- The words: "score", "streak", "rank", "top", "best", "unlock", "earn", "achievement", "badge", "level", "milestone", "goal"
- Comparative phrasing: "more than", "less than", "compared to"
- Urgency phrasing: "act now", "limited", "only", "don't miss"
- Metric phrasing: "you've received", "total prayers", "prayer count" (when shown to user)
- Reciprocity phrasing: "pray for someone", "give back", "pay it forward"
- App-store promotion: "get the app", "download", "install"

### Tone notes

- **Voice:** quiet, present, sincere
- **Address:** second person ("you")
- **Punctuation:** periods, occasional em-dashes; exclamation only in error states
- **Capitalization:** sentence case for buttons/labels per master plan default
- **Numerals:** for counts ("3 people", not "three people"); avoid numbers in modal headers
- **Scripture references:** "Book Chapter:Verse" format (e.g., "Psalm 46:10") — plan recon confirms project-wide convention

---

## Out-of-band notes for Eric (master plan verbatim)

The "hidden at zero" rule is the most important thing here. Resist every future request to add "Be the first to pray!" copy — it sounds friendly but it's the same FOMO pattern that dating apps use, and it has no place on a feature for people in real pain.

The scripture rotation creates an unexpected emergent property where everyone receiving prayer receipts on the same day shares the same verse. This can create beautiful moments ("did you also get Isaiah 40:31 today?") that you didn't design for. Let this happen; don't try to personalize the verse per user — the shared verse IS the feature.

The "dismissed receipts" setting is load-bearing for users in acute crisis who find the attention overwhelming. Never hide this setting behind a multi-click path; it should be a single toggle directly on the settings page.

Brief expansion: The "60 curated WEB verses" (Gate-29 HARD BLOCK) is the most important non-engineering deliverable in 6.1. Plan recon and execute MUST NOT propose verses themselves — D-Verses locks it as Eric's pre-execute deliverable.

---

## Verification Handoff

After this spec is approved, the pipeline continues:

1. **`/plan-forums _specs/forums/spec-6-1.md`** → generates `_plans/forums/spec-6-1.md` with R7–R16 + OPENAPI-1 + MODAL-1 recon findings filled in, exact `html2canvas` version + bundle-budget verification, exact friend-schema recovery path (R7), exact `@CacheEvict` placement, exact response DTO shape, exact `usePrayerReceipt` hook signature, exact PNG aspect ratio, exact Settings page modification path, exact OpenAPI addition, Playwright test seed strategy, bundle-budget assertion mechanism.

2. **Eric reviews the plan.** Particular attention: wire format carries zero non-friend identity; `html2canvas` ≤30KB OR `dom-to-image-more` fallback OR escalation; Gate-35 absence assertion; `@CacheEvict` atomic with transaction; share endpoint uses existing pattern; all 22+ ACs mapped to implementation tasks; test count ≥24; no new deps beyond `html2canvas`; no edits to forbidden surfaces; R7 fallback acceptable if Phase 2.5 hasn't shipped; anonymous-post handling preserves author own-data access.

3. **Pre-execute gates:**
   - 5.6 ✅ in spec-tracker — **already resolved per R-OVR-S1**
   - Phase 5 complete — **already resolved per R-OVR-S1**
   - **Gate-29 HARD BLOCK: Eric's curated 60 WEB verses placed at `frontend/src/constants/prayer-receipt-verses.ts`** (or DRAFT file per plan recon's ratification mechanism). Execute REFUSES until ratified.

4. **`/execute-plan-forums _plans/forums/spec-6-1.md`** on `forums-wave-continued`. No commits. Per-step verification: `mvn test` (PrayerReceiptIntegrationTest first, then full backend suite); `pnpm test` (Vitest + RTL); `pnpm test:e2e` (Playwright); `pnpm build` + bundle-budget assertion (Test 11).

5. **`/code-review`** — ACs from this spec are the review checklist. Zero Blockers, zero Majors.

6. **`/verify-with-playwright`** — full Playwright run on `/prayer-wall/:postId`, `/prayer-wall/dashboard`, Settings page. axe-core integrated. PNG visual regression baseline.

7. **Gate-34 brand-voice audit (Eric, manual)** — every user-facing string reviewed against the Copy Deck + Anti-Pressure Copy Checklist + risk-strings list.

8. **Eric commits, pushes, flips spec-tracker ⬜ → ✅, files follow-up issues** (PII-strip / Phase 8 sync / R7 friend-schema fallback if taken).

### Override moments — escalation paths

- **Recon contradicts a D-decision** → R-OVR entry in spec; advisor reviews; brief not edited; R-OVR governs execution.
- **R7 friend schema missing** → Eric ratifies Path B (fallback) before execute; follow-up filed.
- **`html2canvas` exceeds bundle budget** → evaluate `dom-to-image-more`; if both fail, escalate to Eric (relax budget / server-side / strip features).
- **Gate-29 verse curation fails review** → Eric revises; re-ratifies; execute resumes. 5+ verse replacements = curation work escalates beyond routine HUMAN-IN-THE-LOOP.
- **Gate-34 brand-voice fails review** → revise specific strings; re-audit. Structural copy issues → spec returns to plan phase.
- **Playwright visual baseline rejected** → Eric's manual PNG review trumps snapshot; iterate; re-baseline.
- **Staging fails atomic invalidation** → diagnose `@CacheEvict` + transaction boundary; if 5.6's CacheConfig is at fault, surface to 5.6 follow-up.
- **Manual privacy review surfaces leak (Gate-31 / Gate-32 / Gate-35)** → Blocker. Fix immediately; re-verify; no merge until clean.

---

## Self-review checklist (spec-author final pass)

- [x] Spec ID matches the master plan exactly (`round3-phase06-spec01-prayer-receipt`)
- [x] All prerequisite specs listed (5.6 ✅ per R-OVR-S1; Phase 5 complete; Liquibase changesets 014/016 verified)
- [x] Universal Rules referenced where relevant (Decision 4 denormalized counters, master plan anti-pressure principles)
- [x] Database changes: **NONE** (W14; schema-realities recon confirmed no new tables/columns needed)
- [x] API changes include endpoint paths and HTTP methods (`GET /api/v1/posts/{id}/prayer-receipt`, `POST /api/v1/posts/{id}/prayer-receipt/share`)
- [x] Edit-window-bearing endpoints — N/A (6.1 has no edit endpoints)
- [x] User-generated-content endpoints — N/A (6.1 reads existing user content; no new posting surface)
- [x] New ActivityType values — N/A
- [x] Pattern A references — N/A (6.1 doesn't introduce or consume reactive stores)
- [x] Acceptance criteria are present and testable (22 master plan ACs + 25 brief expansion ACs + 3 follow-up ACs + 10 verification ACs)
- [x] Out of scope section exists (master plan body + brief expansion deferrals)
- [x] **Affected Frontend Routes section populated** — 3 routes plus internal modal/image surfaces enumerated
- [x] Recon Reality Overrides recorded (R-OVR-S1 Phase 5 status; R-OVR-S2 PrayerWallDashboard path; R-OVR-V1–V6 VERIFIED ratifications; R-OVR-N1 new-file paths clean; R-OVR-N2 R7–R16 deferred to plan-time)
- [x] No git mutations in spec body (brief § 1 / W1 compliance)
- [x] Master plan files-to-create paths preserved (modulo R-OVR-S2 correction for the modify list)
- [x] WEB Bible translation throughout
- [x] Single quotes throughout TS (W41)
- [x] Brief's design intent preserved verbatim (D-FetchPattern through D-Wordmark; MPD-1 through MPD-10; W1 through W49; Gates 29–35)
