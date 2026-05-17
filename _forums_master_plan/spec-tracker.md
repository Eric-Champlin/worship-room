# Forums Wave Spec Tracker

**Total: 159 specs | 20 phases | Execution: sequential within each phase**

**v2.8 additions (2026-04-22):** 18 new specs closed functional gaps surfaced during pre-execution completeness review — 13 in Phase 1 (auth lifecycle + production hardening), 2 in Phase 2.5 (block/mute), 1 in Phase 10 (admin audit viewer), 2 in Phase 16 (offline banner + error boundaries). See master plan v2.8 changelog + new Appendix E for spec details.

**v2.9 execution reality (2026-04-23):** Specs 1.1–1.8 have shipped, and authoring Spec 1.9b's brief surfaced divergences from the original spec bodies (test infrastructure shape, Liquibase timestamp handling, BCrypt seeding pattern, components/ui/ vs components/common/, 1.9b-before-1.9 ordering, AuthModal timezone re-home from 1.5 to 1.9). **Trust the master plan's "Phase 1 Execution Reality Addendum" (right after "How to Use This Document") over any older spec body text for Specs 1.1–1.9b.** The tracker below is the canonical ✅/⬜ status; Eric updates it manually after each spec ships.

Specs execute in phase order (0 → 0.5 → 1 → 2 → 2.5 → 3 → ... → 16).
Within each phase, specs are sequential — each spec's prerequisites are the specs before it.

---

## Phase 0 — Learning (1 spec)

| #   | Spec | Title                                | Size | Risk | Status |
| --- | ---- | ------------------------------------ | ---- | ---- | ------ |
| 1   | 0.1  | Backend Foundation Learning Document | L    | Low  | ✅     |

## Phase 0.5 — Quick Win (1 spec)

| #   | Spec | Title                                          | Size | Risk | Status |
| --- | ---- | ---------------------------------------------- | ---- | ---- | ------ |
| 2   | 0.5  | Convert usePrayerReactions to a Reactive Store | S    | Low  | ✅     |

## Phase 1 — Backend Foundation (30 specs)

| #   | Spec  | Title                                          | Size | Risk     | Status |
| --- | ----- | ---------------------------------------------- | ---- | -------- | ------ |
| 3   | 1.1   | Audit and Rename Backend Skeleton              | L    | Medium   | ✅     |
| 4   | 1.2   | PostgreSQL via Docker Compose                  | S    | Low      | ✅     |
| 5   | 1.3   | Liquibase Integration and First Changeset      | M    | Low      | ✅     |
| 6   | 1.3b  | Users Table Timezone Column                    | S    | Low      | ✅     |
| 7   | 1.4   | Spring Security and JWT Setup                  | L    | Med-High | ✅     |
| 8   | 1.5   | Auth Endpoints (Register, Login, Logout)       | L    | High     | ✅     |
| 9   | 1.5b  | Password Reset Flow                            | L    | High     | ‼️     |
| 10  | 1.5c  | Change Password Endpoint                       | S    | Low      | ✅     |
| 11  | 1.5d  | Email Verification Flow                        | L    | Medium   | ‼️     |
| 12  | 1.5e  | Change Email with Re-Verification              | M    | Medium   | ‼️     |
| 13  | 1.5f  | Account Lockout & Brute Force Protection       | M    | Medium   | ✅     |
| 14  | 1.5g  | Session Invalidation & Logout-All-Devices      | M    | Medium   | ✅     |
| 15  | 1.6   | User Me Endpoint                               | S    | Low      | ✅     |
| 16  | 1.7   | Testcontainers Integration Test Infrastructure | M    | Low      | ✅     |
| 17  | 1.8   | Dev Seed Data                                  | S    | Low      | ✅     |
| 18  | 1.9   | Frontend AuthContext JWT Migration             | L    | High     | ✅     |
| 19  | 1.9b  | Error & Loading State Design System            | M    | Low      | ✅     |
| 20  | 1.10  | Phase 1 Cutover and End-to-End Test            | M    | Medium   | ✅     |
| 21  | 1.10b | Deployment Target Decision Document            | S    | Low      | ✅     |
| 22  | 1.10d | Production Monitoring Foundation               | M    | Low      | ✅     |
| 23  | 1.10e | Object Storage Adapter Foundation              | M    | Medium   | ✅     |
| 24  | 1.10c | Database Backup Strategy                       | S    | Low      | ‼️     |
| 25  | 1.10f | Terms of Service and Privacy Policy Surfaces   | M    | Med-High | ✅     |
| 26  | 1.10g | Security Headers Middleware (CSP/HSTS/etc.)    | S    | Low      | ✅     |
| 27  | 1.10h | API Error Code Catalog                         | S    | Low      | ✅     |
| 28  | 1.10i | Backend Environment Variables Runbook          | S    | Low      | ✅     |
| 29  | 1.10j | Liveness/Readiness Health Checks               | S    | Low      | ✅     |
| 30  | 1.10k | HikariCP Connection Pool Tuning                | S    | Low      | ✅     |
| 31  | 1.10l | Playwright E2E Test Infrastructure             | M    | Low      | ✅     |
| 32  | 1.10m | Community Guidelines Document                  | S    | Low      | ✅     |

