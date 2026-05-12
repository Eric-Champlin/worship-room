# Spec 6.1 — Prayer Receipt

**Master plan ID:** `round3-phase06-spec01-prayer-receipt`
**Size:** L (per master plan; brief ratifies)
**Risk:** Medium (per master plan; brief ratifies — emotionally-loaded feature; getting the privacy model wrong causes real harm)
**Prerequisites:** 5.6 (Redis cache foundation) ⬜ — must ship; Phase 5 complete (all of 5.1–5.6 ✅)
**Tier:** xHigh

---

## 1. Branch discipline (CRITICAL)

**You are on a long-lived working branch named `forums-wave-continued`. Stay on it.**

Eric handles all git operations manually. Claude Code MUST NEVER run any of the following commands in this session, in any phase (recon, plan, execute, verify, review):

- `git checkout` / `git checkout -b`
- `git switch` / `git switch -c`
- `git branch`
- `git commit` / `git commit -am`
- `git push`
- `git stash` / `git stash pop`
- `git reset` (any flag)
- `git rebase`
- `git cherry-pick`
- `git merge`
- `gh pr create`, `gh pr merge`, `glab mr create`, etc.

If Claude Code believes a git operation is needed, surface it as a recommendation and STOP. Eric will execute manually.

The only acceptable git tooling Claude Code may invoke is read-only inspection: `git status`, `git diff`, `git log --oneline`, `git blame`, `git show <sha>`.

**Note:** 6.1 is a **full-stack feature** (frontend + backend + a new frontend dependency). Unlike 5.1–5.5 (frontend-only) or 5.6 (backend-only), 6.1 touches both halves of the codebase plus adds an external dependency (`html2canvas` per D-PNG). The diff spans `frontend/src/`, `backend/src/main/java/`, and one `.claude/rules/` doc.

---

## 2. Tier — xHigh

### Why xHigh

Three properties together put 6.1 squarely in xHigh territory:

1. **Privacy model has multiple subtle requirements** where any single failure produces real user harm. The master plan body's anti-pressure design section is load-bearing copy, not boilerplate. Specifically:
   - Receipt HIDDEN at zero intercessors (not "be the first to pray")
   - Non-friends NEVER shown by name to author (`A friend` attribution)
   - Non-authors NEVER see individual intercessor identities (403 from server)
   - Aggregate count is the SAME regardless of viewer (no inference possible)
   - Author can dismiss via settings; no shaming copy when dismissed
   - Failure on any one of these violates user trust. "Got it mostly right" is failure.

2. **Brand-defining visual surface.** The PNG-generated shareable receipt is what users post to Instagram or send to friends. It carries the Worship Room wordmark, the user's post excerpt, the intercession count, and the rotating scripture verse. The aesthetic and typography choices set a brand voice externally that exceeds Prayer Wall's internal visual surface. This is closer to designing a print-quality artifact than a UI component. Manual visual review by Eric is the gate.

3. **HUMAN-IN-THE-LOOP curation prerequisite.** The 60 curated WEB verses in `prayer-receipt-verses.ts` are not Claude-generated content. Per master plan plan-phase note #4: *"Confirm the 60 curated scripture verses — Eric should review the curated set before spec execution."* This is a HARD blocker on `/execute-plan-forums` — the verse list must be ratified by Eric before code-writing begins. The brief codifies this as Gate-29 (Section 6) and bakes Eric-curates-separately as the default flow per D-Verses (Section 7).

### Why not High

High is judgment work over a well-understood problem (5.6 was High because Redis integration is a known pattern). 6.1 has design judgment AND content curation AND privacy semantics AND a brand-defining output artifact. The curator's-call AC ("verses must read as gifts, not guilt-trips") is not High territory.

### Why not MAX

MAX is for override moments only — spec failures, scope explosions, recon ground truth wrong. None of those have occurred yet. The brief's design calls are bound to the master plan body's explicit anti-pressure principles; recon found no contradicting disk reality. xHigh covers the elevated judgment surface.

### Override moments that should bump 6.1 to MAX