After 15.1 ships: 1.5b, 1.5d, 1.5e.
1.10c is $20/month.

> **1.10f partial-shipped (2026-04-28 audit):** Canonical legal markdown at `content/{terms-of-service,privacy-policy,community-guidelines}.md` IS shipped. The `users.terms_version` / `users.privacy_version` columns, registration consent checkbox, `LegalVersionService.java`, `TermsUpdateModal.tsx`, `GET /api/v1/legal/versions`, and `POST /api/v1/users/me/legal/accept` endpoints are NOT yet shipped. Tracker reverted to ⬜ pending the column-and-endpoint work; the legal-content portion remains in `content/`.
>
> **1.10m partial-shipped (2026-04-28 audit):** Markdown at `content/community-guidelines.md` IS shipped. The public `/community-guidelines` route + `CommunityGuidelines` page component referenced in `12-project-reference.md` does NOT yet exist in `frontend/src/`. Tracker reverted to ⬜ pending the page+route work.

## Phase 2 — Activity Engine Migration (10 specs)

| #   | Spec | Title                                           | Size | Risk   | Status |
| --- | ---- | ----------------------------------------------- | ---- | ------ | ------ |
| 33  | 2.1  | Activity Engine Schema (Liquibase)              | M    | Low    | ✅     |
| 34  | 2.2  | Faith Points Calculation Service (Backend Port) | L    | Medium | ✅     |
| 35  | 2.3  | Streak State Service (Backend Port)             | L    | Medium | ✅     |
| 36  | 2.4  | Badge Eligibility Service (Backend Port)        | L    | Medium | ✅     |
| 37  | 2.5  | Activity Counts Service                         | S    | Low    | ✅     |
| 38  | 2.6  | Activity API Endpoint                           | L    | Medium | ✅     |
| 39  | 2.7  | Frontend Activity Dual-Write                    | M    | Medium | ✅     |
| 40  | 2.8  | Drift Detection Test (Frontend ↔ Backend)       | M    | Low    | ✅     |
| 41  | 2.9  | Phase 2 Cutover                                 | S    | Medium | ✅     |
| 42  | 2.10 | Historical Activity Backfill                    | M    | Medium | ✅     |

## Phase 2.5 — Friends Migration (8 specs)

| #   | Spec   | Title                                             | Size | Risk   | Status |
| --- | ------ | ------------------------------------------------- | ---- | ------ | ------ |
| 43  | 2.5.1  | Friends Schema (Liquibase)                        | S    | Low    | ✅     |
| 44  | 2.5.2  | Friends Service and Repository                    | L    | Medium | ✅     |
| 45  | 2.5.3  | Friends API Endpoints                             | L    | Medium | ✅     |
| 46  | 2.5.4  | Frontend Friends Dual-Write                       | L    | Medium | ✅     |
| 47  | 2.5.4b | Social Interactions & Milestone Events Dual-Write | M    | Medium | ✅     |
| 48  | 2.5.5  | Phase 2.5 Cutover                                 | S    | Medium | ✅     |
| 49  | 2.5.6  | Block User Feature                                | M    | Medium | ✅     |
| 50  | 2.5.7  | Mute User Feature                                 | S    | Low    | ✅     |

> **2.5.6 verification (2026-04-28 audit):** Despite earlier ✅, no `com.worshiproom.block/` package exists, no `UserBlock*` Java code, and no `user_blocks` Liquibase changeset. Spec 2.5.7 Mute (the sibling spec) DID ship — `user_mutes` table at changeset 013, `MutesService`, `useMutes` hook all exist. Block remains unimplemented; reverted to ⬜.

## Phase 3 — Prayer Wall Backend (12 specs)

| #   | Spec | Title                                          | Size | Risk   | Status |
| --- | ---- | ---------------------------------------------- | ---- | ------ | ------ |
| 51  | 3.1  | Prayer Wall Schema (Liquibase)                 | L    | Medium | ✅     |
| 52  | 3.2  | Mock Data Seed Migration                       | M    | Low    | ✅     |
| 53  | 3.3  | Posts Read Endpoints                           | L    | Medium | ✅     |
| 54  | 3.4  | Comments, Reactions, Bookmarks Read Endpoints  | M    | Low    | ✅     |
| 55  | 3.5  | Posts Write Endpoints (Create, Update, Delete) | XL   | High   | ✅     |
| 56  | 3.6  | Comments Write Endpoints                       | L    | High   | ✅     |
| 57  | 3.7  | Reactions and Bookmarks Write Endpoints        | L    | Medium | ✅     |
| 58  | 3.8  | Reports Write Endpoint                         | M    | Medium | ✅     |
| 59  | 3.9  | QOTD Backend Migration                         | M    | Low    | ✅     |
| 60  | 3.10 | Frontend Service API Implementations           | XL   | High   | ✅     |
| 61  | 3.11 | Reactive Store Backend Adapter                 | L    | Medium | ✅     |
| 62  | 3.12 | Phase 3 Cutover                                | M    | High   | ✅     |

## Phase 4 — Post Types (10 specs)

| #   | Spec     | Title                                                     | Size | Risk   | Status |
| --- | -------- | --------------------------------------------------------- | ---- | ------ | ------ |
| 63  | 4.1      | Post Type Foundation (Frontend Types + Backend Enum Sync) | M    | Low    | ✅     |
| 64  | 4.2      | Prayer Request Polish                                     | M    | Low    | ✅     |
| 65  | 4.3      | Testimony Post Type                                       | L    | Medium | ✅     |
| 66  | 4.4      | Question Post Type                                        | L    | Medium | ✅     |
| 67  | 4.5      | Devotional Discussion Post Type                           | M    | Medium | ✅     |
| 68  | 4.6      | Encouragement Post Type                                   | M    | Medium | ✅     |
| 69  | 4.6b\*\* | Image Upload for Testimonies & Questions                  | L    | Medium | ✅     |
| 70  | 4.7      | Composer Chooser                                          | L    | Medium | ✅     |
| 71  | 4.7b     | Ways to Help MVP                                          | M    | Low    | ✅     |
| 72  | 4.8      | Room Selector and Phase 4 Cutover                         | L    | Medium | ✅     |

**Pre-deploy operator step (Eric):** Before the 4.6b deploy that
activates real R2 image uploads, set the 5 production env vars in
Railway per `backend/docs/runbook-storage.md` § Production Cutover
Checklist. The S3StorageAdapter fail-fast check (Spec 1.10e) will
reject the deploy if any are missing, but knowing this in advance
prevents a wasted deploy attempt.

## Phase 5 — Prayer Wall Visual Migration (7 specs)

> Renamed from "Visual Polish" / "Visual Migration to Round 2 Brand" on 2026-05-07. The Round 3 Visual Rollout (2026-04-30 → 2026-05-07, 26 specs) migrated every page except Prayer Wall. Phase 5 now delivers Prayer Wall only. See `_plans/reconciliation/2026-05-07-post-rollout-audit.md` for the reconciliation report and the post-rollout canonical patterns Phase 5 will apply.
>
> **Spec 14 partial fold-in (2026-05-07 — Cinematic Hero Rollout):** Spec 14 rolled the cinematic atmospheric onto every cinematic-mounting page (`/bible`, `/local-support/*`, `/ask`, `/grow`, `/prayer-wall`, `/music`) and folded four Phase 5 items in along the way: PrayerWallHero migration ✅, `font-script` "Wall" cleanup ✅, `font-serif italic` subtitle cleanup ✅, BackgroundCanvas promotion on `/prayer-wall` ✅ (Spec 5.2 shipped). Remaining Phase 5 scope: PrayerCard FrostedCard migration (5.1), 2-line heading treatment (5.3), animation token migration (5.4), the rest of the deprecated pattern purge (5.5 — only the PrayerWallHero typography portion done), Redis (5.6). See spec-14 plan + execution log: `_plans/2026-05-07-spec-14-cinematic-hero-rollout.md`.

| #    | Spec | Title                                     | Size | Risk   | Status |
| ---- | ---- | ----------------------------------------- | ---- | ------ | ------ |
| 72.5 | 5.0  | Architecture Context Refresh              | XS   | None   | ✅     |
| 73   | 5.1  | FrostedCard Migration                     | L    | Medium | ✅     |
| 74   | 5.2  | BackgroundCanvas at PW Root               | S    | Low    | ✅     |
| 75   | 5.3  | 2-Line Heading Treatment                  | M    | Low    | ✅     |
| 76   | 5.4  | Animation Token Migration                 | M    | Low    | ✅     |
| 77   | 5.5  | Deprecated Pattern Purge and Visual Audit | M    | Low    | ✅     |
| 78   | 5.6  | Redis Cache Foundation                    | M    | Medium | ✅     |

**Spec 5.3** 5.3 closed without code migration. PrayerWallHero's 2-line aesthetic (gradient h1 + cinematic + subtitle) shipped via Spec 14; brief's PageHero composition was geometrically incompatible (ATMOSPHERIC_HERO_BG masks cinematic; padding stacks layout shift). PrayerWallDashboard has no qualifying section headers. Axe-core dashboard route added.

**Spec 5.5** (PrayerWallHero typography portion shipped via Spec 14 Step 7)

## Phase 6 — Engagement Features (14 specs)