- **html2canvas bundle exceeds 30KB gzipped budget** (master plan AC). Plan recon must verify. Alternatives: `dom-to-image-more` (smaller but less accurate per master plan note #1) or server-side generation (changes the entire approach — see D-PNG). Eric reviews if budget is missed.
- **Eric's verse curation review surfaces problems with the curated set** (e.g., a verse that reads as guilt-inducing on second look). The verse list gets revised before execute proceeds. This is a routine HUMAN-IN-THE-LOOP step, NOT a MAX moment — but if 5+ verses need replacement OR Eric concludes the curation framework itself needs rework (e.g., shorter verses, different theme buckets), the curation work escalates.
- **Plan recon discovers `posts.praying_count` denormalization is not atomically updated** on reaction insert/delete (i.e., there's a race condition between count update and cache invalidation). The privacy model requires count accuracy; if the denormalization is leaky, 6.1 either fixes it as a prerequisite or surfaces to Eric.
- **Friend-relationship schema doesn't support the author's-friends query** the brief assumes. Plan recon checks the friend schema (Spec 2.5 ships this; verification deferred to plan time per R-Friend). If missing, 6.1 either depends on Phase 2.5 (re-sequence) or implements with friends-list always empty (everyone shows as "A friend"). The fallback ("A friend" for everyone) is acceptable per anti-pressure design — but Eric should ratify the degraded path before it ships.
- **PrayerCard.tsx structure makes "render `<PrayerReceipt>` above InteractionBar when viewer is author" mechanically harder than expected.** Plan recon reads PrayerCard end-to-end; if the author-vs-viewer branch logic is tangled, the migration is non-trivial.
- **Anonymous-post receipts.** Master plan AC: *"Anonymous-posts author still sees receipts (they know they posted even if readers don't)."* If the existing anonymous-post implementation strips author_id from the post response, the author-vs-viewer detection breaks at the frontend. Plan recon checks.
- **Eric prefers server-side PNG generation** over client-side. Override D-PNG at brief review. The entire backend approach shifts (Java image lib via Sharp/imgscalr equivalent or a separate Node image service + storage + signed URL endpoint).
- **Dashboard mini-receipt design is undecided** when plan recon catalogs PrayerWallDashboard's existing layout. The mini-receipt visual is a new design surface that 6.1 introduces; if it doesn't have a clear canonical pattern, Eric reviews.

---

## 3. Visual + Integration verification — REQUIRED

6.1 is full-stack. Verification spans Playwright (frontend visual + interaction), Testcontainers (backend integration), and manual review by Eric (privacy semantics, brand voice, scripture curation, PNG aesthetic).

### Routes / surfaces to verify

1. `/prayer-wall/:postId` — author view: receipt renders above InteractionBar when `praying_count > 0`
2. `/prayer-wall/:postId` — author view: receipt is ABSENT when `praying_count = 0`
3. `/prayer-wall/:postId` — other-viewer view: receipt is ABSENT (no information leak)
4. `/prayer-wall/:postId` — other-viewer view: aggregate count IS visible elsewhere (existing UI continues to show count in the InteractionBar; the new receipt is author-only)
5. `/prayer-wall/:postId` — author view: tap the receipt count opens `<PrayerReceiptModal>`
6. `/prayer-wall/:postId` — author view: modal lists friends by display name, non-friends as "A friend"
7. `/prayer-wall/:postId` — author view: "Save as image" button generates a PNG
8. `/prayer-wall/dashboard` — own posts list shows mini-receipt summary (count only, no identities)
9. Settings page — `prayerReceiptsVisible` toggle works; off-state hides all receipts everywhere
10. Settings page — off-state shows NO "you've hidden receipts" shaming copy anywhere
11. Anonymous post — author still sees receipts on own anonymous post
12. Crisis post (if applicable per existing crisis-flag handling) — receipt behavior consistent with non-crisis posts

### Per-route Playwright scenarios (target: 18-22 scenarios)

**Author view scenarios:**

- Receipt renders nothing at praying_count=0 (component returns null; DOM has no receipt element)
- Receipt renders "1 person is praying for you" at praying_count=1
- Receipt renders "3 people are praying for you" at praying_count=3 with friend avatars stacked
- Receipt renders correctly at praying_count=10 (boundary)
- Receipt renders correctly at praying_count=23 (paginated modal)
- Friend's avatar shows with friend's display name; non-friend shows as "A friend" with generic gradient avatar
- Tapping count opens modal with focus trapped, Escape closes
- Modal arrow keys navigate between intercessor list items
- Scripture verse renders with Lora italic, smaller size, AA-contrast color (computed-style assertion)
- Same scripture verse appears for all users on the same UTC day (deterministic rotation)
- "Save as image" button generates a PNG (assert blob is created; assert PNG dimensions match expected aspect ratio)
- PNG contains post excerpt, count, verse, wordmark (visual regression snapshot)

**Other-viewer scenarios:**

- Non-author visiting another user's post: receipt is NOT in the DOM (no PrayerReceipt component rendered)
- Non-author visiting another user's post: aggregate count is still visible in InteractionBar (existing UI unchanged)
- Non-author attempting `GET /api/v1/posts/{id}/prayer-receipt` directly: 403 response
- Non-author cannot see intercessor identities via any UI path

**Privacy edge cases:**

- Author-friend who is ALSO an intercessor: appears in author's receipt by display name (they are a friend of the author)
- Two posts by different authors: receipts are independent; one author's receipt doesn't leak through to another's view
- Author logging out and back in as a different user: receipt visibility flips correctly per current viewer's identity
- Reaction toggle (Pray → un-Pray → Pray): receipt count resolves to current state, not transient

**Settings + accessibility:**

- Toggle `prayerReceiptsVisible` off: receipts hidden everywhere (PrayerCard, PrayerWallDashboard, modal entry point)
- Toggle off: NO copy anywhere says "you've hidden receipts" or similar shaming/reminder text
- Toggle off persistence: state survives page reload (localStorage in Phase 6 era; cross-device sync deferred to Phase 8)
- `role="status"` + `aria-live="polite"` on receipt element: screen reader announces count changes
- Modal accessibility: focus trap, Escape to close, arrow keys navigate, accessible names on avatars
- Color contrast: receipt text, count, scripture all meet WCAG AA (4.5:1 minimum)
- Share button is keyboard-accessible (Enter triggers; not solely click/gesture)

### Required Testcontainer integration scenarios (backend)

- `GET /api/v1/posts/{id}/prayer-receipt` returns 403 when `requester.user_id != post.author_id`
- Returns 200 with `{ total_count, attributed_intercessors: [...], anonymous_count }` when requester == author
- `attributed_intercessors` only includes friends of the author (verified by seeding a friend relationship and a non-friend reactor)
- `anonymous_count` = `total_count - attributed_intercessors.length`
- Anonymous-post author can fetch their own receipt (200; the anonymity flag doesn't strip author's own access to their own data)
- Response cached in Redis with 30s TTL (verified via `redisTemplate.getExpire(key)`)
- Cache invalidated when a reaction is inserted on the same post (verified by inserting a reaction post-fetch and confirming the next fetch returns updated data)
- Cache invalidated when a reaction is deleted on the same post
- Share rate-limited to 5 share-as-image requests per post per day per user (verified by 6th request returns 429)
- Scripture verse selection: same UTC day = same verse; verse rotation is deterministic across users

### Manual visual + design review (Eric)

- PNG output reads as a tangible artifact, not a screenshot. Typography, wordmark placement, scripture italic treatment all feel intentional.
- Receipt copy reads as gift, not metric. "3 people are praying for you" — not "You've received 3 prayers!"
- Scripture verses (60 in the curated set) all pass the gift-not-guilt test. Read each. Replace any that feel coercive.
- Anti-pressure principles enforced everywhere: zero receipts at zero intercessors, no rankings, no growth charts, no comparisons.
- Dashboard mini-receipt summary doesn't leak identity (visual review of friend-avatar visibility on the dashboard).
- Settings toggle reads as user-empowering, not apologetic.

### Verify-with-playwright is REQUIRED for 6.1

Unlike 5.6 (backend-only; Playwright skipped), 6.1 has substantial frontend surface. Full Playwright run is required after `/code-review`. See Section 16 for the verification handoff sequence.

<!-- CHUNK_BOUNDARY_1 -->

---

## 4. Master Plan Divergence

The master plan body for 6.1 is unusually detailed (163 lines, full Copy Deck, full Anti-Pressure Design Decisions, 22 ACs). Most of the brief ratifies the master plan rather than expanding it. The divergences below are the points where brief recon found disk reality that requires the master plan's framing to bend, plus the design calls the master plan left open as plan-phase notes.

### MPD-1 — Frontend data-fetching: native fetch, NOT React Query

Master plan body files-to-create: *`frontend/src/hooks/usePrayerReceipt.ts`*. The master plan body uses the term "hook" without specifying the data-fetching library.

**Recon finding (verified):** Worship Room frontend does NOT use React Query, Jotai, axios, or SWR. `frontend/package.json` shows the dependency list is:

```
clsx, howler, leaflet, lucide-react, react, react-dom, react-helmet-async,
react-leaflet, react-router-dom, recharts, tailwind-merge
```

No data-fetching library is present. Existing frontend hooks use native `fetch` + `useState` + `useEffect` for async data loading. Plan-time CC must read 2-3 existing hooks (likely under `frontend/src/hooks/`) to confirm the project convention.

**Brief's design call (D-FetchPattern): native fetch + useState/useEffect via thin custom hook.** 6.1 does NOT introduce React Query or any other data-fetching library. `usePrayerReceipt.ts` follows the existing project pattern — a small custom hook returning `{ data, loading, error, refetch }` (or whatever shape the existing hooks use — plan recon matches).

Reasons:

- 6.1 should not be the spec that introduces a new data-fetching library; that's an architectural decision deserving its own spec
- Native fetch is sufficient for the single endpoint 6.1 calls
- Bundle weight: React Query adds ~40KB gzipped — 6.1 already has a 30KB budget against html2canvas; can't afford another 40KB
- Existing hooks work; reinventing the data-fetching layer mid-feature dilutes both the feature and the architecture

If plan recon discovers a strong reason to introduce React Query (e.g., the existing patterns are awful and 6.1 is the natural cutover moment), surface to Eric as an override. Default: stay with native fetch.

### MPD-2 — html2canvas is a NEW dependency, hard ≤30KB gzipped budget

Master plan body, performance section: *"PNG generation is client-side; bundle-size impact tracked (target < 30 KB gzipped additional)."*

**Recon finding (verified):** `html2canvas` is NOT in `frontend/package.json` today. Neither is `dom-to-image-more`. Adding either is a NEW dependency.

**Brief's design call (D-PNG): client-side html2canvas, with bundle-budget guardrail.** Reasons:

- Eric's break-even-on-hosting goal: server-side PNG = backend compute + storage cost (Sharp/imgscalr image pipeline, S3 bucket, signed URL endpoint, TTL cleanup). Defeats the cost model.
- Client-side preserves privacy: receipt content never leaves the user's device until they explicitly share
- html2canvas is mature; the "device limitations" per master plan are mostly older-Safari edge cases the user can retry past
- The 30KB budget is a HARD constraint per AC. Plan recon verifies html2canvas's gzipped size; if it exceeds budget:
  - **Plan-time recon evaluates `dom-to-image-more`** (smaller, less accurate per master plan note #1)
  - **If dom-to-image-more also exceeds budget OR produces unacceptably degraded output**, escalate to Eric. Options: relax budget, switch to server-side, or strip features from the PNG content

Server-side generation is rejected as the default but remains an explicit override path if Eric prefers cross-device PNG consistency over the cost model.

**Bundle-budget verification mechanism:** Plan recon designs a test (likely a Vitest test using `import.meta.glob` or a build-output inspection script) that asserts the production bundle's gzipped delta from baseline is ≤30KB after the html2canvas import. The test fails the build if the budget is exceeded. This is Gate-30 (Section 6).

### MPD-3 — Friend-vs-non-friend classification is BACKEND-RESOLVED

Master plan body, what-author-sees section: *"If that person is a friend, their first name and avatar appear. If they're not, the receipt shows the count only."*

Master plan body, what-others-see section: *"They see the same aggregate count [...] but no identities at all. The UI is visually identical to a post with no receipt; only the count differs."*

Master plan body, anti-pressure section: *"Non-friend intercessors never attributed by name to the author."*

**Brief's design call (D-Friend-detection): backend classifies; frontend receives pre-classified response.** The `GET /api/v1/posts/{id}/prayer-receipt` response shape is:

```typescript
type PrayerReceiptResponse = {
  total_count: number;
  attributed_intercessors: Array<{
    user_id: string;       // friend's ID (only present for friends)
    display_name: string;  // friend's display name
    avatar_url: string | null;
  }>;
  anonymous_count: number; // non-friend intercessors (count only)
};
```

Where `total_count == attributed_intercessors.length + anonymous_count`. The frontend never sees non-friend user IDs, display names, or avatars — those values are never on the wire.

Reasons:

- **Privacy by construction.** A bug in the frontend cannot leak non-friend identities if those identities are never transmitted.
- **Smaller client bundle.** Frontend doesn't need a friend-relationship resolver or any friend-graph data.
- **Server is the source of truth for friendship.** The friend relationship table is the canonical authority; the frontend should never reconstruct or cache friend-graph state for this purpose.
- **Cache key simplicity.** Backend cache key is `cache:prayer-receipt:{postId}` (no per-viewer variation) because the response is the SAME for the author (only the author can fetch it; non-authors get 403). One cache entry per post.

The frontend just renders what the backend sends: friends by name, anonymous_count as "A friend" (or "...and N others" beyond the first 3 attributed avatars).

### MPD-4 — Verse curation is HUMAN-IN-THE-LOOP (Gate-29 hard block)

Master plan plan-phase note #4: *"Confirm the 60 curated scripture verses — Eric should review the curated set before spec execution."*

**Brief's design call (D-Verses): Eric curates the 60 verses HIMSELF in a separate session before plan-time.** The brief locks:

- **File path:** `frontend/src/constants/prayer-receipt-verses.ts`
- **Structure:** `export const PRAYER_RECEIPT_VERSES: ReadonlyArray<{ reference: string; text: string }> = [...]` with exactly 60 entries
- **Translation:** WEB (World English Bible) throughout, matching Worship Room's project-wide scripture convention
- **Length per verse:** Plan recon designs the constraint (rough target: under 200 characters per verse text to fit the PNG comfortably); Eric's curation respects the length budget
- **Content gate:** Each verse must pass the gift-not-guilt test per the anti-pressure design principles

**Gate-29 (Section 6) is a HARD BLOCK on `/execute-plan-forums`.** The execute command refuses to run until the verse list is ratified by Eric. Mechanism: Eric places the curated verses in the file at the path above, or in a sibling file (`prayer-receipt-verses-DRAFT.ts`) that plan-time CC moves into place after Eric signs off. Plan recon designs the exact handoff mechanism.

Reasons for HUMAN-IN-THE-LOOP:

- Verse curation is brand-voice and pastoral judgment, not engineering. Plan-time CC at xHigh tier is not well-positioned to make 60 separate "is this gift or guilt?" judgments.
- The verses ship with the product permanently. Wrong choices are durable; Eric's investment in curation is one-time but high-impact.
- Plan-time CC could PROPOSE a draft set as a starting point (option a from brief-pre-question Q2), but Eric defaulted to (b) — he curates separately. Brief honors that.

**If Eric reverses D-Verses and wants plan-time CC to propose a draft set:** override at brief review. Plan recon then includes "propose 60 WEB verses" as a deliverable, with Eric's review as a softer gate (still required, but plan output includes the draft).

### MPD-5 — Cache invalidation is ATOMIC with reaction insert/delete

Master plan AC: *"Redis cache TTL 30s (per 5.6) honored; cache invalidated on reaction toggle."*

Master plan plan-phase note #3: *"Verify Redis cache invalidation on reaction toggle is correctly wired (otherwise stale receipts)."*

**Brief's design call (D-Cache-invalidation): atomic invalidation in the same transaction as the reaction insert/delete + `praying_count` update.** The flow:

1. User taps Pray on a post
2. Backend transaction begins
3. Insert row into `post_reactions` (post_id, user_id, 'praying', now())
4. Increment `posts.praying_count` (denormalized counter, per Decision 4)
5. **Evict cache key `cache:prayer-receipt:{postId}`** (within the same transaction or via a transaction-completion hook)
6. Transaction commits
7. Next `GET /api/v1/posts/{id}/prayer-receipt` is a cache miss; backend re-queries; populates fresh entry

Un-Pray follows the symmetric path: delete reaction row, decrement count, evict cache, commit.

Reasons for atomic eviction over TTL-based eventual consistency:

- The privacy model requires count accuracy. A user taps Pray, the author refreshes and sees stale count, then sees fresh count 30 seconds later — the inconsistency itself is jarring and undermines the "someone is praying for you" feeling
- The 30s TTL is the floor (max staleness when no toggles happen), not the ceiling. Atomic eviction makes the typical staleness ~0ms
- Spring's `@CacheEvict` + `@Transactional` boundaries are the standard pattern; plan recon designs the exact annotation placement on the reaction-toggle service method

**Plan recon must verify:**

- The existing reaction-toggle service method (likely `ReactionsService` or similar under `backend/src/main/java/com/worshiproom/post/engagement/`)
- Whether the `posts.praying_count` increment is in the SAME transaction as the `post_reactions` insert (this is presumably true per Decision 4, but verify)
- The Spring caching abstraction in use after 5.6 ships (`@CacheEvict("prayer-receipt", key = "#postId")` is the natural shape, but exact syntax depends on 5.6's CacheConfig conventions)

### MPD-6 — Scripture rotation: day-of-year % 60, UTC day boundary

Master plan AC: *"Daily-rotating scripture verse renders and is identical for all users on the same UTC day."*

**Brief's design call (D-Scripture-rotation): deterministic `dayOfYear(currentUtcDate) % 60` index into the curated verse list.** Same verse for all users on the same UTC day. No personalization. No per-post variation. No history.

Frontend computation (preferred, per D-FetchPattern — keeps backend stateless and cacheable):

```typescript
function getTodaysVerse(date: Date = new Date()): Verse {
  // UTC day of year, 1-366
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start;
  const dayOfYear = Math.floor(diff / 86400000);
  return PRAYER_RECEIPT_VERSES[(dayOfYear - 1) % 60];
}
```

Plan recon refines the exact algorithm; the brief commits the principle.

Reasons for frontend computation:

- The verse data is on the frontend (curated list lives in `prayer-receipt-verses.ts`)
- Computation is trivial; no backend round-trip needed
- Deterministic per UTC day: testable, predictable, no clock-skew issues
- Year-boundary handling: day 366 → day 1 transition rolls correctly because of `% 60`

**Plan recon must verify:**

- Day-of-year computation handles leap years correctly
- UTC day boundary is consistent (the user in Hawaii at 11pm local time sees the same verse as the user in London at 11am local time, IF both are within the same UTC day)
- Test asserts the rotation: mock `Date.now()` to specific UTC days; verify verse index matches expected

**Alternative considered (and rejected):** backend computes and includes the verse in the receipt response. Rejected because (a) the verse data lives on the frontend, (b) adds payload weight to every response, (c) requires backend to know the curated verse list (introduces coupling between frontend content and backend logic).

### MPD-7 — Share endpoint uses EXISTING per-domain rate-limit pattern, NOT the new RateLimiter interface from 5.6

Master plan AC: *"Share rate-limited to 5 per post per day (integration test verifies 6th returns 429)."*

**Recon finding (verified per Spec 5.6 brief):** 5.6 introduces the new `RateLimiter` interface as INFRASTRUCTURE but does NOT migrate any existing service to consume it (strangler pattern, per 5.6 D1). Existing rate-limit services (UploadRateLimitService, ReactionsRateLimitService, etc.) continue to use their per-service bucket4j+Caffeine pattern.

**Brief's design call (D-RateLimit-pattern): share-as-image endpoint follows the EXISTING per-service rate-limit pattern.** 6.1 creates `PrayerReceiptShareRateLimitService.java` (or similar; plan recon picks the exact name) using the same bucket4j+Caffeine pattern as the 10+ existing rate-limit services. It does NOT consume the new `RateLimiter` interface from 5.6.

Reasons:

- 5.6's strangler pattern explicitly defers per-service migration. 6.1 isn't the spec to start migrating; that's a follow-up to 5.6 (Spec 5.7+).
- Consistency: other engagement endpoints (Pray, Comment, Bookmark) use per-service rate limiters. The share endpoint matches the project's existing convention.
- Lower risk: introducing the new interface for ONE consumer requires confidence that the interface is sound. The contract test in 5.6 validates parity, but a single-consumer migration is still a riskier path than the established pattern.
- The share endpoint's needs are simple: 5 requests per post per user per day. Per-service bucket4j+Caffeine handles this trivially; no cross-instance state is required at hobby scale (and the share endpoint isn't security-critical the way LoginRateLimitFilter is).

If Eric wants 6.1 to be the first consumer of the new `RateLimiter` interface (validating the strangler-to-adoption transition), override at brief review. The brief default is consistency-with-existing.

### MPD-8 — PNG generation is component-rendered then captured, NOT canvas-drawn

Master plan body files-to-create: *`frontend/src/components/prayer-wall/PrayerReceiptImage.tsx` (render-to-PNG)*.

**Brief's design call (D-PNG-approach): render `PrayerReceiptImage` as a hidden DOM element, then html2canvas captures it.** Not canvas-API drawing.

```typescript
// Roughly:
function handleSaveAsImage() {
  const node = ref.current; // <PrayerReceiptImage> mounted hidden in DOM
  html2canvas(node, { backgroundColor: null, scale: 2 })
    .then(canvas => canvas.toBlob(blob => /* download or share */));
}
```

Reasons:

- Tailwind/CSS for layout: the receipt design uses Tailwind utilities, Lora italic for scripture, the brand wordmark — all CSS-driven. Re-implementing all of that in `<canvas>` drawing primitives is enormous work
- The component IS the design: PrayerReceiptImage.tsx is the same React component logic that drives the on-screen receipt, just at a fixed share-card size (likely 1080×1080 or 1200×630 — plan recon picks)
- Maintainability: if the receipt visual evolves in future specs, the canvas-draw approach requires re-doing the drawing logic; the render-then-capture approach updates automatically with the component
- html2canvas handles fonts, gradients, shadows, custom CSS reasonably well in modern browsers (older Safari is the edge case)

**Plan recon must verify:**

- Web font loading: html2canvas needs fonts to be loaded BEFORE capture. Lora needs to be available in the DOM at capture time. Plan recon designs the wait-for-fonts step (`document.fonts.ready` Promise)
- The hidden mount: PrayerReceiptImage renders off-screen (CSS `position: fixed; left: -9999px;` or similar) at the share-card size, not in the visible viewport
- The export pipeline: blob → `URL.createObjectURL` → `<a download>` for save; or `navigator.share()` API for native share sheet on mobile (plan recon evaluates browser support)

### MPD-9 — Settings toggle persistence is localStorage only (Phase 6 era), not cross-device

Master plan AC: *"Dismissed-setting state persists across devices via Phase 8 settings sync (or localStorage in Phase 6 era)."*

**Brief's design call (D-Settings-persistence): localStorage only in 6.1; cross-device sync deferred to Phase 8.** The setting key is `wr_settings.prayerWall.prayerReceiptsVisible` (or whatever the existing `wr_settings` localStorage convention nests as — plan recon reads `.claude/rules/11-local-storage-keys.md` for the canonical structure).

Reasons:

- Phase 8 is the settings-sync phase per master plan sequencing. 6.1 doesn't pre-implement Phase 8 infrastructure.
- localStorage is sufficient for hobby-scale single-device use
- Cross-device divergence in Phase 6 is acceptable: user toggles off on phone, opens laptop, still sees receipts — not great but not user harm. Phase 8 fixes.

**The brief's deliverable:** add `prayerWall.prayerReceiptsVisible` entry to `.claude/rules/11-local-storage-keys.md` documenting the new key and its default (`true`). Plan recon reads the existing `wr_settings` structure (likely a single localStorage key holding a JSON blob with nested settings) and adds the new field per existing conventions.

### MPD-10 — Dashboard mini-receipt is count-only (no identity leakage by design)

Master plan body, files-to-modify: *`PrayerWallDashboard.tsx` — receipt summary on the dashboard posts list*.

Master plan AC: *"Receipt visible on the author's dashboard summary (non-expanded mini-version showing just total count, no identity)."*

**Brief's design call (D-Dashboard-mini): mini-receipt shows count + scripture verse, no avatars, no friend names.** The mini-receipt is the gentle reminder on the dashboard; the full receipt with friend avatars + modal lives on the post detail page (`/prayer-wall/:postId`).

Reasons:

- Dashboard is a high-density list view; avatar stacks would clutter
- Identity content lives ONE place (the per-post receipt modal). The dashboard mini is a teaser; tapping the post navigates to the full receipt.
- Defense in depth on privacy: even if the dashboard ever ended up in a public-facing screenshot, the mini-receipt would never leak identities because identities aren't there

**Visual design of the mini-receipt is a NEW surface** that 6.1 introduces. Plan recon catalogs PrayerWallDashboard's existing post-card layout; if the layout has space for a single-line accent ("3 people are praying • [scripture verse line]"), that's the canonical pattern. Otherwise plan recon proposes a layout for Eric's review.

---

## 5. Recon Ground Truth (2026-05-12)

Each finding marked **VERIFIED** (verified on disk by brief author; trust this in the spec) or **PLAN-RECON-REQUIRED** (brief author could not verify end-to-end; plan-time CC reads at plan time and produces the catalog or finding then). Per the R-OVR pattern, if any VERIFIED finding turns out to be wrong on disk at plan time, the spec records an R-OVR entry; the brief's design intent stands.

### R1 — Frontend stack: native fetch, no React Query/Jotai/axios — VERIFIED

`frontend/package.json` dependency list (lines 22-34):

```
clsx, howler, leaflet, lucide-react, react (^18.3.x), react-dom, react-helmet-async,
react-leaflet, react-router-dom, recharts, tailwind-merge
```

No `@tanstack/react-query`, no `jotai`, no `axios`, no `swr`. Frontend is React 18.3 + Vite 5.4 + TypeScript 5.6 + Tailwind 3.4 (not 4 — worth noting).

Dev deps include: `@axe-core/playwright`, `@playwright/test`, `@testing-library/*`, `vitest`, `vite-plugin-pwa`, `workbox-*`. So Playwright + axe-core + Vitest + RTL are all available for 6.1's tests.

Plan recon must read 2-3 existing hooks (likely under `frontend/src/hooks/`) to confirm the project's native-fetch convention before writing `usePrayerReceipt.ts`.

### R2 — No html2canvas / dom-to-image-more in deps — VERIFIED

Neither package is in `frontend/package.json`. Adding html2canvas is a NEW dependency for 6.1 (per D-PNG / MPD-2).

Plan recon must verify html2canvas's current gzipped bundle size (the npm registry / bundlephobia data is the source). If exceeds 30KB, evaluate `dom-to-image-more`. If both exceed, escalate per MAX override moments.

### R3 — `post_reactions` table schema — VERIFIED

`backend/src/main/resources/db/changelog/2026-04-27-016-create-post-reactions-table.xml` (changeset id `2026-04-27-016-create-post-reactions-table`):

- Composite PK on `(post_id, user_id, reaction_type)` — free deduplication: one row per reaction-type per user per post
- `CHECK` constraint restricts `reaction_type` to `('praying', 'candle')`
- Plan recon reads the full changeset to confirm column names, FK references, and timestamps

6.1's backend reads `post_reactions` WHERE `post_id = ? AND reaction_type = 'praying'` to enumerate intercessors. The PrayerReceiptService also joins to the friend-relationship table (R7) to classify friends vs non-friends.

### R4 — `posts.praying_count` denormalized column — VERIFIED

`backend/src/main/resources/db/changelog/2026-04-27-014-create-posts-table.xml` line 59:

```xml
<column name="praying_count" type="INTEGER" defaultValueNumeric="0">
  <constraints nullable="false"/>
</column>
```

The column is the canonical count source per Decision 4 (denormalized counters). 6.1's PrayerReceipt total_count comes from this column — no `COUNT(*)` query needed on every receipt fetch.

**Plan recon must verify:** the increment/decrement logic on this column. The reaction-toggle service (likely `ReactionsService.java`) must atomically increment `praying_count` when a row is inserted into `post_reactions` with `reaction_type = 'praying'`, and decrement on delete. Plan recon reads the existing service to confirm atomicity and to identify the exact spot for the `@CacheEvict` per MPD-5.

### R5 — `InteractionBar.tsx` exists with `prayer` + `reactions` props — VERIFIED

`frontend/src/components/prayer-wall/InteractionBar.tsx` exists. Props include:

```typescript
prayer: PrayerRequest
reactions: PrayerReaction | undefined
```

Plus styling: `'flex items-center gap-1 text-sm min-h-[44px] min-w-[44px] justify-center transition-[colors,transform...'` (truncated in recon output).

The InteractionBar is where the Pray button lives today. 6.1's PrayerReceipt component mounts ABOVE InteractionBar within PrayerCard, conditional on `viewer.user_id === post.author_id && praying_count > 0`.

**Plan recon must read `InteractionBar.tsx` end-to-end** to understand:

- How the Pray reaction is wired (mutation pattern, optimistic update?)
- How `reactions` prop is fed in (parent fetches reactions, or InteractionBar fetches internally?)
- The transition-[colors,transform] animation (so PrayerReceipt's pulse animation can be coordinated; master plan AC mentions animated count changes)

### R6 — Mock seed data exists — VERIFIED

`backend/src/main/resources/db/changelog/contexts/2026-04-27-021-prayer-wall-mock-seed.xml` seeds posts with `praying_count: 0` defaults. 6.1's integration tests can either reuse this seed or define their own via Testcontainers.

For Playwright tests requiring intercessors, the test setup needs to seed both posts AND post_reactions rows. Plan recon designs the test seed strategy (likely a `PrayerReceiptTestSeed.java` utility).

### R7 — Friend-relationship schema — PLAN-RECON-REQUIRED

Master plan body assumes a friend relationship exists between users, queryable from the backend (so PrayerReceiptService can classify intercessors as friends or non-friends).

Friend schema ships in **Phase 2.5** per master plan sequencing. The brief author did not verify Phase 2.5 status on disk.

**Plan recon must verify:**

- Is there a `friendships` (or `friends`, or similar) table in `backend/src/main/resources/db/changelog/`?
- If yes: what's the schema? `(user_id_a, user_id_b, status, created_at)` or directional `(follower_id, followee_id)` or symmetric?
- Is there a query API for "is user X a friend of user Y?" (likely a `FriendshipService` or `FriendshipRepository`)?

**Two recovery paths if friend schema is missing:**

- **Path A: Depend on Phase 2.5.** Re-sequence: 6.1 blocks on 2.5 shipping. This is the cleanest but delays 6.1.
- **Path B: Implement with friends-list always empty.** PrayerReceiptService treats EVERYONE as non-friend. The author sees "3 people are praying for you" with all 3 attributed as "A friend" (the generic gradient avatar). Functionally degraded but anti-pressure-compliant (the "A friend" attribution is already the project's stance for unknown intercessors). Eric ratifies this fallback before it ships.

The brief surfaces the recovery paths; plan-time CC picks one based on disk reality.

### R8 — PrayerCard.tsx structure — PLAN-RECON-REQUIRED

The brief author did not read `frontend/src/components/prayer-wall/PrayerCard.tsx` end-to-end. Master plan modify list says: *"PrayerCard.tsx — render `<PrayerReceipt>` above InteractionBar when viewer is author."*

**Plan recon must:**

- Read PrayerCard.tsx in full
- Identify how `viewer.user_id` is plumbed in (likely a `useCurrentUser()` hook or via context)
- Identify where InteractionBar mounts in the component tree
- Identify if there's an existing author-vs-viewer branch (anonymous posts probably have one)
- Catalog the existing layout so PrayerReceipt slots in cleanly without restructuring

If the author-vs-viewer logic is tangled, plan recon proposes refactoring as a 6.1 deliverable OR as a prerequisite spec. Default: refactoring is in-scope for 6.1 if minor; out-of-scope and surfaced to Eric if substantial.

### R9 — PrayerWallDashboard layout — PLAN-RECON-REQUIRED

Master plan modify list: *"PrayerWallDashboard.tsx — receipt summary on the dashboard posts list."*

The brief author did not read `frontend/src/components/prayer-wall/PrayerWallDashboard.tsx`. Plan recon reads it end-to-end to:

- Identify the per-post card layout on the dashboard
- Find the natural insertion point for the mini-receipt (per D-Dashboard-mini)
- Catalog existing accent treatments (post type badges, timestamps, etc.) so the mini-receipt visual coheres with the existing card

### R10 — Settings page location — PLAN-RECON-REQUIRED

Master plan modify list: *"Settings page — add `prayerReceiptsVisible` toggle with helper copy."*

The brief author did not locate the Settings page on disk. Plan recon searches `frontend/src/pages/` (or wherever Worship Room organizes pages) for `Settings.tsx` or `SettingsPage.tsx` or similar. Reads the existing toggle pattern (likely there are other settings toggles already — audio prefs, notification prefs) and matches the new toggle's visual + interaction to existing.

Helper copy per master plan Copy Deck: *"Turn this off if you'd rather not see who's praying for you right now. You can turn it back on anytime."*

### R11 — localStorage `wr_settings` structure — PLAN-RECON-REQUIRED

Master plan modify list: *`.claude/rules/11-local-storage-keys.md` — document `wr_settings.prayerWall.prayerReceiptsVisible`*.

The brief author did not read `.claude/rules/11-local-storage-keys.md`. Plan recon reads it to understand:

- The canonical `wr_settings` schema (likely a single localStorage key with a JSON-blob value containing nested settings)
- The existing namespace conventions (e.g., is there already a `wr_settings.prayerWall.*` namespace, or does 6.1 introduce it?)
- The default-value declaration pattern
- The migration pattern (if older clients have an older settings shape, how do they upgrade?)

The new key `wr_settings.prayerWall.prayerReceiptsVisible` defaults to `true` per master plan AC.

### R12 — Existing API call patterns — PLAN-RECON-REQUIRED

The brief author did not verify how Worship Room's frontend calls backend endpoints. Plan recon reads 1-2 existing hooks/components that fetch from `/api/v1/*` to identify:

- Auth header / JWT injection pattern
- Error handling conventions (try-catch shape, error display, retry?)
- Loading-state conventions
- URL construction (base URL configurable via env var, or hardcoded?)

`usePrayerReceipt.ts` matches the existing convention.

### R13 — Anonymous-post implementation — PLAN-RECON-REQUIRED

Master plan AC: *"Anonymous-posts author still sees receipts (they know they posted even if readers don't)."*

The brief author did not verify how anonymous posts are implemented. Plan recon reads:

- The `posts` table schema for an `is_anonymous` flag or similar (likely from `2026-04-27-014-create-posts-table.xml`)
- The PostController / PostService response shape: does the API return `author_id` when the post is anonymous, or is it stripped?
- The author-detection logic on the backend: does PrayerReceiptController identify the author via `posts.author_id` directly, regardless of anonymity flag?

**Expected design:** the anonymity flag affects what NON-AUTHORS see (anonymous posts hide the author from non-authors), but the backend always knows the actual author_id (stored in `posts.author_id` regardless of `is_anonymous`). PrayerReceiptController uses `posts.author_id` for the 403 check; the author can fetch their own receipt regardless of anonymity. Plan recon verifies.

### R14 — Crisis-flag handling — PLAN-RECON-REQUIRED

6.1 Playwright scenario list includes: *"Crisis post — receipt behavior consistent with non-crisis posts."*

The brief author did not verify how crisis-flagged posts are handled in the existing UI (post layout, visibility, etc.). Plan recon reads the crisis-flag handling to confirm 6.1's receipt does not need special behavior for crisis posts (the brief assumes it doesn't — a crisis post is still a post, the author still sees receipts).

### R15 — Existing reaction-toggle service — PLAN-RECON-REQUIRED

Per MPD-5, plan recon must read the existing reaction-toggle service (likely `ReactionsService.java` under `backend/src/main/java/com/worshiproom/post/engagement/`) to:

- Confirm `posts.praying_count` is atomically updated with `post_reactions` insert/delete
- Identify the exact transaction boundary for `@CacheEvict` placement
- Verify there's no existing cache (Caffeine or in-memory) that 6.1's eviction logic conflicts with

### R16 — Existing PostController structure — PLAN-RECON-REQUIRED

6.1 creates `PrayerReceiptController.java` as a NEW controller. Plan recon reads the existing `PostController.java` to:

- Match the controller convention (annotation style, base path, error handling, request validation)
- Identify the auth filter pattern (how does `@AuthenticationPrincipal` or similar plumb the current user into the request?)
- Confirm the path `GET /api/v1/posts/{id}/prayer-receipt` doesn't conflict with existing routes

Alternative: PrayerReceipt could be a method on the existing PostController. Plan recon decides whether a new controller or a method addition is the cleaner pattern. Default per master plan: new controller (`PrayerReceiptController.java`).

<!-- CHUNK_BOUNDARY_2 -->

---

## 6. Phase 3 Execution Reality Addendum gates — applicability

The Phase 3 Execution Reality Addendum was authored for visual / chrome migration work. 6.1 is full-stack feature work that includes a visual surface (the receipt component + modal + PNG) plus a privacy-critical backend layer. Gates 1-22 (Prayer Wall visual migration gates) partially apply; Gates 23-28 (5.6's backend infrastructure gates) partially apply; Gates 29-34 (NEW for 6.1) introduce feature-specific privacy and curation gates.

| Gate | Description | 6.1 applicability |
|------|-------------|-------------------|
| Gates 1-7 | Standard visual/chrome migration gates | **PARTIAL** — PrayerReceipt + PrayerReceiptModal are new visual components; apply migration gates to their styling (FrostedCard composition if applicable, opacity normalization per 5.5, etc.) |
| Gate 17 | Universal Rule 17 axe-core (visual a11y) | **APPLIES** — receipt + modal + share button + dashboard mini all pass axe-core with zero violations |
| Gate 18 | Visual parity gate | **N/A** — PrayerReceipt is new; no parity baseline to match (but the PNG output has its own visual regression baseline once shipped) |
| Gate 19 | Brand voice gate | **APPLIES** — EVERY copy string in the receipt, modal, settings, and PNG passes the gift-not-guilt test (Section 13 brand voice review) |
| Gate 20 | `prefers-reduced-motion` preservation | **APPLIES** — PrayerReceipt's count-change pulse animation respects `prefers-reduced-motion: reduce` (no pulse when reduced) |
| Gate 21 | Lighthouse Performance | **APPLIES** — receipt fetch + render does not regress LCP, FID, CLS on prayer-wall routes; PNG generation is on-demand only (never on initial render) |
| Gate 22 | Daily Hub Catalog (5.5 innovation) | **N/A** — 6.1 doesn't touch Daily Hub; PrayerReceipt visual conforms to 5.5's canonical Prayer Wall patterns post-purge |
| Gate 23 (5.6) | Testcontainer-based Redis integration test — no Redis mocking | **APPLIES** — PrayerReceipt's Redis cache + eviction logic tested via Testcontainer |
| Gate 24 (5.6) | Contract test parity between InMemoryRateLimiter and RedisRateLimiter | **N/A** — 6.1 doesn't consume the new RateLimiter interface per D-RateLimit-pattern |
| Gate 25 (5.6) | Every Redis SET has explicit TTL (repo-wide grep test) | **APPLIES** — the 30s cache entry for `cache:prayer-receipt:{postId}` has explicit TTL |
| Gate 26 (5.6) | Circuit breaker engagement + recovery | **N/A directly** — 5.6 owns the circuit breaker; 6.1 consumes via CacheManager. 6.1's tests assume the circuit breaker works (tested in 5.6). 6.1 verifies that with Redis down, the receipt endpoint degrades to a direct query (no cache) and continues serving — this is Gate-26's downstream consumer verification. |
| Gate 27 (5.6) | Health endpoint reports DEGRADED when Redis unreachable | **N/A** — 5.6 owns the health endpoint |
| Gate 28 (5.6) | No new rate-limit service is migrated in 5.6 — strangler pattern preserved | **CONSUMER OF** — 6.1 honors the strangler pattern by following the existing per-service rate-limit pattern (D-RateLimit-pattern), not consuming the new interface |
| **Gate 29 (NEW for 6.1)** | Verse curation ratified by Eric before `/execute-plan-forums` runs (HARD BLOCK) | **APPLIES** |
| **Gate 30 (NEW for 6.1)** | PNG generation bundle delta is ≤30KB gzipped, verified by build-output test | **APPLIES** |
| **Gate 31 (NEW for 6.1)** | Non-author requesting `GET /api/v1/posts/{id}/prayer-receipt` returns 403, verified by integration test | **APPLIES** |
| **Gate 32 (NEW for 6.1)** | Friend-vs-non-friend classification happens server-side; frontend wire format contains zero non-friend identity data | **APPLIES** |
| **Gate 33 (NEW for 6.1)** | Cache invalidation is atomic with reaction insert/delete; no stale-count window beyond commit | **APPLIES** |
| **Gate 34 (NEW for 6.1)** | Anti-pressure copy review: every user-facing string in receipt + modal + PNG + settings passes Eric's gift-not-guilt audit | **APPLIES** |
| **Gate 35 (NEW for 6.1)** | Zero receipts at zero intercessors — component returns null, no "be the first to pray" empty state, no "no one has prayed yet" copy anywhere | **APPLIES** |

Gate-29 and Gate-34 are **HUMAN-IN-THE-LOOP** gates that Eric satisfies manually before execute/merge respectively. The other gates are automated (Playwright, integration tests, build-output assertions).

Gate-29 codifies D-Verses. Gate-30 codifies D-PNG's budget constraint. Gates 31-32 codify the privacy model. Gate-33 codifies D-Cache-invalidation. Gate-34 codifies the brand voice. Gate-35 codifies the anti-pressure principle's most load-bearing rule.

---

## 7. Decisions catalog

Quick-reference catalog of every D-decision baked into the brief. Each entry's full reasoning lives in its corresponding MPD (Section 4). This section is the lookup table.

| ID | Decision | Source | One-line rationale |
|----|----------|--------|---------------------|
| **D-FetchPattern** | Native fetch + useState/useEffect via thin custom hook; NO React Query | MPD-1 | Project doesn't use React Query; 6.1 isn't the spec to introduce it |
| **D-PNG** | Client-side html2canvas, ≤30KB gzipped budget | MPD-2 | Server-side defeats free-tier hosting; client-side preserves privacy; budget is HARD per AC |
| **D-Friend-detection** | Backend classifies friends vs non-friends; frontend gets pre-classified response with zero non-friend identity data | MPD-3 | Privacy by construction; frontend bug can't leak what frontend never receives |
| **D-Verses** | Eric curates 60 WEB verses himself in separate session; brief locks file path + structure; Gate-29 HARD BLOCK | MPD-4 | Brand-voice/pastoral judgment, not engineering recon |
| **D-Cache-invalidation** | `@CacheEvict` atomic with `post_reactions` insert/delete + `praying_count` update in same transaction | MPD-5 | TTL is the floor not the ceiling; user-tap-then-refresh staleness window is jarring |
| **D-Scripture-rotation** | Frontend computes `dayOfYear(utcDate) % 60`, indexes curated verse list | MPD-6 | Verse data lives on frontend; computation is trivial; backend stays stateless |
| **D-RateLimit-pattern** | Share endpoint uses existing per-service bucket4j+Caffeine pattern (NEW `PrayerReceiptShareRateLimitService.java`); NOT the new RateLimiter interface from 5.6 | MPD-7 | 5.6 strangler defers per-service migration; 6.1 honors the strangler |
| **D-PNG-approach** | Render `PrayerReceiptImage` as hidden DOM element at share-card size; html2canvas captures it; NOT canvas-API drawing | MPD-8 | Component IS the design; CSS/Tailwind can't be re-implemented in canvas primitives without enormous work |
| **D-Settings-persistence** | localStorage only in 6.1; cross-device sync deferred to Phase 8 | MPD-9 | Phase 8 is the settings-sync phase per master plan sequencing |
| **D-Dashboard-mini** | Mini-receipt on dashboard shows count + scripture verse; NO avatars, NO friend names | MPD-10 | Identity content lives one place; dashboard is a teaser; defense in depth |
| **D-Auth-gate** | `GET /api/v1/posts/{id}/prayer-receipt` returns 403 if `requester.user_id != post.author_id`. Hard server-side gate. Frontend renders nothing on 403. | NEW | Privacy gate enforced server-side; frontend conditional is defense in depth, not the primary control |
| **D-Aria-live** | Receipt component is `role="status"` + `aria-live="polite"` so screen readers announce count changes when the page is open | NEW | Master plan AC; this is the canonical pattern for non-disruptive live region updates |
| **D-Hidden-at-zero** | Receipt component returns `null` when `praying_count === 0`. No "be the first" empty state. No "no one has prayed yet" copy anywhere in the entire codebase. | NEW | Master plan anti-pressure principle (load-bearing); codified as Gate-35 |
| **D-Friend-fallback** | If friend schema is missing (R7), implement with friends-list always empty (everyone = "A friend"). Acceptable per anti-pressure design; Eric ratifies before ship. | NEW | Two-path recovery in case Phase 2.5 hasn't shipped |
| **D-Brand-voice** | Every user-facing string is "gift not guilt." No exclamation points near receipt counts. No comparison framing. No urgency framing. No "you've received N prayers" metric framing. | NEW | Master plan Anti-Pressure Copy Checklist; codified as Gate-34 |
| **D-Lora-italic** | Scripture verse renders in Lora italic at smaller size than count copy, WCAG AA contrast (4.5:1). Same treatment in on-screen receipt AND in PNG. | NEW | Master plan AC; canonical scripture treatment for Worship Room |
| **D-PNG-size** | Generated PNG is 1080×1080 pixels (Instagram square) OR 1200×630 (Twitter/X card) — plan recon picks the default and considers offering both | NEW | Common shareable-card aspect ratios; plan-time CC verifies |
| **D-Wordmark** | PNG includes "Worship Room" wordmark in the footer area, not loudly branded. Matches the existing site wordmark style. | NEW | Master plan Copy Deck: "Shareable card footer: 'Worship Room'" |

### Override candidates

Decisions Eric is most likely to override at brief review:

- **D-PNG** → server-side PNG (if Eric values cross-device PNG consistency over hosting cost)
- **D-Verses** → plan-time CC proposes a draft set (if Eric wants a starting point to react to rather than curate from scratch)
- **D-RateLimit-pattern** → first consumer of new RateLimiter interface (if Eric wants 6.1 to be the strangler-to-adoption transition spec)
- **D-Settings-persistence** → Phase 8 sync inline (if Phase 8 ships earlier than expected and Eric wants 6.1 to consume it)

Decisions Eric is unlikely to override but worth surfacing:

- **D-FetchPattern** is foundational; flipping to React Query is a separate architectural spec
- **D-Friend-detection** is the privacy model; flipping to client-side classification would require fundamental redesign
- **D-Hidden-at-zero** is load-bearing anti-pressure; flipping would change the entire feature's tone
- **D-Brand-voice** is non-negotiable per the project's identity

<!-- CHUNK_BOUNDARY_3 -->

---

## 8. Watch-fors

Organized by theme. Each W is a thing plan-time CC, execute-time CC, or code-review CC must guard against.

### Discipline

**W1 — Branch discipline.** Stay on `forums-wave-continued`. Never run git mutations. See Section 1.

**W2 — 5.6 must ship before 6.1 execution.** 5.6 status: ⬜. The 6.1 spec can be AUTHORED in parallel (specs serialize separately from execution), but `/execute-plan-forums spec-6-1` is BLOCKED until 5.6 ships and merges to `forums-wave-continued`. Plan recon confirms 5.6 status before unblocking execution.

**W3 — Phase 5 must be complete.** All of 5.1–5.6 ✅ before 6.1 execution. Per master plan prerequisite. Plan recon checks `_forums_master_plan/spec-tracker.md` for Phase 5 status before unblocking.

### HARD BLOCKS — codified gates

**W4 — Gate-29: Verse curation ratified by Eric.** The 60 WEB verses in `frontend/src/constants/prayer-receipt-verses.ts` must be ratified by Eric before `/execute-plan-forums` runs. Plan recon designs the ratification mechanism (likely a sibling DRAFT file Eric reviews then renames, or an explicit signal in spec-tracker). Execute REFUSES until ratified.

**W5 — Gate-30: PNG bundle budget ≤30KB gzipped.** A Vitest test (or build-output assertion script) measures the delta from baseline after the html2canvas import. If ≤30KB, pass. If >30KB, build fails. Plan recon designs the test.

**W6 — Gate-31: Non-author 403.** Integration test verifies `GET /api/v1/posts/{id}/prayer-receipt` returns 403 when `requester.user_id != post.author_id`. Test ASSERTS the 403 status code AND asserts the response body contains no intercessor data.

**W7 — Gate-32: Server-side friend classification.** Integration test verifies the response wire format contains ZERO non-friend identity data. Specifically: `anonymous_count` is a number; `attributed_intercessors` is a list of friends only; no field anywhere in the response carries non-friend user_ids, display names, or avatar URLs. Test asserts by checking the response body shape against a strict schema.

**W8 — Gate-33: Atomic cache invalidation.** Integration test inserts a `post_reactions` row, then immediately fetches the receipt, then asserts the response reflects the new count (NOT a stale count). Subsequent fetches return the same fresh data until the next reaction toggle or 30s TTL expiry.

**W9 — Gate-34: Anti-pressure copy review.** Eric reviews every user-facing string before merge. This is a manual gate; plan recon enumerates ALL user-facing strings in the spec (receipt count copy, modal header, scripture rotation, share button, settings toggle, settings helper, PNG copy) so Eric reviews each in context.

**W10 — Gate-35: Hidden at zero.** The Playwright test asserts: when `praying_count === 0`, the PrayerReceipt component is NOT in the DOM. No `data-testid="prayer-receipt"` element exists. No "be the first to pray" copy anywhere. No "no one has prayed yet" copy anywhere. Repeating: the test asserts ABSENCE, not the presence of an empty state.

### Architectural constraints — what NOT to introduce

**W11 — No React Query / Jotai / axios / SWR (D-FetchPattern / MPD-1).** Native fetch + useState/useEffect is the project convention. 6.1 does NOT introduce a data-fetching library. If plan-time CC proposes React Query "because the receipt benefits from invalidation," reject — the backend-side @CacheEvict + 30s TTL handles invalidation; the frontend just re-fetches on natural triggers (modal open, settings toggle, page mount).

**W12 — ONLY html2canvas (or dom-to-image-more fallback); NO server-side PNG (D-PNG / MPD-2).** Adding a server-side image pipeline is a major architectural change that's explicitly out of scope. If execute-time CC reaches for Sharp on the backend, reject. If html2canvas exceeds the bundle budget AND dom-to-image-more also fails, escalate to Eric (MAX override moment); don't silently switch to server-side.

**W13 — No consumption of the new RateLimiter interface from 5.6 (D-RateLimit-pattern / MPD-7).** The share-as-image endpoint uses the EXISTING per-service bucket4j+Caffeine pattern (NEW `PrayerReceiptShareRateLimitService.java`). It does NOT inject `RateLimiter` (the interface from 5.6). 5.6's strangler pattern defers per-service migration; 6.1 honors it.

**W14 — No Liquibase changesets.** 6.1 introduces no schema changes. All required tables (`posts`, `post_reactions`) already exist. The `db/changelog/` directory is untouched in 6.1's diff.

### Scope discipline — what NOT to edit

**W15 — No edits to existing rate-limit service files (W13 codified).** The 11 existing `*RateLimit*.java` files from 5.6 R3 are NOT modified in 6.1. The strangler pattern is preserved.

**W16 — No edits to `09-design-system.md`.** Visual primitives are canonical post-5.5. 6.1's new components (PrayerReceipt, PrayerReceiptModal, PrayerReceiptImage, mini-receipt) consume the canonical patterns but do not modify the design system rules. If plan-time CC proposes documenting receipt-specific patterns in 09-design-system.md, reject — component-specific design decisions live in the components themselves (or in component-level comments), not in the rules.

**W17 — No edits to spec-tracker / master plan.** `_forums_master_plan/spec-tracker.md` and `_forums_master_plan/round3-master-plan.md` are NOT modified by 6.1's spec, plan, or execute. Eric updates the tracker manually post-merge.

**W18 — No edits to historical specs.** `_specs/forums/spec-5-1.md` through `spec-5-6.md`, plus `spec-14*.md`, are read-only. Historical specs are append-only via R-OVR entries when execute-time CC catches recon errors, NOT modifiable.

**W19 — No edits to `prayer-receipt-verses.ts` once Eric ratifies.** After Gate-29 passes, plan-time and execute-time CC treat the verse list as read-only. If a verse needs replacement post-ratification, Eric edits manually and re-ratifies.

**W20 — Test files only in colocated `__tests__/` directories.** Frontend test convention per Worship Room: `__tests__/` directory next to the file under test, named `<ComponentName>.test.tsx`. Backend convention: `backend/src/test/java/com/worshiproom/...` package mirror of `src/main/java/`.

### Anti-pressure violations

**W21 — No metric framing.** "3 people are praying for you" — NOT "You've received 3 prayers!" or "Your prayer score: 3" or any other framing that turns intercessions into a count to optimize. Every copy string is gift-not-metric.

**W22 — No growth chart, leaderboard, or ranking.** Even "for the author's eyes only," a growth chart would frame intercessions as a metric to grow. Master plan anti-pressure design is unambiguous. If plan-time CC proposes a "your receipts over time" view as a future-friendly enhancement, reject.

**W23 — No empty state at zero.** PrayerReceipt returns `null` when `praying_count === 0`. NO "be the first to pray" copy. NO "no one has prayed yet" copy. NO placeholder UI. The component is invisible. This is Gate-35.

**W24 — No push notifications wired in 6.1.** Master plan anti-pressure section: *"No push notifications on individual prayer events (only summarized as the Phase 12 `prayer_received_daily` digest)."* Phase 12 owns notifications. 6.1 does NOT integrate with any notification system. If plan-time CC proposes adding a notification trigger when receipts hit certain milestones, reject.

**W25 — Settings toggle off-state shows no shaming copy.** When `prayerReceiptsVisible === false`, the entire receipt UI is hidden. The Settings page does NOT show copy like "You've hidden receipts — you may be missing community support" or similar reminders. The toggle is user-empowering; the off-state is silent.

**W26 — No comparison across posts.** A user with 10 intercessors and a user with 0 intercessors see receipts and no-receipts respectively. NO copy ever compares ("your most-prayed-for post is...", "you have more prayers than..."). NO sorting by receipt count anywhere.

**W27 — No "prayer farming" optimization affordances.** Don't add features that would let users optimize for receipt counts: no "share to get more prayers" prompts, no receipt-related streaks/badges/achievements, no time-of-day prompts based on intercession patterns. The receipt is a quiet acknowledgment, not a growth mechanic.

### Privacy violations

**W28 — Non-friend identity NEVER on the wire.** The PrayerReceiptResponse wire format never contains user_ids, display names, or avatar URLs of non-friends. Verified by Gate-32. If plan-time CC adds a field like `recent_non_friend_avatars: []` or similar, reject.

**W29 — Frontend never reconstructs friendship.** The frontend doesn't fetch the user's friend list and compare against intercessors. The backend has already classified. If execute-time CC writes a `useFriendList()` hook to power 6.1's receipt rendering, reject — 6.1 doesn't need it; the backend response is pre-classified.

**W30 — Non-authors never see the receipt component.** The `viewer.user_id === post.author_id` check happens in the React tree before PrayerReceipt mounts. Even if the backend would return 403, the frontend doesn't attempt the request for non-authors. Defense in depth.

**W31 — No log-leak of intercessor identities.** Backend logging at DEBUG/INFO level does NOT log the contents of the `attributed_intercessors` array. Log the request path, the post_id, the requester's user_id, the cache hit/miss, and any errors — NOT the intercessor list. Plan recon designs the log fields.

**W32 — Cache key does NOT include viewer identity.** `cache:prayer-receipt:{postId}` is the key. Not `cache:prayer-receipt:{postId}:{viewerId}`. One cache entry per post (since only the author can fetch). Including the viewer in the key would (a) waste cache space, (b) require multiple invalidations on reaction toggle, (c) signal a misunderstanding of the privacy model.

### Implementation hygiene

**W33 — Web fonts loaded before html2canvas capture.** The PrayerReceiptImage component must wait for `document.fonts.ready` (Lora italic specifically) before calling html2canvas. If fonts haven't loaded, the PNG renders with system-font fallback — visible regression. Plan recon designs the wait mechanism.

**W34 — PNG generation is on-demand only.** PrayerReceiptImage is NOT mounted at page load. It's mounted only when the user taps "Save as image," generates the PNG, then unmounts. No idle DOM, no idle memory, no preload. (Plan recon may decide to mount it permanently as a hidden element if the latency penalty of on-demand mount is unacceptable — but the default is on-demand.)

**W35 — `aria-live="polite"` for count changes (NOT "assertive").** Master plan AC: *"Screen reader announces new prayer count changes via `aria-live="polite"` when page is open."* Polite waits for the screen reader to finish current speech; assertive interrupts. Use polite. The receipt is informative, not urgent.

**W36 — `role="status"` on the receipt root element.** Standard semantic for non-interruptive live content. Plus `aria-live="polite"` for the announcement behavior.

**W37 — Focus trap on PrayerReceiptModal.** Standard dialog pattern. Tab cycles within the modal; Escape closes; first focusable element receives focus on open; previous focus restored on close. Use the existing project's modal pattern (plan recon reads an existing modal component to identify the canonical implementation).

**W38 — Arrow keys navigate intercessor list in modal.** Master plan AC. Plus accessible names on avatars ("Sarah", "A friend", etc.).

**W39 — Color contrast WCAG AA (4.5:1) on every text element.** Scripture italic, count text, modal text, dashboard mini text, PNG text. Plan recon designs an automated check (likely an axe-core assertion in the Playwright suite).

**W40 — Receipt count animation respects `prefers-reduced-motion`.** Master plan Gate-20 inherits. When `prefers-reduced-motion: reduce`, the count change is instant (no pulse, no transition). Plan recon designs the CSS media query treatment.

### Conventions

**W41 — Single quotes throughout TypeScript.** Project convention per Eric's preferences. Vitest, RTL, Playwright tests included.

**W42 — WEB Bible translation throughout.** Master plan and project convention. All 60 verses are WEB. No NIV, ESV, KJV, NLT, or other translations.

**W43 — Java conventions for backend.** Double quotes (Java standard), 4-space indent (or 2 if existing convention is 2 — plan recon checks). Spring Boot annotations match existing controller / service patterns.

**W44 — Cache key namespace conforms to 5.6 `cache:*` convention.** Per 5.6's D11 / W25. The receipt cache key is `cache:prayer-receipt:{postId}`. Documented in `backend/docs/redis-conventions.md` (which 5.6 creates).

**W45 — Lucide icons for any new iconography.** Project convention (lucide-react in deps). No new icon library introduced. The share button likely uses an existing Lucide icon (Camera, ImageDown, Share2, Download — plan recon picks; the icon should NOT carry pressure framing).

**W46 — Tailwind 3.4 (not 4) for styling.** Project uses Tailwind 3.4 per `package.json`. No Tailwind 4 syntax. No `@theme` blocks. Plan recon confirms.

**W47 — New file paths match master plan EXACTLY.** Master plan files-to-create list is the authoritative path list:
- `frontend/src/components/prayer-wall/PrayerReceipt.tsx`
- `frontend/src/components/prayer-wall/PrayerReceiptModal.tsx`
- `frontend/src/components/prayer-wall/PrayerReceiptImage.tsx`
- `frontend/src/hooks/usePrayerReceipt.ts`
- `frontend/src/constants/prayer-receipt-verses.ts`
- `backend/src/main/java/com/worshiproom/post/PrayerReceiptController.java`
- `backend/src/main/java/com/worshiproom/post/PrayerReceiptService.java`
- `backend/src/main/java/com/worshiproom/post/dto/PrayerReceiptResponse.java`
- `backend/src/test/java/com/worshiproom/post/PrayerReceiptIntegrationTest.java`

Plus added by brief: `backend/src/main/java/com/worshiproom/post/PrayerReceiptShareRateLimitService.java` (per D-RateLimit-pattern).

NO deviation in paths. NO renaming for stylistic preference.

**W48 — OpenAPI spec updated for the new endpoint.** Master plan AC: *"OpenAPI spec updated with the new endpoint."* Plan recon locates the OpenAPI spec (likely `backend/src/main/resources/openapi.yaml` or `backend/openapi/` directory) and adds the `GET /api/v1/posts/{id}/prayer-receipt` definition with the response schema (PrayerReceiptResponse).

**W49 — Eric updates spec-tracker manually post-merge.** `_forums_master_plan/spec-tracker.md` Spec 6.1 status ⬜ → ✅ after:
1. PR merged to `forums-wave-continued`
2. Manual brand-voice review (Gate-34) complete
3. Manual PNG visual review (Eric's eye on the generated output)
4. (Optional) Staging deployment confirms 30s cache + atomic invalidation on a real Redis

Spec and plan must NOT modify spec-tracker.md as part of execution.

<!-- CHUNK_BOUNDARY_4 -->

---

## 9. Test specifications

Master plan AC: *"At least 24 tests covering privacy boundaries, count accuracy, scripture rotation, modal behavior, etc."*

The brief refines to specific test classes and approximate test counts. Plan recon finalizes per actual implementation.

### Test 1 — `PrayerReceiptIntegrationTest.java` (NEW) — LOAD-BEARING

Location: `backend/src/test/java/com/worshiproom/post/PrayerReceiptIntegrationTest.java`

Master plan AC coverage: privacy boundaries (403 for non-authors), count accuracy, friend classification, cache TTL + invalidation, anonymous-post handling.

Approximate test count: 10-12

Scenarios (Testcontainer-backed integration tests with real PostgreSQL + real Redis from 5.6):

1. **Author fetches own receipt:** 200, response shape matches `PrayerReceiptResponse` (total_count, attributed_intercessors[], anonymous_count)
2. **Non-author fetches another's receipt:** 403 (Gate-31). Response body contains zero intercessor data.
3. **Unauthenticated fetch:** 401 (existing auth filter; verify it applies to the new endpoint)
4. **Anonymous-post author fetches own receipt:** 200 (anonymity flag does not block own-data access)
5. **Friend classification:** seed post with 5 intercessors (2 friends, 3 non-friends of the author); response has `attributed_intercessors.length == 2`, `anonymous_count == 3`, `total_count == 5` (Gate-32)
6. **Wire format leak check:** assert response body shape against strict schema; no `user_id` / `display_name` / `avatar_url` fields appear for non-friend intercessors anywhere in the JSON (Gate-32)
7. **Cache hit:** first fetch (cache miss), second fetch within 30s (cache hit). Verified via cache stats or instrumentation.
8. **Cache TTL:** verified via `redisTemplate.getExpire("cache:prayer-receipt:{postId}")` returns positive duration ≤ 30s
9. **Cache invalidation on reaction insert:** fetch receipt, insert new `post_reactions` row, fetch again → fresh count (Gate-33)
10. **Cache invalidation on reaction delete:** fetch receipt with count N, delete a `post_reactions` row, fetch again → count N-1 (Gate-33)
11. **Share rate limit:** 5 share-as-image requests succeed; 6th returns 429 (per D-RateLimit-pattern's bucket configuration)
12. **Empty receipt:** post with `praying_count == 0`, author fetches → 200 with `total_count: 0, attributed_intercessors: [], anonymous_count: 0`. (Frontend honors Gate-35 by not rendering; backend honestly returns the zero data because the author CAN fetch their own zero-state.)

### Test 2 — `PrayerReceipt.test.tsx` (NEW)

Location: `frontend/src/components/prayer-wall/__tests__/PrayerReceipt.test.tsx`

Master plan AC coverage: rendering correctness for 1/2-10/10+ intercessor cases, hidden-at-zero, attribution display, settings toggle integration.

Approximate test count: 7-9

Scenarios (Vitest + RTL with mocked `usePrayerReceipt` hook):

1. **praying_count=0:** component returns null; DOM has no `[data-testid="prayer-receipt"]` (Gate-35)
2. **praying_count=1:** renders "1 person is praying for you" (exact copy assertion)
3. **praying_count=3:** renders "3 people are praying for you" with 3 avatars stacked (assert avatar count)
4. **praying_count=10:** renders "10 people are praying for you" with first 3 avatars + "...and 7 others" text
5. **Friend attribution:** intercessor in `attributed_intercessors` renders with display_name as accessible name; intercessor in `anonymous_count` renders as "A friend"
6. **Settings toggle off:** when `prayerReceiptsVisible === false` (from settings hook), component returns null regardless of count (W25; D-Settings-persistence)
7. **role="status" + aria-live="polite":** assert on the receipt root element (W35/W36)
8. **Lora italic on scripture:** assert computed style on scripture element matches `font-style: italic` and font-family includes Lora (W42 / D-Lora-italic)
9. **Hidden in DOM at zero (re-assert, by query):** `queryByTestId('prayer-receipt')` returns null (Gate-35; double-check; this is load-bearing)

### Test 3 — `PrayerReceiptModal.test.tsx` (NEW)

Location: `frontend/src/components/prayer-wall/__tests__/PrayerReceiptModal.test.tsx`

Master plan AC coverage: modal accessibility (focus trap, Escape, arrow keys), intercessor list rendering, "A friend" attribution in list.

Approximate test count: 6-8

Scenarios:

1. **Focus trap on open:** opening modal puts focus on the first focusable element (likely the close button)
2. **Escape closes modal:** Escape key triggers `onClose` (assert callback)
3. **Focus restored on close:** previous focus before opening is restored after close
4. **Arrow keys navigate intercessor list:** ArrowDown / ArrowUp move focus between list items
5. **Tab cycles within modal:** Tab from last focusable element returns to first
6. **Modal lists friends by display name:** `attributed_intercessors[0].display_name` appears as visible text
7. **Modal lists non-friends as "A friend":** `anonymous_count` count of "A friend" entries
8. **Modal renders accessible names on avatars:** screen-reader-accessible text matches the display name (or "A friend")

### Test 4 — `PrayerReceiptImage.test.tsx` (NEW)

Location: `frontend/src/components/prayer-wall/__tests__/PrayerReceiptImage.test.tsx`

Master plan AC coverage: PNG generation includes post excerpt + count + verse + wordmark.

Approximate test count: 3-4

Scenarios:

1. **Renders post excerpt:** assert excerpt text is in the rendered output
2. **Renders count:** assert count text matches input
3. **Renders scripture verse:** assert verse text is in the rendered output
4. **Renders Worship Room wordmark:** assert wordmark element is in the rendered output

Note: this test is for the COMPONENT rendering; the actual PNG generation (html2canvas → blob) is tested in the Playwright suite via a visual regression snapshot.

### Test 5 — `usePrayerReceipt.test.ts` (NEW)

Location: `frontend/src/hooks/__tests__/usePrayerReceipt.test.ts`

Master plan AC coverage: data-fetching behavior, loading/error states, refetch on settings change.

Approximate test count: 4-5

Scenarios:

1. **Initial state:** hook returns `{ data: null, loading: true, error: null }` on mount
2. **Success path:** mock fetch returns 200; hook returns `{ data: <response>, loading: false, error: null }`
3. **403 path:** mock fetch returns 403; hook returns `{ data: null, loading: false, error: <403 error> }` (W30: defense-in-depth)
4. **500 path:** mock fetch returns 500; hook returns `{ data: null, loading: false, error: <500 error> }`
5. **Refetch on settings change:** when `prayerReceiptsVisible` toggles, hook refetches (or skips fetch if toggled off)

### Test 6 — `prayer-receipt-verses.test.ts` (NEW)

Location: `frontend/src/constants/__tests__/prayer-receipt-verses.test.ts`

Master plan AC coverage: scripture rotation is deterministic; same UTC day = same verse.

Approximate test count: 4-5

Scenarios:

1. **List contains exactly 60 entries:** `expect(PRAYER_RECEIPT_VERSES.length).toBe(60)` (Gate-29 prerequisite)
2. **Every entry has reference + text:** schema validation on each entry
3. **Day-of-year 1 → verse index 0:** `getTodaysVerse(new Date('2026-01-01'))` returns `PRAYER_RECEIPT_VERSES[0]`
4. **Day-of-year 61 → verse index 0 (wraparound):** `getTodaysVerse(new Date('2026-03-02'))` returns `PRAYER_RECEIPT_VERSES[0]` (61 % 60 == 1, but day-of-year is 1-indexed so this needs careful handling — plan recon verifies)
5. **Leap year handling:** `getTodaysVerse(new Date('2024-02-29'))` returns expected verse (test the leap-day case explicitly)
6. **Year boundary:** `getTodaysVerse(new Date('2026-12-31'))` and `getTodaysVerse(new Date('2027-01-01'))` return different verses (or same if rotation wraps appropriately — plan recon specifies)

### Test 7 — `PrayerCard.test.tsx` update (MODIFY)

Location: `frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx`

Add 2-3 new scenarios to existing test file:

1. **Author viewing own post with intercessors:** `<PrayerReceipt>` is rendered above `<InteractionBar>`
2. **Author viewing own post with zero intercessors:** `<PrayerReceipt>` is NOT rendered (Gate-35)
3. **Non-author viewing post:** `<PrayerReceipt>` is NOT rendered (W30)

### Test 8 — `PrayerWallDashboard.test.tsx` update (MODIFY)

Location: `frontend/src/components/prayer-wall/__tests__/PrayerWallDashboard.test.tsx`

Add 2-3 new scenarios to existing test file:

1. **Mini-receipt on own posts with intercessors:** mini-receipt component is in the DOM for posts with `praying_count > 0`
2. **Mini-receipt hidden at zero:** mini-receipt is NOT rendered for posts with `praying_count === 0`
3. **Mini-receipt does not include avatars:** assert NO avatar elements in the mini-receipt's DOM subtree (Gate-32 / D-Dashboard-mini)

### Test 9 — Settings page update (MODIFY)

Location: likely `frontend/src/pages/__tests__/Settings.test.tsx` (plan recon confirms path per R10)

Add 2 new scenarios to existing test file:

1. **Toggle renders and persists:** toggling `prayerReceiptsVisible` updates localStorage `wr_settings.prayerWall.prayerReceiptsVisible`
2. **Off-state no shaming copy:** when toggled off, the page shows NO copy matching `/you've hidden/i` or `/missing/i` or similar shaming patterns

### Test 10 — Playwright privacy + anti-pressure suite (NEW)

Location: `frontend/tests/e2e/prayer-receipt.spec.ts` (or wherever Worship Room organizes Playwright tests — plan recon confirms)

Master plan testing notes: *"Playwright: author taps their own post, sees receipt; friend taps the post, causes receipt to update [...]"*

Approximate test count: 8-10

Scenarios:

1. **Author with intercessors sees receipt:** seed post with 3 intercessors; login as author; navigate to post; assert receipt visible
2. **Non-author does not see receipt:** seed post with 3 intercessors; login as non-author; navigate to post; assert receipt is absent from DOM (Gate-32)
3. **Author with zero intercessors sees no receipt:** Gate-35 end-to-end
4. **Modal opens on count tap:** click receipt count, assert modal visible
5. **Modal closes on Escape:** press Escape, assert modal hidden
6. **Reaction toggle updates receipt:** as author, observe receipt; as another user, tap Pray; as author, refresh; assert count increment
7. **"Save as image" generates PNG:** click share button; assert a PNG blob is created (download intercepted in Playwright)
8. **PNG visual regression:** screenshot the generated PNG; compare to baseline (Playwright's built-in snapshot comparison)
9. **axe-core a11y on modal:** open modal; run axe-core; assert zero violations (Gate-17)
10. **Settings toggle hides everywhere:** toggle off; navigate to multiple routes (`/prayer-wall/:postId`, `/prayer-wall/dashboard`); assert no receipt UI anywhere

### Test 11 — Bundle budget test (NEW)

Location: `frontend/scripts/check-bundle-budget.mjs` (or similar; plan recon picks the location and form)

Master plan AC: *"PNG generation bundle-size impact ≤ 30 KB gzipped"*

Approximate test count: 1 (single assertion against build output)

Scenario:

1. **html2canvas adds ≤30KB gzipped to bundle:** assertion against Vite build output. Compares baseline gzipped bundle size to post-html2canvas bundle size. Fails the build (or test) if delta > 30KB.

This test runs in CI after every commit per master plan Gate-30. Plan recon designs the exact assertion mechanism (likely a Vite plugin or a post-build script that inspects `dist/assets/*.js.gz`).

### Net test count

Approximate: 40-50 new tests across 7 new test files + 3 modifications to existing test files + 1 Playwright suite + 1 build-output assertion. Master plan AC requires ≥24. Brief comfortably exceeds.

Plan recon refines counts based on actual implementation. The integration test (Test 1) and the Playwright privacy suite (Test 10) are load-bearing for the privacy model; they cannot be cut.

---

## 10. Files to Create / Modify / NOT to Modify / Delete

### CREATE

**Frontend source:**

- `frontend/src/components/prayer-wall/PrayerReceipt.tsx` — receipt component; rendered above InteractionBar when viewer is author AND praying_count > 0
- `frontend/src/components/prayer-wall/PrayerReceiptModal.tsx` — modal listing intercessors (friends by name, anonymous count as "A friend")
- `frontend/src/components/prayer-wall/PrayerReceiptImage.tsx` — hidden DOM element rendered at share-card size; html2canvas captures it for PNG
- `frontend/src/hooks/usePrayerReceipt.ts` — native fetch hook returning `{ data, loading, error, refetch }` (matches existing project convention per R12; D-FetchPattern)
- `frontend/src/constants/prayer-receipt-verses.ts` — 60 WEB verses curated by Eric (Gate-29 HARD BLOCK)

**Frontend tests:**

- `frontend/src/components/prayer-wall/__tests__/PrayerReceipt.test.tsx`
- `frontend/src/components/prayer-wall/__tests__/PrayerReceiptModal.test.tsx`
- `frontend/src/components/prayer-wall/__tests__/PrayerReceiptImage.test.tsx`
- `frontend/src/hooks/__tests__/usePrayerReceipt.test.ts`
- `frontend/src/constants/__tests__/prayer-receipt-verses.test.ts`
- `frontend/tests/e2e/prayer-receipt.spec.ts` (Playwright; path per plan recon)
- `frontend/scripts/check-bundle-budget.mjs` (or test equivalent; plan recon picks form)

**Backend source:**

- `backend/src/main/java/com/worshiproom/post/PrayerReceiptController.java` — REST controller for `GET /api/v1/posts/{id}/prayer-receipt`; 403 enforcement; share rate-limit endpoint
- `backend/src/main/java/com/worshiproom/post/PrayerReceiptService.java` — business logic: fetch post, verify author, query post_reactions, classify friends, build response, apply @Cacheable
- `backend/src/main/java/com/worshiproom/post/dto/PrayerReceiptResponse.java` — wire-format DTO record
- `backend/src/main/java/com/worshiproom/post/PrayerReceiptShareRateLimitService.java` — per-service bucket4j+Caffeine rate limiter for share endpoint (D-RateLimit-pattern; 5 requests/post/day/user)

**Backend tests:**

- `backend/src/test/java/com/worshiproom/post/PrayerReceiptIntegrationTest.java` — Testcontainer-backed integration tests (LOAD-BEARING for privacy model)

**Backend docs:**

- Plan recon decides whether `backend/docs/redis-conventions.md` (created by 5.6) needs an addition documenting the `cache:prayer-receipt:*` key namespace. Default: yes; minor addition

**Rules:**

- `.claude/rules/11-local-storage-keys.md` — ADD entry for `wr_settings.prayerWall.prayerReceiptsVisible` (default: true; documented purpose; namespace conventions)

**OpenAPI:**

- Plan recon locates the OpenAPI spec file and adds the `GET /api/v1/posts/{id}/prayer-receipt` definition with the response schema (PrayerReceiptResponse). Likely `backend/src/main/resources/openapi.yaml` or equivalent.

### MODIFY

**Frontend source:**

- `frontend/src/components/prayer-wall/PrayerCard.tsx` — render `<PrayerReceipt>` above `<InteractionBar>` when `viewer.user_id === post.author_id` (plan recon reads existing structure per R8)
- `frontend/src/components/prayer-wall/PrayerWallDashboard.tsx` — add mini-receipt summary on own posts list (D-Dashboard-mini; plan recon reads layout per R9)
- Settings page — add `prayerReceiptsVisible` toggle with helper copy (path per plan recon R10; likely `frontend/src/pages/Settings.tsx` or similar)
- `frontend/package.json` — ADD `html2canvas` dependency (version pinned; plan recon picks latest stable; budget verified per Gate-30)

**Frontend tests modify (add new scenarios):**

- `frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx` (Test 7 scenarios)
- `frontend/src/components/prayer-wall/__tests__/PrayerWallDashboard.test.tsx` (Test 8 scenarios)
- Settings page test (Test 9 scenarios; path per plan recon)

**Backend source:**

- `backend/src/main/java/com/worshiproom/post/engagement/ReactionsService.java` (or equivalent; plan recon confirms per R15) — add `@CacheEvict("prayer-receipt", key = "#postId")` to the reaction-toggle methods (or use programmatic eviction if @CacheEvict can't satisfy the atomic-with-transaction requirement; plan recon decides per MPD-5)

**Backend tests modify (likely):**

- `backend/src/test/java/com/worshiproom/post/engagement/ReactionsServiceTest.java` (or equivalent) — add assertions that @CacheEvict fires on toggle (verifying Gate-33)

**Rules:**

- `.claude/rules/11-local-storage-keys.md` — ADD entry as described above

### NOT TO MODIFY

**Existing rate-limit services (W15 / D-RateLimit-pattern / strangler pattern):**

All 11 files enumerated in 5.6 R3 are read-only:

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

**Design system rules (W16):**

- `.claude/rules/09-design-system.md` — read-only; receipt visual decisions live in the components themselves, not the rules

**Spec-tracker / master plan (W17):**

- `_forums_master_plan/spec-tracker.md` — Eric updates manually post-merge
- `_forums_master_plan/round3-master-plan.md` — no master plan edits in 6.1

**Historical specs (W18):**

- `_specs/forums/spec-5-1.md` through `spec-5-6.md`
- `_specs/forums/spec-14*.md`

**5.6 infrastructure (interface stays, consumer doesn't change it):**

- `backend/src/main/java/com/worshiproom/ratelimit/RateLimiter.java` — the new interface 5.6 ships; 6.1 does NOT consume it (D-RateLimit-pattern)
- `backend/src/main/java/com/worshiproom/ratelimit/InMemoryRateLimiter.java`
- `backend/src/main/java/com/worshiproom/ratelimit/RedisRateLimiter.java`
- `backend/src/main/java/com/worshiproom/ratelimit/RateLimiterConfig.java`
- `backend/src/main/java/com/worshiproom/cache/RedisConfig.java` (5.6's CacheConfig is consumed via Spring's @Cacheable annotation; 6.1 doesn't directly edit it)
- `backend/src/main/java/com/worshiproom/cache/CacheConfig.java`
- `backend/src/main/java/com/worshiproom/cache/RedisHealthIndicator.java`

**Liquibase / database (W14):**

- `backend/src/main/resources/db/changelog/**` — no new changesets

**Other backend files not in CREATE/MODIFY:**

- `backend/Dockerfile`, `backend/.mvn/`, `backend/mvnw` (no build changes)
- `backend/pom.xml` (no new backend dependencies; only frontend gets html2canvas)
- All existing controllers, services, repositories not enumerated above

**Frontend files not in CREATE/MODIFY:**

- `frontend/vite.config.ts`, `frontend/tsconfig.json` (no build changes)
- All existing components, hooks, pages not enumerated above
- `frontend/index.html`, public assets

### DELETE

None. 6.1 is purely additive.

<!-- CHUNK_BOUNDARY_5 -->

---

## 11. Acceptance criteria

Master plan AC verbatim (22 items):

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
- [ ] PNG generation reuses PII-stripping path from Spec 6.7 (no EXIF, no GPS, no timestamp fingerprint) — NOTE: 6.7 ships AFTER 6.1; plan recon decides whether to stub the PII-strip or defer the AC; default is defer + add to follow-up issue list
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
- [ ] Dismissed-setting state persists across devices via Phase 8 settings sync (or localStorage in Phase 6 era)
- [ ] At least 24 tests covering privacy boundaries, count accuracy, scripture rotation, modal behavior, etc.

Brief expansion AC (Section 4 MPDs + Section 7 decisions + Section 6 gates):

- [ ] Frontend uses native fetch + useState/useEffect for `usePrayerReceipt`; NO React Query / Jotai / axios introduced (D-FetchPattern / MPD-1 / W11)
- [ ] PNG generation is client-side html2canvas (D-PNG / MPD-2 / W12)
- [ ] html2canvas (or dom-to-image-more fallback) is the ONLY new frontend dependency added (D-PNG / W12)
- [ ] PrayerReceiptResponse wire format contains zero non-friend identity data (D-Friend-detection / MPD-3 / W28 / Gate-32)
- [ ] 60 WEB verses curated by Eric, ratified before execute begins (D-Verses / MPD-4 / Gate-29 / W4)
- [ ] Cache invalidation via @CacheEvict atomic with reaction insert/delete transaction (D-Cache-invalidation / MPD-5 / Gate-33 / W8)
- [ ] Scripture rotation: frontend computes `dayOfYear(utcDate) % 60` (D-Scripture-rotation / MPD-6 / W33)
- [ ] Share endpoint uses existing per-service bucket4j+Caffeine pattern; NOT the new RateLimiter interface from 5.6 (D-RateLimit-pattern / MPD-7 / W13)
- [ ] PNG rendered via html2canvas capture of hidden DOM element, NOT canvas-API drawing (D-PNG-approach / MPD-8)
- [ ] Settings toggle persisted to localStorage; cross-device sync deferred to Phase 8 (D-Settings-persistence / MPD-9 / W19 codified)
- [ ] Dashboard mini-receipt shows count + scripture verse only; no avatars, no names (D-Dashboard-mini / MPD-10 / W22 codified)
- [ ] PrayerReceiptController 403 enforcement is server-side; frontend defense in depth (D-Auth-gate / Gate-31 / W6)
- [ ] PrayerReceipt root element has `role="status"` + `aria-live="polite"` (D-Aria-live / W35 / W36)
- [ ] PrayerReceipt returns null at `praying_count === 0`; zero empty-state copy anywhere (D-Hidden-at-zero / Gate-35 / W10 / W23)
- [ ] All user-facing strings pass anti-pressure brand-voice audit (D-Brand-voice / Gate-34 / W9)
- [ ] Scripture rendered in Lora italic, AA contrast, in both on-screen receipt and PNG (D-Lora-italic)
- [ ] PNG aspect ratio is consistent and matches plan-recon's chosen default (D-PNG-size)
- [ ] PNG footer contains "Worship Room" wordmark per master plan Copy Deck (D-Wordmark)
- [ ] No edits to existing rate-limit services / design system rules / spec-tracker / master plan / historical specs (W15-W19)
- [ ] Zero Liquibase changesets in 6.1's diff (W14)
- [ ] No log-leak of intercessor identities at any log level (W31)
- [ ] Cache key is `cache:prayer-receipt:{postId}` (no viewer-id segment) (W32)
- [ ] `@CacheEvict` cache name conforms to 5.6 `cache:*` convention (W44)
- [ ] OpenAPI spec updated with `GET /api/v1/posts/{id}/prayer-receipt` definition (W48)
- [ ] `.claude/rules/11-local-storage-keys.md` documents `wr_settings.prayerWall.prayerReceiptsVisible` (Section 10 / D-Settings-persistence)

Follow-up issue AC:

- [ ] A follow-up issue is filed for **PII-stripping path integration** (master plan AC references Spec 6.7's PII strip; 6.7 ships AFTER 6.1, so 6.1 either stubs the path or defers via follow-up). Default: file as follow-up.
- [ ] A follow-up issue is filed for **Phase 8 settings sync integration** (master plan AC accepts localStorage-only in Phase 6 era; Phase 8 will sync the `prayerReceiptsVisible` setting across devices).
- [ ] (If R7 R-Friend-fallback path was taken) A follow-up issue is filed for **Phase 2.5 friend schema integration** (currently fallback to "A friend" for everyone; when friend schema lands, swap in real classification).

Verification AC:

- [ ] All Testcontainer integration scenarios pass (Section 3 / Test 1)
- [ ] All Playwright scenarios pass (Section 3 / Test 10)
- [ ] All Vitest + RTL component tests pass (Tests 2-9)
- [ ] Bundle budget test passes (Test 11 / Gate-30)
- [ ] `/code-review` passes with zero Blocker, zero Major findings
- [ ] Eric's manual brand-voice review (Gate-34) signed off
- [ ] Eric's manual PNG visual review signed off
- [ ] Eric's manual privacy review (verify Gate-32 / Gate-31 / Gate-35 by hand on staging or local dev)
- [ ] (If staging exists) Staging deployment verifies 30s cache + atomic invalidation on a real Redis
- [ ] Manual review: spec-tracker flipped ⬜ → ✅ after merge

---

## 12. Out of scope

Master plan body's out-of-scope items (verbatim):

- Prayer receipt "digest" email (could be a Phase 15 follow-up)
- Historical receipts timeline ("you received 500 prayers this year")
- Receipt analytics or "most-prayed-for" leaderboards (explicitly anti-anti-pressure)
- Gif/animation on receipt appearance (static only; animation breaks the quiet reverence)
- Custom avatars in receipt modal beyond existing avatar URLs
- Prayer receipt for comment-level prayers (only post-level)

Brief expansion — explicit deferrals:

- **Per-service rate-limiter migration to new RateLimiter interface.** D-RateLimit-pattern / MPD-7. Spec 5.7+ owns this.
- **PII-stripping path integration with Spec 6.7.** 6.7 ships after 6.1; 6.1 defers via follow-up issue. Per AC list.
- **Phase 8 settings sync.** D-Settings-persistence / MPD-9. localStorage only in 6.1.
- **Push notifications on receipt events.** Master plan anti-pressure: only summarized as Phase 12 `prayer_received_daily` digest. Phase 12 owns.
- **React Query / Jotai / SWR / axios introduction.** D-FetchPattern / MPD-1. Out of 6.1 scope; separate architectural decision if needed.
- **Server-side PNG generation.** D-PNG / MPD-2. Backend image pipeline (Sharp, S3 storage, signed URLs) is out of 6.1 scope.
- **`@Cacheable` annotations on methods other than the receipt endpoint.** 5.6 D5 (5.6 added zero `@Cacheable`); 6.1 adds exactly one (`@Cacheable("prayer-receipt")` on PrayerReceiptService method). Other services that might benefit from caching (PostService, etc.) are out of 6.1 scope.
- **Liquibase schema changes.** W14. No new tables, no new columns, no new indices in 6.1.
- **Edits to existing rate-limit service files.** W15. Strangler pattern preserved.
- **Edits to design system rules, spec-tracker, master plan, historical specs.** W16-W18.
- **A new modal pattern.** Use the existing project modal pattern (plan recon identifies it).
- **A new icon library.** Lucide-react is canonical.
- **Cross-feature integration with Quick Lift (Spec 6.2), Whispers (Spec 6.3), Encouragement Cards (Spec 6.4).** Those are subsequent specs; 6.1 ships standalone.
- **Receipt for users who tap candle (not praying) reactions.** Master plan AC: "Receipt component renders nothing when `praying_count = 0`" — the receipt is specifically about `reaction_type = 'praying'`. The candle reaction has its own future treatment (Phase 6 spec or later).
- **Performance optimization beyond the bundle budget.** 6.1 hits the 30KB budget; further optimization is out of scope. If the budget is tight but met, ship; don't gold-plate.
- **Internationalization / RTL support for the PNG layout.** Worship Room is English-only at Phase 6 per project state. i18n is a Phase 14+ concern.
- **A11y testing beyond axe-core + manual screen reader walk.** Master plan specifies axe-core + VoiceOver walk. NVDA, JAWS, TalkBack testing is out of 6.1 scope.
- **Mobile-native share sheet beyond `navigator.share()` if available.** 6.1 uses standard web APIs. iOS/Android native shims are out of scope.
- **Receipt-related analytics events.** No tracking pixels, no funnel events, no engagement metrics emitted from 6.1. (Anti-prayer-farming defense.)
- **A11y of the PNG itself.** PNGs are images; screen readers can't read them. The PNG is for visual sharing; the in-app receipt is the accessible surface. If users need accessible receipt content, they share text, not the PNG.
- **Customization of the PNG (font choice, color scheme, layout).** One canonical design. Not configurable. Plan recon designs it; Eric reviews; ships.
- **Receipt for posts the author has deleted.** Soft-deleted posts (`deleted_at IS NOT NULL`) are out of receipt scope; the receipt endpoint returns 404 (or 410 Gone, plan recon picks).

---

## 13. Brand voice quick reference

6.1 is the most copy-sensitive spec in the Forums Wave. Every user-facing string must pass the anti-pressure design test. This section is the operational guide for Eric's brand-voice audit (Gate-34) and the spec author's reference during plan/execute.

### Master plan Copy Deck (verbatim)

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

### Anti-Pressure Copy Checklist (master plan verbatim, codified)

- (a) **No comparison.** No "more than X", "top N", "compared to your last post".
- (b) **No urgency.** No "act now", "don't miss", "only N hours left", "limited time".
- (c) **No exclamation points near the receipt count.** "3 people are praying for you" — period, not exclamation.
- (d) **No metric framing.** No "you've received", "prayer score", "engagement rate", "intercession count".
- (e) **No quantification of growth.** No "up from X yesterday", "trending up", "more this week than last".
- (f) **No reciprocity prompting.** No "now go pray for someone", "return the favor", "pay it forward" (the inverse of pressure is also pressure).
- (g) **No guilt-trip scripture.** Verses about being upheld, not about shortage of faith. (Curation gate.)
- (h) **No emoji near sacred content.** Receipt count, scripture, modal header all stay emoji-free. (Wordmark is fine.)

### Do / Don't examples

**For the count copy:**

| Good ✅ | Bad ❌ | Why |
|----------|---------|-----|
| "3 people are praying for you" | "You've received 3 prayers!" | Metric framing + exclamation |
| "3 people are praying for you" | "3 people prayed for you today" | Subtle — "today" implies temporal pressure |
| "1 person is praying for you" | "Be the first to pray for this person" | NOT shown to author; this would be on the other-viewer side, which we explicitly reject (Gate-35) |
| (component absent) | "No one has prayed yet" | Empty-state-at-zero violation (Gate-35) |

**For the scripture line:**

| Good ✅ | Bad ❌ | Why |
|----------|---------|-----|
| "Be still, and know that I am God." (Ps 46:10) | "If you had faith the size of a mustard seed..." (Matt 17:20) | Shortage-of-faith framing = guilt |
| "The Lord is my shepherd; I shall lack nothing." (Ps 23:1) | "You of little faith, why did you doubt?" (Matt 14:31) | Reproach framing |
| "Cast all your anxiety on him because he cares for you." (1 Pet 5:7) | "Faith without works is dead." (Jas 2:26) | Works-implicating framing |

These are illustrative — Eric's full 60-verse curation per D-Verses applies the principle. Plan recon and the spec do NOT propose verses; that's Eric's pre-execute deliverable.

**For the modal:**

| Good ✅ | Bad ❌ | Why |
|----------|---------|-----|
| "Your prayer circle today" | "Your supporters" | Metric framing |
| "Your prayer circle today" | "People praying for you (3)" | Number in header = score framing |
| "A friend" | "Anonymous user" | "Anonymous" is technical; "A friend" is warm |
| "A friend" | "Hidden" | "Hidden" implies the friend WANTS to be hidden; "A friend" is gentler |

**For the settings toggle:**

| Good ✅ | Bad ❌ | Why |
|----------|---------|-----|
| "Show me my prayer receipts" | "Enable prayer receipts" | "Enable" sounds like a feature opt-in; "Show me" centers the user's choice |
| "Turn this off if you'd rather not see who's praying for you right now. You can turn it back on anytime." | "Disable this if you don't want notifications." | "Notifications" is the wrong frame; the master plan helper is warm + reversible |
| (off-state silent) | "You've hidden prayer receipts. Tap to re-enable." | Reminder when off = shaming (W25) |

**For the share button + PNG:**

| Good ✅ | Bad ❌ | Why |
|----------|---------|-----|
| "Save as image" | "Share your prayer support!" | Exclamation + metric framing |
| "Save as image" | "Brag about your prayer count" | Obvious |
| PNG footer: "Worship Room" | PNG footer: "Powered by Worship Room — Get the app!" | App-store-promotion framing = wrong tone |
| PNG verse rendered in Lora italic, smaller size | PNG verse rendered in bold all-caps | Scripture treatment is reverent, not loud |

### Tone notes for any new copy plan recon proposes

- **Voice:** quiet, present, sincere. The receipt is a window into community care; it doesn't sell, congratulate, or alarm.
- **Address:** second person ("you") when speaking to the user. The user is the subject; their experience is the focus.
- **Punctuation:** periods, occasional em-dashes, sparing colons. Exclamation points only in error states (not in receipt content).
- **Capitalization:** sentence case for buttons and labels. Title Case for the modal header ("Your Prayer Circle Today" actually reads better as title case — plan recon decides; the master plan Copy Deck shows sentence case so default to that).
- **Numerals vs words:** numerals for counts ("3 people", not "three people"). Numbers in the modal header are stylistic risk; the canonical phrasing avoids putting a number there.
- **Scripture references:** standard format "Book Chapter:Verse" (e.g., "Psalm 46:10", not "Ps. 46:10" or "Ps 46:10"). Plan recon confirms project-wide convention.

### Risk strings to flag during Gate-34 review

If any of these appear anywhere in the 6.1 diff, Eric flags for revision:

- Exclamation points outside error states
- The words: "score", "streak", "rank", "top", "best", "unlock", "earn", "achievement", "badge", "level", "milestone", "goal"
- Comparative phrasing: "more than", "less than", "compared to"
- Urgency phrasing: "act now", "limited", "only", "don't miss"
- Metric phrasing: "you've received", "total prayers", "prayer count" (when shown to user)
- Reciprocity phrasing: "pray for someone", "give back", "pay it forward"
- App-store promotion: "get the app", "download", "install"

<!-- CHUNK_BOUNDARY_6 -->

---

## 14. Tier rationale

### Why xHigh (extended)

6.1 sits at xHigh because four properties exceed the bar of "engineering judgment over a well-understood problem" (which is High):

1. **Privacy model with multiple subtle requirements.** The receipt's privacy rules — hidden at zero, non-friends never named, non-authors get 403, aggregate count same regardless of viewer, dismissible without shaming — are individually simple but interact in ways where any single failure produces user harm. The xHigh tier acknowledges that the implementation has to get all of them right, not most of them.

2. **Brand-defining external surface.** The shareable PNG is what users post to social media. The Worship Room wordmark appears on it. The aesthetic, typography, and copy choices set the brand voice externally in a way that exceeds normal UI work. This is closer to designing a small print artifact than a React component.

3. **HUMAN-IN-THE-LOOP curation gate.** The 60 WEB verses are not Claude-generated; they're Eric's curation. The dependency on Eric's pre-execute deliverable is a unique structural constraint that other specs don't have.

4. **Anti-pressure design is load-bearing.** The master plan body's anti-pressure section reads as carefully-constructed pastoral wisdom about what the feature should NOT do. Specs at lower tiers can absorb minor copy missteps; 6.1 cannot. A receipt with the wrong tone re-creates the exact metric-and-comparison culture the project exists to avoid.

### Why not High

High tier (e.g., 5.6) is for engineering judgment over a well-understood technical problem. 5.6 was High because Redis + Spring + bucket4j integration is a mature ecosystem with known patterns. 6.1 is also engineering work, but the engineering is in service of:

- A privacy model that requires getting multiple non-overlapping rules right
- A brand artifact that requires aesthetic judgment
- A content curation surface that requires pastoral judgment
- A copy surface with explicit anti-pressure constraints

The engineering decisions (D-FetchPattern, D-PNG-approach, D-Cache-invalidation, D-Scripture-rotation) are well-understood. The non-engineering decisions (D-Brand-voice, D-Verses, D-Hidden-at-zero, D-Friend-detection) are what push the tier up.

### Why not MAX

MAX is for override moments — spec failures, scope explosions, recon ground truth wrong. None of those have occurred at brief-authoring time. The brief's design calls are bound to:

- Master plan body's explicit anti-pressure principles (verbatim copy, anti-pressure design decisions list)
- Verified disk reality (R1-R6 confirmed; R7-R16 deferred to plan recon)
- 5.6's strangler pattern decision (already shipped or shipping)
- Phase 5's canonical visual patterns (5.5 sets these; 5.5 ships before 6.1 per W3)

xHigh covers the elevated judgment surface without escalating to MAX prematurely.

### Override moments triggering MAX (re-stated for visibility)

From Section 2:

1. **html2canvas bundle exceeds 30KB budget** — evaluate dom-to-image-more; if both fail, escalate to Eric for server-side decision
2. **Eric's verse curation review surfaces 5+ verses needing replacement OR the curation framework needs rework** — curation work escalates
3. **`posts.praying_count` denormalization has race condition with cache invalidation** — fix as prerequisite or surface
4. **Friend schema missing on disk (R7 R-Friend-fallback)** — Eric ratifies the degraded path or sequences after 2.5
5. **PrayerCard.tsx author-vs-viewer branch is tangled** — refactoring escalates beyond 6.1 scope
6. **Anonymous-post implementation strips author_id** — the author-vs-viewer detection breaks; plan recon redesigns
7. **Eric prefers server-side PNG** — override D-PNG; spec re-scoped for backend image pipeline
8. **Dashboard mini-receipt design has no clear canonical layout** — Eric reviews proposed design before execute

New MAX moments specific to 6.1 brand-voice work:

9. **Plan-time CC proposes verse content despite D-Verses.** Reject and remind plan-time CC of the human-in-the-loop gate.
10. **Execute-time CC writes any copy not in the master plan Copy Deck OR not approved by Eric.** Code-review catches; revert.
11. **Visual regression baseline for PNG output is rejected by Eric.** Eric's manual review trumps the baseline; iterate.
12. **A11y test (axe-core or VoiceOver walk) surfaces violations the existing project patterns don't have a fix for.** Plan-time CC identifies the violation's cause; if it's structural (e.g., the existing Modal component has accessibility issues), surface to Eric — 6.1 should not be the spec that retrofits a11y across the codebase.

---

## 15. Recommended planner instruction

The exact prompt for `/spec-forums spec-6-1` that Eric pastes into Claude Code:

```
/spec-forums spec-6-1

Brief: _plans/forums/spec-6-1-brief.md

Before writing the spec, complete plan-time recon for the items marked
PLAN-RECON-REQUIRED in brief Section 5:

  - R7: Verify friend-relationship schema on disk. Search
    backend/src/main/resources/db/changelog/ for friends/friendships table.
    Read the schema. Verify there's a query API (FriendshipService or
    FriendshipRepository). If missing, decide between Path A (re-sequence
    behind Phase 2.5) and Path B (fallback to friends-list-always-empty,
    everyone shows as "A friend"). Eric ratifies the path.

  - R8: Read frontend/src/components/prayer-wall/PrayerCard.tsx end-to-end.
    Identify viewer.user_id plumbing, InteractionBar mount location, existing
    author-vs-viewer branch (for anonymous posts), layout structure for
    PrayerReceipt insertion.

  - R9: Read frontend/src/components/prayer-wall/PrayerWallDashboard.tsx
    end-to-end. Catalog the per-post card layout. Identify the mini-receipt
    insertion point per D-Dashboard-mini.

  - R10: Locate the Settings page (likely frontend/src/pages/Settings.tsx
    or similar). Read the existing toggle pattern. Match new toggle to it.

  - R11: Read .claude/rules/11-local-storage-keys.md. Understand the wr_settings
    schema. Plan the addition for wr_settings.prayerWall.prayerReceiptsVisible
    (default: true).

  - R12: Read 1-2 existing hooks under frontend/src/hooks/ to confirm the
    native-fetch convention (D-FetchPattern). Match usePrayerReceipt to it.

  - R13: Verify anonymous-post implementation. Read posts table schema
    (backend/src/main/resources/db/changelog/2026-04-27-014-create-posts-table.xml).
    Check for is_anonymous flag. Verify PostController response shape:
    does the API return author_id when post is anonymous, or strip it?
    The expected design is: anonymity affects non-authors only; author_id
    is always known server-side. Verify and confirm.

  - R14: Check crisis-flag handling in existing prayer-wall components.
    Confirm 6.1 doesn't need special crisis-flag behavior (default
    expectation: a crisis post is still a post; receipt behavior unchanged).

  - R15: Read existing reaction-toggle service (likely
    backend/src/main/java/com/worshiproom/post/engagement/ReactionsService.java
    or PostReactionService.java). Confirm posts.praying_count is atomically
    updated with post_reactions insert/delete. Identify exact transaction
    boundary for @CacheEvict placement per MPD-5.

  - R16: Read existing PostController.java. Decide between (a) PrayerReceiptController
    as a new controller (master plan default) or (b) method addition on
    existing PostController. Default: new controller.

Also verify the brief's master plan body recon by re-reading Spec 6.1's
master plan body at _forums_master_plan/round3-master-plan.md lines 4872-5034.
If any divergence between brief and master plan, record as R-OVR in the spec.

If any VERIFIED finding in the brief (R1-R6) turns out to be wrong on disk at
plan time, record an R-OVR entry in the spec's recon section. The brief's
design intent (D-FetchPattern through D-Wordmark) is preserved verbatim; only
the ground truth is corrected.

Spec output path: _specs/forums/spec-6-1.md
Spec length expectation: 1500-2000 lines

Conventions:
- Stay on forums-wave-continued (long-lived branch; never switch)
- No git mutations from Claude Code at any phase
- Maven not Gradle, npm not pnpm (frontend is npm per package.json)
- Single quotes throughout TypeScript; double quotes for Java
- Tests in __tests__/ colocated for frontend; src/test/java/ mirror for backend
- Master plan files-to-create paths are AUTHORITATIVE (no deviations)
- WEB Bible translation throughout (Eric curates verses separately)
- Spec-tracker update is Eric's manual responsibility post-merge

Prerequisites confirmation (block on these before writing the spec):
- 5.6 status confirmed (⬜ at brief authorship); spec can be written in
  parallel but execute-time blocks until 5.6 ships
- Phase 5 status: 5.1-5.6 all ✅ required before execute (spec authoring OK)
- Frontend stack: React 18.3 + Vite 5.4 + TypeScript 5.6, native fetch
- Backend stack: Spring Boot 3.5.11 + Liquibase + Testcontainers
- post_reactions and posts.praying_count verified at brief authorship
- InteractionBar.tsx exists at the expected path
- html2canvas is a NEW dependency requiring ≤30KB gzipped budget
- The 60 WEB verses are Eric's separate deliverable; Gate-29 HARD BLOCK
- All 11 existing rate-limit services are read-only (strangler pattern)

Tier: xHigh. Override moments per brief Section 2 / Section 14.

The central design calls:
- D-FetchPattern: native fetch, no React Query (matches existing convention)
- D-PNG: client-side html2canvas, ≤30KB budget
- D-Friend-detection: backend classifies; wire format never carries non-friend identity
- D-Verses: Eric curates separately; Gate-29 HARD BLOCK on execute
- D-Cache-invalidation: atomic with reaction toggle via @CacheEvict
- D-Scripture-rotation: frontend computes dayOfYear % 60
- D-RateLimit-pattern: existing per-service bucket4j+Caffeine; not new RateLimiter
- D-Hidden-at-zero: load-bearing anti-pressure principle (Gate-35)
- D-Brand-voice: every user-facing string passes gift-not-guilt test (Gate-34)

The Playwright privacy suite (Test 10) and the backend integration test
(Test 1) are load-bearing for the privacy model.

The scripture verse curation (D-Verses) is the most important non-engineering
deliverable. Eric handles it manually. Plan/execute MUST NOT propose verses.
```

---

## 16. Verification handoff

After `/spec-forums spec-6-1` produces the spec, the pipeline continues:

### 1. `/plan-forums _specs/forums/spec-6-1.md`

Claude Code produces the detailed plan. Plan output path: `_plans/forums/spec-6-1.md`. Plan includes:

- The R7-R16 recon findings (filled in from plan-time reading)
- The exact html2canvas version and bundle-budget verification result (R2 resolution)
- The friend-relationship schema and recovery path (R7 resolution)
- The exact `@CacheEvict` placement on the reaction-toggle service (R15 resolution / MPD-5)
- The exact response DTO shape (PrayerReceiptResponse.java)
- The exact `usePrayerReceipt` hook signature (matching existing convention per R12 / D-FetchPattern)
- The exact PNG aspect ratio and rendering layout (D-PNG-size, D-Wordmark)
- The exact Settings page modification (R10 resolution)
- The exact OpenAPI spec addition
- The Playwright test seed strategy (how to plant post + post_reactions rows for tests)
- The bundle-budget assertion mechanism (Test 11 / Gate-30)

### 2. Eric reviews the plan

Particular attention to:

- D-Friend-detection wire format: confirm `PrayerReceiptResponse` carries zero non-friend identity data
- D-PNG: confirm html2canvas + budget within 30KB; OR confirm dom-to-image-more if html2canvas exceeded
- D-Hidden-at-zero: confirm Gate-35 test asserts component absence at zero count
- D-Cache-invalidation: confirm @CacheEvict is atomic with transaction
- D-RateLimit-pattern: confirm share endpoint uses existing pattern, not new RateLimiter
- All ACs from Section 11 mapped to specific implementation tasks
- Test count exceeds 24; integration test (Test 1) and Playwright suite (Test 10) are load-bearing
- No new dependencies beyond html2canvas
- No edits to existing rate-limit services / design system rules / spec-tracker / master plan / historical specs
- Friend-schema recovery path (R7) is acceptable if Phase 2.5 hasn't shipped
- Anonymous-post handling preserves author's own-data access

### 3. Pre-execute gates

Before `/execute-plan-forums spec-6-1`:

- **5.6 must be ✅ in spec-tracker.** Eric confirms before unblocking.
- **Phase 5 must be complete.** All of 5.1–5.6 ✅. Eric confirms.
- **Gate-29 HARD BLOCK: Verse curation ratified.** Eric places the curated 60 WEB verses in `frontend/src/constants/prayer-receipt-verses.ts` (or the agreed-upon DRAFT file per plan recon's ratification mechanism). The execute command refuses to run otherwise.

### 4. `/execute-plan-forums _plans/forums/spec-6-1.md`

Claude Code executes the plan. Branch: `forums-wave-continued`. No commits. Per-step verification:

- Backend changes: `mvn test` runs `PrayerReceiptIntegrationTest` first, then full backend suite
- Frontend changes: `pnpm test` runs Vitest + RTL component tests; `pnpm test:e2e` runs Playwright (or whatever the existing project commands are — plan recon confirms)
- Bundle budget: `pnpm build` followed by the bundle-budget assertion script (Test 11)
- After all changes: full backend + full frontend + Playwright suite

### 5. `/code-review`

Claude Code reviews the diff per standard skill protocol. Acceptance criteria from Section 11 are the review checklist. Zero Blockers, zero Majors required to advance.

### 6. `/verify-with-playwright`

Full Playwright run targeting the Prayer Wall routes (`/prayer-wall/:postId`, `/prayer-wall/dashboard`) plus the Settings page. axe-core integrated. PNG visual regression baseline established (or compared against prior baseline if one exists).

Manual additional verification by Eric:

- Tap own post with intercessors; receipt renders correctly
- Tap another user's post; receipt absent
- Open modal; intercessor list correct; friends by name, non-friends as "A friend"
- Generate PNG; visual review of the output (typography, wordmark placement, scripture italic, aspect ratio)
- Toggle settings off; receipts hidden everywhere; no shaming copy
- Toggle settings on; receipts return

### 7. Gate-34 brand-voice audit (Eric, manual)

Eric reviews every user-facing string in the 6.1 diff:

- Receipt count copy at each tier (1, 2-10, 10+)
- Modal header
- Friend / non-friend attribution
- Share button
- Settings toggle + helper
- PNG copy (excerpt label, count copy, scripture, wordmark)
- Any error messages exposed to the user

Each string passes the Anti-Pressure Copy Checklist (Section 13). Risk strings (Section 13's flagged list) are absent.

### 8. Eric commits

Suggested commit message structure:

```
spec6.1: prayer receipt + shareable PNG + anti-pressure design

- new frontend components: PrayerReceipt, PrayerReceiptModal,
  PrayerReceiptImage (hidden DOM element for html2canvas capture)
- new frontend hook: usePrayerReceipt (native fetch + useState/useEffect)
- new frontend constant: prayer-receipt-verses (60 WEB verses curated by Eric)
- new frontend dependency: html2canvas (XXKb gzipped delta; within 30KB budget)
- new backend controller + service + DTO: PrayerReceiptController,
  PrayerReceiptService, PrayerReceiptResponse; 403 for non-authors;
  friend-vs-non-friend classification server-side; zero non-friend identity
  on the wire (Gate-32)
- new backend rate limiter: PrayerReceiptShareRateLimitService (existing
  per-service bucket4j+Caffeine pattern; 5/post/day per D-RateLimit-pattern)
- existing ReactionsService: added @CacheEvict atomic with reaction toggle
  for cache:prayer-receipt:* invalidation (Gate-33)
- PrayerCard: render PrayerReceipt above InteractionBar when viewer is author
- PrayerWallDashboard: mini-receipt with count + verse, no avatars
- Settings: prayerReceiptsVisible toggle (default true; localStorage only)
- .claude/rules/11-local-storage-keys.md: documented new setting key
- OpenAPI: added GET /api/v1/posts/{id}/prayer-receipt definition
- 40+ new tests across 7 new test files + 3 modifications + 1 Playwright
  suite + 1 bundle-budget assertion

Hidden at zero intercessors (Gate-35); no "be the first to pray" empty state.
Backend classifies friends; frontend never sees non-friend identities (Gate-32).
Cache invalidation atomic with reaction toggle (Gate-33).
All user-facing strings pass anti-pressure brand-voice audit (Gate-34).

No edits to existing rate-limit services (strangler pattern preserved per
brief D-RateLimit-pattern).
No Liquibase changesets (no schema changes).
No new dependencies beyond html2canvas.
No @Cacheable annotations beyond the receipt endpoint.

Follow-ups filed:
- PII-stripping path integration (depends on Spec 6.7)
- Phase 8 settings sync integration
- (If R7-fallback was taken) Phase 2.5 friend schema integration

Spec: _specs/forums/spec-6-1.md
Plan: _plans/forums/spec-6-1.md
Brief: _plans/forums/spec-6-1-brief.md
```

### 9. Eric pushes

`git push origin forums-wave-continued`.

### 10. Eric flips spec-tracker

`_forums_master_plan/spec-tracker.md` Spec 6.1 status ⬜ → ✅ after merge + brand-voice review + PNG visual review confirmed.

### 11. Eric files follow-up issues

Per the AC list:

- PII-stripping path integration (depends on Spec 6.7)
- Phase 8 settings sync integration
- (If R7-fallback) Phase 2.5 friend schema integration

### Override moments — escalation paths during verification handoff

- **Spec produces a recon finding that contradicts a D-decision.** Spec records the contradiction in an R-OVR section; advisor reviews; brief is not edited (specs are historical); the spec's R-OVR governs execution.

- **Plan finds friend schema absent (R7 R-Friend-fallback).** Plan documents the fallback (everyone shows as "A friend"). Eric ratifies the degraded path before execute. Plan files a follow-up for Phase 2.5 integration.

- **Execute finds html2canvas exceeds bundle budget.** Execute halts; plan recon evaluates dom-to-image-more; if also exceeds, advisor decides between (a) relaxing the budget with Eric's approval, (b) switching to server-side PNG (major scope change), or (c) stripping PNG features to fit the budget.

- **Gate-29 verse curation fails review.** Eric revises verses; re-ratifies; execute resumes. If revision is extensive (5+ verses), curation work escalates beyond the routine HUMAN-IN-THE-LOOP step.

- **Gate-34 brand-voice audit fails review.** Eric flags specific strings; spec/plan revises; re-audit. If structural copy issues are found (multiple ACs misframed), the spec returns to plan phase.

- **Playwright visual regression baseline rejected.** Eric's manual PNG review trumps the snapshot baseline; iterate on the PNG layout; re-baseline.

- **Staging smoke fails atomic invalidation test.** Plan recon diagnoses the @CacheEvict + transaction boundary. If the issue is in 5.6's CacheConfig (not 6.1's eviction), surface to 5.6 follow-up.

- **Manual privacy review surfaces a leak (Gate-31, Gate-32, or Gate-35).** Treat as a Blocker. Fix immediately; re-verify; do not merge until clean.

---

## Prerequisites confirmed (as of 2026-05-12 brief authorship)

- ✅ Branch: forums-wave-continued (long-lived; in active use)
- ✅ Phase 5 progress: 5.0 closed; 5.1, 5.2, 5.3 ✅; 5.4 spec written, plan pending; 5.5 brief authored 2026-05-11; 5.6 brief authored 2026-05-12
- ⬜ 5.6 must ship before 6.1 execution (W2); spec can be written in parallel
- ⬜ Phase 5 must be complete (5.1–5.6 all ✅) before 6.1 execution (W3)
- ⬜ Gate-29: Eric's 60 WEB verse curation before execute (HARD BLOCK; D-Verses)
- ✅ Frontend stack verified: React 18.3 + Vite 5.4 + TypeScript 5.6, native fetch, NO React Query/Jotai/axios (R1)
- ✅ html2canvas NOT in deps; new dependency required (R2)
- ✅ post_reactions table schema verified at Liquibase 016 (R3)
- ✅ posts.praying_count denormalized column verified at Liquibase 014 (R4)
- ✅ InteractionBar.tsx exists with prayer + reactions props (R5)
- ✅ Mock seed data exists at Liquibase 021 (R6)
- ⬜ R7-R16 are PLAN-RECON-REQUIRED; not blocking brief authorship
- ✅ Conventions confirmed: npm not pnpm for frontend; Maven for backend; Java 17, Spring Boot 3.5.11; JUnit 5; Vitest + RTL + Playwright; single quotes TS; WEB Bible
- ✅ Brief output path: `_plans/forums/spec-6-1-brief.md` (work laptop: /Users/eric.champlin/...)
- ✅ Spec output path: `_specs/forums/spec-6-1.md`
- ✅ Plan output path: `_plans/forums/spec-6-1.md`
- ✅ Tier: xHigh; override-to-MAX moments enumerated in Section 2 / 14
- ✅ D-decisions cataloged in Section 7 (18 decisions); MPDs in Section 4 (10 divergences); gates in Section 6 (35 total with 7 new for 6.1); watch-fors in Section 8 (49 total)

---

**End of brief.**