> ---
>
> **⚠️ BRIEF-DRIFT REMEDIATION — logged 2026-05-14**
>
> During Phase 6 brief authoring, all wave briefs were written from a **stale pristine-baseline copy** of `round3-master-plan.md` rather than the live master plan. The live stubs had since been patched/rewritten. This was not caught until after several specs had executed and merged. Summary of impact and resolution:
>
> - **6.5 (Intercessor Timeline) — CATASTROPHIC DRIFT, RESOLVED via Path B.** The brief described a _public per-card intercessor summary_; the live stub described a _private author-only aggregate page_ (calendar heatmap, by-post/by-person views, Year-of-Prayer image). 6.5 had already executed + merged as the per-card summary. **Decision (Eric): Path B — shipped code is source of truth.** The 6.5 stub in `round3-master-plan.md` was amended 2026-05-14 with an AS-BUILT RECONCILIATION block; the original aggregate-page vision is preserved there as DEFERRED and may become a future spec. No code change. 6.5 is DONE.
> - **6.6 (Answered Wall) — MATERIAL DRIFT, follow-up spec required.** 6.6 shipped (reviewed, merged) but the brief dropped real scope the live stub mandates: the `'celebrate'` reaction + Light-a-Candle→Celebrate swap, category filter chips (incl. the deliberate Mental-Health omission), the answered-text edit/un-mark flow, and — critically — the hero subhead (shipped "Prayers the community has watched God move in." vs. the live stub's "Gratitude, not comparison.", which the stub's own notes flag as the single most important copy). **Resolution:** follow-up spec `spec-6-6b` authored 2026-05-14 (`_plans/forums/spec-6-6b-brief.md`) to close these gaps. Not yet through pipeline. NOTE: the earlier execute-time decision to ship `'praising'`-only and exclude `'celebrate'` was made in good faith against the (drifted) brief — 6.6b reinstates `'celebrate'`.
>   - **6.6b-deferred-1: CommentInput.tsx answered-aware placeholder.** Plan-recon for 6.6b (2026-05-14) found `frontend/src/components/prayer-wall/CommentInput.tsx:112` carries a hardcoded `"Write a comment..."` placeholder with no `isAnsweredPost`-aware variant. The live 6.6 stub mentions a softer commenter guidance + `"Say a word of celebration…"` placeholder on answered posts. Eric signed off 2026-05-14 to DEFER (option 2 of three): per Brief Section 12 + Section 0 scope discipline, a remediation spec must not quietly grow. A future spec should add an `isAnsweredPost?: boolean` prop to `CommentInput.tsx`, plumb it through `CommentsSection` + `PrayerCard`, add the answered-aware placeholder + softer commenter guidance copy to `answered-wall-copy.ts`, and ship one vitest assertion. **Status:** documented gap, intentionally deferred — NOT a bug, not silently dropped.
>   - **6.6b-deferred-2: answered_text crisis-scan coverage (SAFETY-SURFACE GAP, risk ≥ High).** Plan-recon for 6.6b (2026-05-14, R3 finding) confirmed `PostService.createPost` does NOT include `answeredText` in `detectionInput` today. W29's "if scanned at creation, edit must scan too" conditional is therefore satisfied (neither path scans). Adding scan to the edit path alone would CREATE the inconsistency W29 exists to prevent; adding scan to both paths is scope creep beyond 6.6b's four documented gaps. Eric signed off 2026-05-14 to DEFER to a future spec where the work can be done atomically across ALL `answered_text` write paths (`PostService.createPost`, `PostService.updatePost`, and the new 6.6b answered-text edit path). **Risk tier for the future spec: at least High** — this is a crisis-detection surface, not a polish item. **Status:** documented gap, intentionally deferred — NOT silently accepted.
>   - **6.6b-deferred-3: anonymous-author affordances on the Answered Wall.** PrayerCard's 6.6b author-affordance row checks `user?.id === prayer.userId`, but anonymous posts surface `userId: null` to the frontend (the backend redacts it for anonymity). Anonymous authors who mark their own prayer answered therefore cannot use the inline "Share an update" or "Un-mark as answered" affordances on `/prayer-wall/answered`; they fall back to `PrayerWallDashboard.tsx` (their private dashboard) which DOES surface the affordances via JWT-only ownership. This is acceptable for MVP — most testimony authors post non-anonymously precisely because they want to share the testimony broadly. A future spec could pass an opaque `isViewerAuthor: boolean` flag on the PostDto (computed server-side from JWT vs `users.id`) to handle anonymous authors on `/prayer-wall/answered`. Filed because the gap could surface in production reports if a user expects parity. **Status:** documented limitation, NOT a regression.
>   - **6.6b-deferred-4: cross-route Celebrate (and Praising) surfacing on non-`/prayer-wall/answered` family routes.** Surfaced during 6.6b code review (2026-05-14). Spec 6.6b § "Affected Frontend Routes" lists `/prayer-wall/:id` (PrayerDetail), `/prayer-wall/user/:id` (PrayerWallProfile), and `/prayer-wall/dashboard` (PrayerWallDashboard) as places where the new `'celebrate'` reaction should surface on answered posts. The shipped implementation wires `showCelebrate` only on `AnsweredWall.tsx`. Pushed back during review for a structural reason: shipped 6.6 _also_ did not wire `showPraising` on those three routes (a pre-existing inheritance gap), so adding `showCelebrate` alone would render answered posts with Celebrate visible but Praising hidden — a worse UX than the status quo. Fixing both `showPraising` and `showCelebrate` across five-to-six InteractionBar call sites is scope creep beyond 6.6b's four documented gap areas (Brief Section 0: "6.6b adds NOTHING beyond what the live 6.6 stub already mandates"). A future spec should wire BOTH `showPraising={prayer.isAnswered}` and `showCelebrate={prayer.isAnswered}` (plus the corresponding `onTogglePraising` / `onToggleCelebrate` handlers via `usePrayerReactions`) on PrayerDetail, PrayerWallProfile, and PrayerWallDashboard atomically. The unauthenticated read experience is unaffected (all three routes are public read; only react-write is gated). **Status:** documented gap, NOT a 6.6b regression — pre-existing inheritance from 6.6.
> - **6.7 (Shareable Testimony Cards) — MINOR GAP, one-shot fix.** Shipped correctly on 3 of 4 image-privacy ACs (2 exceed spec). The one gap: EXIF/metadata stripping is _incidentally_ satisfied (canvas-to-PNG is EXIF-free by construction) but not documented in code and not asserted by a test. **Resolution:** a scoped one-shot CC task (add a clarifying comment at `imageGen.ts` + one test). Behavioral risk is nil; this is defensive hardening only.
> - **6.8 curation:** Gate-G-CURATION-PREREQ resolved 2026-05-14 — 180-passage `verse-finds-you.json` landed, `CuratedVerseSetValidationTest` is live on CI (7 tests, all passing).
> - **Upload test fixtures (spec-4-6b followup):** `UploadServiceTest` (12 tests) + `UploadControllerIntegrationTest` (10 tests) `@Disabled` 2026-05-15 pending binary fixture commit. Pre-existing from 2026-05-09; not a wave regression. The `.jpg` / `.png` fixtures (`sample.jpg`, `sample.png`, `pii-laden.jpg`, `corrupt.jpg`, `oversized.jpg`, `large-dimensions.jpg`, `sideways.jpg`) referenced by the tests were never committed; `.webp` / `.heic` / `.bin` variants exist instead. Re-enable when fixtures land.
> - **Frontend test baseline (post-pre-Phase-7 cleanup, 2026-05-16):** 10,622 pass / 0 persistent fail. Pre-Phase-7 cleanup spec (`spec-6-6b-deferred-2`) fixed `warm-empty-states.test.tsx > FriendsPreview "Faith grows stronger together"` (same copy renders in both `FriendsPreview` and `WeeklyRecap` per Decision 8; assertion now scopes via `within(friendsCard)` matching the canonical `empty-states.test.tsx` pattern). `PrayCeremony.test.tsx` fixed 2026-05-15 — test-harness fragility, not a production bug (two missing `vi.mock` blocks added for `useActiveEngagement` + `usePresence`, both of which self-reschedule a `setInterval` that `vi.runAllTimers()` would loop until the 10K-iteration abort fired); production ceremony code in `PrayerWall.tsx` + `InteractionBar.tsx` confirmed correct via prior investigation. `useNotifications.test.ts > returns notifications sorted newest first` remains a known intermittent flake (~33%) — tracker-aware, not a persistent failure. Prior "14 fails / 4 files" and "15 fails" baselines were 2026-05-15 audit-time artifacts driven by concurrent backend test load; GrowthGarden / GrowthGarden-transition / GrowthGarden-a11y all pass cleanly under normal load. Spec 7.2 net-new tests bring the count to ~10,666 pass / 0 fail (2026-05-16).
> - **6.11b crisis-suppression live verification deferred:** Gate-G-CRISIS-SUPPRESSION verified by 4 passing unit tests (`suppressesIndicatorOnCrisisFlaggedFeed` + siblings); live e2e verification deferred because `VITE_USE_BACKEND_PRAYER_WALL=false` in dev (mock-mode bypasses `listPosts`/`listMyBookmarks` → `hasCrisisFlag` stays at its initial `false` → suppression branch never exercised). When Phase 10 ships and crisis flags can be set in production, seed a crisis-flagged post, navigate to a page containing it, confirm PresenceIndicator does NOT render at any of the 4 surfaces (`/prayer-wall`, `/prayer-wall/:id`, `/prayer-wall/user/:id`, `/prayer-wall/dashboard`). Tracked 2026-05-15.
> - **6.11b breadcrumb-behind-navbar layout fix (Dashboard, Profile, Detail) — IN-COMMIT, RESOLVED:** Pre-existing layout bug surfaced during 6.11b verification (2026-05-15). The 3 breadcrumb-based Prayer Wall routes had `main` with only `py-6 sm:py-8` top padding; the `Layout` transparent navbar is `position: absolute z-50` extending y=0-101. Result: the entire breadcrumb (and after 6.11b, the PresenceIndicator stacked below it on mobile/tablet) sat behind the navbar overlay, visually occluded. Fixed in same commit as 6.11b per Eric's Path B scope decision: `main` className changed from `py-6` / `py-6 sm:py-8` to `pt-28 pb-6` / `pt-28 pb-6 sm:pb-8` (pt-28 = 112px clears 101px navbar with 11px buffer). Applied to 7 `main` elements across the 3 routes (PrayerWallDashboard: 1; PrayerWallProfile: 2; PrayerDetail: 4 — covering loading/error/notFound/success states). PrayerWall NOT changed — has `<PrayerWallHero>` above main which provides natural clearance. Tracked 2026-05-15.
> - **GentleExtrasSection toggle duplication (consolidation deferred):** `GentleExtrasSection.tsx` contains two near-identical inline toggle implementations (Verse Finds You + Live Presence) — same button/span structure, same `cn()` class string with one bool difference for active color, same `sr-only` + sliding-circle pattern. Not a shared primitive. WCAG 2.5.5 touch-target fix (44×44 click target via `min-h-[44px] min-w-[44px]` outer button + 24×44 visual switch as inner span) applied inline on BOTH toggles during 6.11b commit (per Eric's Path B scope, 2026-05-15) — kept identical so a future consolidation refactor can extract them together without drift. Future consolidation spec should extract a shared `<Toggle id checked srOnLabels onChange variant>` component to `frontend/src/components/ui/Toggle.tsx`, replace both inline blocks, and update tests. Recommend doing this BEFORE adding any third opt-in toggle to the section. Tracked 2026-05-15.
> - **6.11b Redis dev port collision — IN-COMMIT, RESOLVED:** Surfaced during 6.11b live verification (2026-05-15). Sibling project (`ramsey-plus-fpu-bff-redis-1`) had already bound host port 6379 on the dev workstation; `docker compose up -d redis` brought worship-room Redis up with no host port at all, and Spring silently connected to the sibling Redis. `bumpAnon` writes landed in the wrong container and `getCount()` read stale state. Resolution: worship-room Redis now binds to host port 6380 (`docker-compose.yml`); `application.properties` fallback `REDIS_PORT` defaults to `6380`; `.env.example`, `application-test.properties` fallback, and `backend/docs/redis-conventions.md` § "Dev port" all updated for symmetry. Container-internal port stays 6379. Tracked 2026-05-15.
> - **PresenceIndicator suppressed-prop variable naming inconsistency:** Feed routes (PrayerWall, PrayerWallProfile, PrayerWallDashboard) pass `hasCrisisFlag` (aggregated from multiple rendered posts); PrayerDetail passes `crisisFlag` (single post). Intentional per data shape, not a bug. Flagged for awareness if future crisis-suppression spec assumes uniform naming. Tracked 2026-05-15.
> - **Phase 3 dedicated-rate-limit endpoints — wave-wide standardization needed for `X-RateLimit-*` success-path headers.** `03-backend-standards.md` § "Response Headers (all responses)" requires `X-RateLimit-Limit / X-RateLimit-Remaining / X-RateLimit-Reset` on every response. The shared `RateLimitFilter` (Spec 1) emits these but is scoped to `/api/v1/proxy/**`. Phase 3 endpoints with dedicated rate-limit services — `PostsRateLimitConfig`, `CommentsRateLimitConfig`, `ReactionsRateLimitConfig`, `BookmarksRateLimitConfig`, `ReportsRateLimitConfig`, `ChangePasswordRateLimitConfig`, `PostsIdempotencyService` (24h cache), `VerseFindsYouRateLimitService`, and now `PresenceAuthRateLimitService` + `PresenceAnonRateLimitService` — all share the same shape: `tryConsumeAndReturnRemaining()` consumed inside the service, `void checkAndConsume(...)` returned to the controller, headers never surfaced to the success response. The 429 path correctly emits `Retry-After` (security-relevant); the success-path headers are operational telemetry only. Surfaced during 6.11b code review (2026-05-15) but deferred from in-commit fix because patching only Presence creates more inconsistency, not less. Future standardization spec: change service signatures to return a `RateLimitProbe { remaining, resetAt, limit }` value object, add a small helper (e.g., `ResponseEntityWithRateLimitHeaders.from(probe, body)`) so controllers don't repeat the header-set boilerplate, then sweep every Phase 3 dedicated-rate-limit controller in one atomic pass. Tracked 2026-05-15.
>
> ## **Root-cause fix going forward:** every not-yet-executed Phase 6 brief (6.8, 6.9, 6.10, and the Prayer Wall Redesign side quest) is to be **re-validated against the LIVE master plan** before it goes to `/spec-forums`. No brief is authored or trusted from the pristine-baseline backup again.

| #   | Spec  | Title                         | Size | Risk     | Status |
| --- | ----- | ----------------------------- | ---- | -------- | ------ |
| 79  | 6.1   | Prayer Receipt                | L    | Medium   | ✅     |
| 80  | 6.2   | Quick Lift                    | M    | Low      | ✅     |
| 81  | 6.2b  | Prayer Length Options         | M    | Low      | ✅     |
| 82  | 6.3   | Night Mode                    | L    | Medium   | ✅     |
| 83  | 6.4   | 3am Watch                     | L    | HIGH     | ✅     |
| 84  | 6.5   | Intercessor Timeline          | L    | Med-High | ✅     |
| 85  | 6.6   | Answered Wall                 | L    | Medium   | ✅     |
| 86  | 6.7   | Shareable Testimony Cards     | L    | Medium   | ✅     |
| 87  | 6.8   | Verse-Finds-You               | L    | HIGH     | ✅     |
| 88  | 6.9   | Prayer Wall Composer Drafts   | M    | Low      | ✅     |
| 89  | 6.10  | Prayer Wall Search by Author  | S    | Low      | ‼️     |
| 90  | 6.11  | Sound Effects Settings Polish | S    | Low      | ✅     |
| 91  | 6.11b | Live Presence Component       | M    | Medium   | ✅     |
| 92  | 6.12  | Phase 6 Cutover               | S    | Low      | ✅     |

Phase 6 cutover complete 2026-05-15. 11 specs shipped, 1 deferred to Phase 8 (6.10), 4 deferred items parked (6.6b-deferred-1 / -3 / -4, Prayer Wall Redesign side quest), 1 potential prod bug tracked (PrayCeremony runaway-timer), 4 anomalies documented (brief-drift remediation arc, 6.10 deferral, 6.11 collapse-on-recon, 6.11b Path B wide commit). Phase 7 can begin.

## Phase 7 — Cross-Feature Integration (8 specs)

| #   | Spec | Title                                        | Size | Risk   | Status |
| --- | ---- | -------------------------------------------- | ---- | ------ | ------ |
| 93  | 7.1  | Bible to Prayer Wall Bridge                  | L    | Medium | ✅     |
| 94  | 7.2  | Prayer Wall to Bible Bridge                  | S    | Low    | ✅     |
| 95  | 7.3  | Music During Prayer Wall                     | S    | Low    | ✅     |
| 96  | 7.4  | Daily Hub Pray Tab Friend Surfacing          | M    | Medium | ✅     |
| 97  | 7.5  | Local Support Bridges on Mental Health Posts | M    | Medium | ✅     |
| 98  | 7.6  | Friends Pin to Top of Feed                   | L    | Medium | ⬜     |
| 99  | 7.7  | Privacy Tiers (Public / Friends / Private)   | L    | High   | ⬜     |
| 100 | 7.8  | Phase 7 Cutover                              | S    | Low    | ⬜     |

## Phase 8 — User Profiles (9 specs)

| #   | Spec | Title                              | Size | Risk   | Status |
| --- | ---- | ---------------------------------- | ---- | ------ | ------ |
| 101 | 8.1  | Username System                    | L    | Medium | ⬜     |
| 102 | 8.2  | `/u/:username` Route and Redirects | M    | Medium | ⬜     |
| 103 | 8.3  | Profile Summary Tab                | L    | Medium | ⬜     |
| 104 | 8.4  | Profile Prayer Wall Tab            | M    | Low    | ⬜     |
| 105 | 8.5  | Profile Growth Tab                 | M    | Low    | ⬜     |
| 106 | 8.6  | Profile Bible Tab                  | M    | Low    | ⬜     |
| 107 | 8.7  | Profile Friends Tab                | M    | Low    | ⬜     |
| 108 | 8.8  | Name Canonicalization Migration    | XL   | High   | ⬜     |
| 109 | 8.9  | Phase 8 Cutover                    | S    | Low    | ⬜     |

** REVISIT 6.10 afte Phase 8 is done**

## Phase 9 — Seasonal & Liturgical (5 specs)

| #   | Spec | Title                             | Size | Risk   | Status |
| --- | ---- | --------------------------------- | ---- | ------ | ------ |
| 110 | 9.1  | Liturgical Calendar Service       | M    | Low    | ⬜     |
| 111 | 9.2  | Liturgical Theming on Prayer Wall | M    | Low    | ⬜     |
| 112 | 9.3  | Sunday Service Sync               | S    | Low    | ⬜     |
| 113 | 9.4  | Time-of-Day Copy Variations       | M    | Low    | ⬜     |
| 114 | 9.5  | Candle Mode                       | L    | Medium | ⬜     |

## Phase 10 — Community Safety (13 specs)

| #   | Spec   | Title                                   | Size | Risk   | Status |
| --- | ------ | --------------------------------------- | ---- | ------ | ------ |
| 115 | 10.1   | First Time Badges                       | S    | Low    | ⬜     |
| 116 | 10.2   | Welcomer Role                           | M    | Medium | ⬜     |
| 117 | 10.3   | Presence Cues                           | M    | Low    | ⬜     |
| 118 | 10.4   | Trust Levels (Discourse-Inspired)       | L    | High   | ⬜     |
| 119 | 10.5   | Three-Tier Escalation (7 Cups Inspired) | L    | High   | ⬜     |
| 120 | 10.6   | Automated Phrase Flagging               | M    | High   | ⬜     |
| 121 | 10.7   | Peer Moderator Queue                    | L    | Medium | ⬜     |
| 122 | 10.7b  | Report a User                           | M    | Medium | ⬜     |
| 123 | 10.8   | Appeal Flow                             | M    | Medium | ⬜     |
| 124 | 10.9   | Rate Limiting Tightening                | S    | Low    | ⬜     |
| 125 | 10.10  | Admin Foundation                        | M    | Low    | ⬜     |
| 126 | 10.10b | Admin Audit Log Viewer                  | M    | Low    | ⬜     |
| 127 | 10.11  | Account Deletion and Data Export        | L    | High   | ⬜     |

## Phase 11 — Search (4 specs)

| #   | Spec | Title                                | Size | Risk   | Status |
| --- | ---- | ------------------------------------ | ---- | ------ | ------ |
| 128 | 11.1 | Full-Text Search Schema and Indexing | M    | Medium | ⬜     |
| 129 | 11.2 | Search API Endpoint                  | L    | Medium | ⬜     |
| 130 | 11.3 | Search UI                            | L    | Medium | ⬜     |
| 131 | 11.4 | Search by Verse Reference            | M    | Low    | ⬜     |

## Phase 12 — Notifications (5 specs)

| #   | Spec | Title                                     | Size | Risk   | Status |
| --- | ---- | ----------------------------------------- | ---- | ------ | ------ |
| 132 | 12.1 | Notification Types Catalog                | M    | Low    | ⬜     |
| 133 | 12.2 | Notification Backend Schema and Endpoints | L    | Medium | ⬜     |
| 134 | 12.3 | Notification Generators                   | L    | Medium | ⬜     |
| 135 | 12.4 | Notification Preferences                  | M    | Low    | ⬜     |
| 136 | 12.5 | Mention System                            | L    | Medium | ⬜     |

## Phase 13 — Personal Analytics (4 specs)

| #   | Spec | Title                      | Size | Risk   | Status |
| --- | ---- | -------------------------- | ---- | ------ | ------ |
| 137 | 13.1 | Personal Insights Endpoint | M    | Low    | ⬜     |
| 138 | 13.2 | Insights UI Card           | M    | Low    | ⬜     |
| 139 | 13.3 | Year-in-Review Story       | L    | Medium | ⬜     |
| 140 | 13.4 | Intercession Patterns      | M    | Low    | ⬜     |

## Phase 14 — Onboarding (4 specs)

| #   | Spec | Title                               | Size | Risk   | Status |
| --- | ---- | ----------------------------------- | ---- | ------ | ------ |
| 141 | 14.1 | First-Visit Walkthrough             | L    | Medium | ⬜     |
| 142 | 14.2 | Suggested First Action              | M    | Low    | ⬜     |
| 143 | 14.3 | Find Your People Friend Suggestions | L    | Medium | ⬜     |
| 144 | 14.4 | Warm Empty States                   | M    | Low    | ⬜     |

## Phase 15 — Email & Push (5 specs)

| #   | Spec  | Title                      | Size | Risk   | Status |
| --- | ----- | -------------------------- | ---- | ------ | ------ |
| 145 | 15.1  | SMTP Setup                 | M    | Medium | ⬜     |
| 146 | 15.1b | Welcome Email Sequence     | M    | Medium | ⬜     |
| 147 | 15.2  | Comment Reply Digest Email | L    | Medium | ⬜     |
| 148 | 15.3  | Weekly Summary Email       | M    | Low    | ⬜     |
| 149 | 15.4  | Push Notification Wiring   | L    | Medium | ⬜     |

## Phase 16 — Polish & Performance (7 specs)

| #   | Spec  | Title                                 | Size | Risk   | Status |
| --- | ----- | ------------------------------------- | ---- | ------ | ------ |
| 150 | 16.1  | Offline Cache for Recent Feed         | L    | Medium | ⬜     |
| 151 | 16.1b | Offline Banner UI                     | S    | Low    | ⬜     |
| 152 | 16.2  | Queued Posts (Offline-First Composer) | L    | High   | ⬜     |
| 153 | 16.2b | React Error Boundary Strategy         | M    | Low    | ⬜     |
| 154 | 16.3  | Lighthouse Performance Audit          | M    | Low    | ⬜     |
| 155 | 16.3b | Feature Flag Cleanup Pass             | S    | Low    | ⬜     |
| 156 | 16.4  | Accessibility Audit (BB-35 Style)     | L    | Medium | ⬜     |

## Phase 17 — Music Integrations (3 specs)

| #   | Spec | Title                                                   | Size | Risk   | Status |
| --- | ---- | ------------------------------------------------------- | ---- | ------ | ------ |
| 157 | 17.1 | Encryption-at-Rest Infrastructure for Sensitive Columns | M    | Medium | ⬜     |
| 158 | 17.2 | Spotify OAuth Identity Linking                          | L    | High   | ⬜     |
| 159 | 17.3 | Spotify Web Playback SDK Integration (Premium-only)     | M    | Medium | ⬜     |

Phase 17 sequencing notes:

- 17.1 is a prerequisite for 17.2 (encrypted token columns require the AttributeConverter pattern from 17.1).
- 17.2 ships the OAuth flow; the AuthModal "Continue with Spotify" placeholder button gets wired here.
- 17.3 is the user-facing payoff (session-wide playback for Premium users, browse-only for Free).
- Identity-linking model: Spotify OAuth requires an existing Worship Room account (email/password) and links as a secondary identity. Spotify alone does NOT create a Worship Room account. Cleaner anti-enumeration posture and simpler account recovery.
- Encryption approach: app-layer AES-GCM via JPA AttributeConverter, key from env var (Railway secret). Provider-agnostic, Testcontainers-friendly, reusable for any future encrypted columns.

---

## Summary by Phase

| Phase     | Name                 | Specs   | High Risk |
| --------- | -------------------- | ------- | --------- |
| 0         | Learning             | 1       | 0         |
| 0.5       | Quick Win            | 1       | 0         |
| 1         | Backend Foundation   | 30      | 3         |
| 2         | Activity Engine      | 10      | 0         |
| 2.5       | Friends Migration    | 8       | 0         |
| 3         | Prayer Wall Backend  | 12      | 4         |
| 4         | Post Types           | 10      | 0         |
| 5         | Visual Polish        | 6       | 0         |
| 6         | Engagement Features  | 14      | 2         |
| 7         | Cross-Feature        | 8       | 1         |
| 8         | User Profiles        | 9       | 1         |
| 9         | Seasonal             | 5       | 0         |
| 10        | Community Safety     | 13      | 4         |
| 11        | Search               | 4       | 0         |
| 12        | Notifications        | 5       | 0         |
| 13        | Personal Analytics   | 4       | 0         |
| 14        | Onboarding           | 4       | 0         |
| 15        | Email & Push         | 5       | 0         |
| 16        | Polish & Performance | 7       | 1         |
| 17        | Music Integrations   | 3       | 1         |
| **Total** |                      | **159** | **18**    |
