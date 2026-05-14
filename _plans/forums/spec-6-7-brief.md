# Brief: Spec 6.7 — Shareable Testimony Cards

**Master plan reference:** `_forums_master_plan/round3-master-plan.md` (Spec 6.7 stub) — ID `round3-phase06-spec07-shareable-testimony-cards`

**Spec ID:** `round3-phase06-spec07-shareable-testimony-cards`

**Phase:** 6 (Slow Sanctuary / Quiet Engagement Loop) — FINAL spec in the wave

**Size:** L (Large)

**Risk:** Medium (master plan); brief concurs — the risky pieces (image generation, font loading, Web Share API, mobile/desktop fallback) were all proven out by 6.1's Prayer Receipt; 6.7 is a second consumer of a de-risked pattern

**Tier:** **High** — no DB migration, no backend changes, no privacy stakes beyond inherited anonymous-attribution handling; the share-as-image pipeline is already shipped and de-risked. The one real architecture decision (extract a shared lib vs. parallel pattern) and the brand-visual review keep it at High rather than Medium.

**Prerequisites:**
- 6.6 (Answered Wall) — must merge first per master plan; 6.6 establishes the testimony-surfacing context that 6.7's share action complements
- 6.1 (Prayer Receipt) — ✅ ESSENTIAL: 6.1 shipped the complete share-as-image pipeline (`PrayerReceiptImage.tsx` + `PrayerReceipt.tsx` orchestration). 6.7 reuses this pattern. Verified via R1-R3.
- Existing `InteractionBar.tsx` (verified via R5)
- Existing `testimony` post-type (verified via R4 — confirmed enum value in `frontend/src/types/api/prayer-wall.ts`)

**Pipeline:** This brief → `/spec-forums spec-6-7-brief.md` → `/plan-forums spec-6-7.md` → execute → review.

**Execution sequencing:** Execute AFTER 6.6 merges. This is the LAST spec in the Phase 6 wave. No structural conflict with the Prayer Wall Redesign side quest (6.7 touches InteractionBar + new components; the redesign touches PrayerWall layout) — but if both are queued, 6.7 should execute after the redesign to avoid InteractionBar churn overlap. 6.7 should NOT execute concurrently with any in-flight Phase 6 spec.

---

## 1. Branch Discipline

Branch: `forums-wave-continued`. Eric handles all git operations manually. Claude Code NEVER commits, pushes, branches, merges, rebases, or alters git state at any phase. Violation of W1 is grounds to halt execute.

At execute-start, CC verifies via `git status` (read-only) that working tree is clean except for any pending 6.7 work. `git stash` for diagnostic baseline-compare is permitted only if it brackets within the same turn (per the standing exception).

**Out-of-band sign-off recording:** if any plan-time divergence requires Eric's sign-off, that sign-off is recorded in the plan's Execution Log when received, not retroactively (process improvement carried forward from 6.6's review).

---

## 2. Tier — High

High tier (not xHigh) is justified by what 6.1 already de-risked, with two factors that keep it at High rather than Medium.

**The risky infrastructure is already shipped and proven.**
6.1's Prayer Receipt feature shipped a complete, working share-as-image pipeline. The genuinely hard problems — client-side PNG generation, the font-loading race (waiting for `document.fonts.ready` so Lora italic renders instead of falling back to system serif), `html2canvas` capture quirks, the Web Share API with a desktop download fallback, off-screen component mounting/unmounting — are all solved, with the hard-won gotchas documented in code comments (W33 font race, W34 off-screen positioning, `scale: 2`, `backgroundColor` handling). 6.7 is a SECOND CONSUMER of a de-risked pattern, not a from-scratch build.

**No backend, no DB, no migration.**
Unlike 6.6 (which had a permanent-MD5 CHECK-constraint migration), 6.7 is entirely frontend. No Liquibase changeset, no new endpoint, no schema change. The blast radius is contained to the frontend.

**Why High, not Medium — factor 1: the shared-lib architecture decision.**
The master plan stub names a new `frontend/src/lib/prayer-wall/imageGen.ts` — implying a shared image-generation lib. But 6.1 did NOT build a shared lib; it built a feature-specific component pair. So 6.7 faces a real architecture decision: extract a shared lib from 6.1's orchestration (cleaner, but modifies shipped 6.1 code — regression risk on a working feature) vs. follow the pattern as a parallel pair (no 6.1 risk, but two copies that drift). This decision is load-bearing and is the central plan-recon question (R6).

**Why High, not Medium — factor 2: brand-visual review.**
The generated testimony PNG is shareable content that leaves the app and lands on social feeds, in text messages, on other people's screens. It carries the app's visual identity into the wild. A poorly-composed card (bad typography, broken layout on long content, missing or wrong branding) is a brand failure with reach. The visual review is a real gate, even though the technical shape is known.

**Practical execution implication:** High tier means CC uses Opus 4.7 thinking `high` for routine phases and `xhigh` for the shared-lib extraction decision + the brand-visual composition work. Eric reviews:
- The shared-lib extraction (if chosen): verify 6.1's Prayer Receipt share STILL works identically after the refactor — regression gate
- The `TestimonyCardImage.tsx` visual composition (brand-visual review — the actual generated PNG)
- Anonymous-attribution handling (an anonymous testimony must NOT leak author identity in the PNG)
- The "Share as Image" button gating (testimonies only)
- Mobile (Web Share API) + desktop (download fallback) on real devices

---

## 3. Visual & Integration Verification

### Frontend (Playwright + manual)

**"Share as Image" affordance — gated to testimonies:**
- On a testimony post's `InteractionBar`, a "Share as Image" affordance appears
- On a prayer_request / question / discussion / encouragement post, the "Share as Image" affordance does NOT appear
- The affordance fits the existing InteractionBar visual pattern (it does not crowd or restyle the bar)
- Plan-recon R5 determines whether this is a new button or an item in the existing `ShareDropdown` — brief leans toward the ShareDropdown if testimonies already surface a share dropdown there (avoids InteractionBar crowding); plan confirms

**Share modal / flow:**
- Tapping "Share as Image" opens `ShareTestimonyModal` (or triggers the share flow directly — plan-recon R7 confirms whether a preview modal is warranted or whether it should mirror 6.1's PrayerReceipt flow exactly)
- The modal shows a preview of the generated card (the user sees what they're about to share before sharing)
- The modal has a primary "Share" action (mobile: Web Share API) and a "Download" action (desktop fallback, or always-available)
- The modal can be dismissed without sharing (Esc, close button, click-outside) — dismissing does NOT share or download anything
- Loading state: while the PNG generates, a clear loading indicator (the generation is not instant; 6.1's pattern has a visible wait)

**Generated PNG content:**
- The PNG includes: the testimony content text, attribution (author display name OR "Anonymous"), and Worship Room branding
- 1080×1080 (Instagram-square; consistent with 6.1's PrayerReceiptImage dimensions) — plan-recon R2 confirms 6.1's exact dimensions and 6.7 matches unless there's a reason to differ
- Lora italic renders correctly for any scripture or emphasized text (the font-loading race is handled — W-FontRace)
- Long testimony content is handled gracefully: either truncated with a tasteful "…" + "read the full testimony on Worship Room" affordance, OR the card scales text down, OR the card grows — plan-recon R8 picks the long-content strategy; brief leans toward truncation-with-attribution (D-LongContent)
- Short testimony content does not leave the card looking empty/broken
- The card background, typography, and branding match the app's visual identity (brand-visual review gate)

**Anonymous attribution (HARD):**
- A testimony posted anonymously generates a PNG that shows "Anonymous" — NEVER the author's real display name
- The PNG generation path does NOT have access to (or does not use) the author's real identity for an anonymous testimony
- This mirrors 6.1's anonymous-handling and 6.5's anonymous-handling — consistent anonymity discipline across the wave

**Mobile vs. desktop:**
- Mobile (Web Share API available): "Share" invokes the native share sheet with the PNG as a file
- Desktop (Web Share API unavailable or no file support): "Download" saves the PNG; the UI clearly offers download rather than a broken share
- The capability detection mirrors 6.1's `PrayerReceipt.tsx` pattern (`navigator.share` + `navigator.canShare` feature detection)

**Reduced motion + accessibility:**
- The modal respects `prefers-reduced-motion` (no gratuitous animation on open/close)
- The modal traps focus while open; focus returns to the trigger on close; Esc closes
- The "Share as Image" affordance has a descriptive accessible label
- The loading state is announced to screen readers (`aria-live`)
- The preview image in the modal has appropriate alt text

### Manual verification by Eric after execute

- On a testimony post, tap "Share as Image"; verify the modal opens with a preview
- Verify the generated PNG looks brand-correct: typography, branding, layout, colors
- Generate a PNG from a SHORT testimony and a LONG testimony; verify both look good (long-content strategy works)
- Generate a PNG from an ANONYMOUS testimony; verify it shows "Anonymous" and does NOT leak the author's name
- Generate a PNG containing scripture; verify Lora italic renders (not system serif)
- On mobile: verify "Share" opens the native share sheet with the image
- On desktop: verify "Download" saves the PNG
- Verify the "Share as Image" affordance does NOT appear on non-testimony posts
- CRITICAL REGRESSION CHECK (if the shared-lib extraction was chosen): open a Prayer Receipt (6.1) and share it; verify 6.1's share-as-image still works identically — the refactor must not have broken the original consumer
- Read any new copy aloud; verify brand voice

## 4. Master Plan Divergences (MPDs)

Deliberate divergences from the stub. Plan/execute MUST honor the brief, not the stub. 6.7 diverges modestly — the stub is thin and the main additions are the shared-lib architecture discipline and the anonymous-attribution hardening.

**MPD-1: The shared-lib extraction is a decision, not an assumption.**
The stub names `frontend/src/lib/prayer-wall/imageGen.ts` as a file to create — implying a shared lib gets built. But 6.1 shipped its share pipeline as a feature-specific pair (`PrayerReceiptImage.tsx` + orchestration inside `PrayerReceipt.tsx`), NOT as a shared lib. Brief does not pre-commit to building `imageGen.ts`. Instead it makes this the central plan-recon decision (R6) with a brief-level lean toward extraction-with-a-regression-gate. See D-SharedLib. The plan picks; if it picks "no shared lib," then `imageGen.ts` is simply not created and that is a legitimate Plan-Time divergence from the stub's file list.

**MPD-2: 6.1 regression safety is a HARD gate if extraction is chosen.**
The stub doesn't mention 6.1 at all. Brief adds: IF the plan chooses to extract a shared lib from 6.1's orchestration, then refactoring `PrayerReceipt.tsx` to consume that lib is modifying SHIPPED, WORKING code. That carries regression risk on a feature users already rely on. Gate-G-6.1-REGRESSION-SAFE (Section 6) requires that 6.1's Prayer Receipt share-as-image works identically after the refactor, proven by 6.1's existing tests still passing PLUS a manual share-a-receipt check. If extraction is NOT chosen, this gate is N/A.

**MPD-3: Anonymous attribution is a HARD privacy gate.**
The stub's acceptance criteria say "Anonymous testimonies show anonymous attribution" — brief hardens this into Gate-G-ANON-ATTRIBUTION. The generated PNG is shareable content that leaves the app permanently. If an anonymous testimony's PNG leaks the author's real display name, that's an irreversible privacy breach — the image is already on someone's phone / social feed. The PNG generation path must resolve attribution through the same anonymity-respecting mechanism the rest of the app uses (consistent with 6.1's receipt anonymity and 6.5's intercessor anonymity), and a test must assert that an anonymous testimony's generated card contains "Anonymous" and does NOT contain the author's display name.

**MPD-4: "Share as Image" is gated to `post_type === 'testimony'` (HARD).**
The stub says "Share as Image button only on testimonies." Brief reinforces: the gating is on the post-type, checked at the InteractionBar/ShareDropdown render level. NOT shown-then-disabled, NOT shown-with-an-error — simply not rendered for non-testimony post types. A test asserts the affordance is absent on prayer_request / question / discussion / encouragement posts.

**MPD-5: Reuse 6.1's solved gotchas; do not rediscover them.**
The stub says "reuse the existing image generation infrastructure." Brief makes the reuse concrete: 6.1's code comments document hard-won fixes — the `document.fonts.ready` wait (W33, so Lora italic renders), off-screen positioning at `position: fixed; left: -99999px` (W34), `scale: 2` for resolution, explicit `backgroundColor` handling. 6.7 MUST carry these forward, whether via the shared lib (MPD-1 extraction path) or by faithfully mirroring them (MPD-1 parallel path). Plan-recon R3 reads 6.1's comments in full so none of these are lost. Re-introducing a bug 6.1 already fixed is a Gate-8 (respect existing patterns) violation.

**MPD-6: No new backend, no new endpoint, no analytics.**
The stub lists only frontend files. Brief confirms and hardens: 6.7 adds NO backend code, NO new endpoint, NO new analytics events (no `testimony.shared` tracking, no share-count metric). The testimony content needed for the PNG is already present in the post data the frontend already has. This keeps 6.7 fully frontend and consistent with Phase 6's anti-metrics posture (a share-count would be an engagement metric).

---

## 5. Recon Ground Truth

Verified on disk during brief recon (R1-R5) or flagged for plan-time recon (R6-R10).

**R1 — VERIFIED: 6.1's share-as-image pipeline exists and is the reuse target.**
`frontend/src/components/prayer-wall/PrayerReceiptImage.tsx` — the off-screen-rendered design component. Its header comment documents the approach: "The component IS the design (D-PNG-approach / MPD-8): rendered to a hidden [container and captured via] html2canvas... NO server round-trip — fully client-side." Off-screen positioning: `position: fixed; left: -99999px`. Dimensions: `width: '1080px', height: '1080px'`. Explicit `backgroundColor: '#08051A'`. `boxSizing: 'border-box'`.

**R2 — VERIFIED: 6.1's orchestration lives in `PrayerReceipt.tsx`.**
`frontend/src/components/prayer-wall/PrayerReceipt.tsx` header comment documents the full flow: "3. Wait for `document.fonts.ready` so Lora italic is loaded (W33). ... 5. Capture to Blob; use Web Share API when available, else download fallback. 6. Unmount the off-screen card." The capture call uses `html2canvas` with `backgroundColor: null, scale: 2`. There is also rate-limit handling ("the rate-limit endpoint is advisory") — plan-recon R9 determines whether 6.7's share action should also be rate-limited or whether that was receipt-specific.

**R3 — VERIFIED: the hard-won gotchas are documented in 6.1's code comments.**
Between `PrayerReceiptImage.tsx` and `PrayerReceipt.tsx`, the following are explicitly called out: the font-loading race (Lora italic falls back to system serif if you don't wait for `document.fonts.ready`), off-screen positioning so the capture target isn't visible to the user, `scale: 2` for resolution, explicit background-color handling because html2canvas handles transparency "less reliably than other engines." Plan-recon R3 reads both files end-to-end so 6.7 carries every one of these forward (MPD-5).

**R4 — VERIFIED: `testimony` is a confirmed post-type enum value.**
`frontend/src/types/api/prayer-wall.ts` line ~21: the post-type union includes `'testimony'` (alongside `'prayer_request'`, `'question'`, etc.). The gating check for the "Share as Image" affordance (MPD-4) keys on this value.

**R5 — VERIFIED: `InteractionBar.tsx` and `ShareDropdown.tsx` both exist.**
`frontend/src/components/prayer-wall/InteractionBar.tsx` — the per-card action bar the stub names as a modify target. `frontend/src/components/prayer-wall/ShareDropdown.tsx` — an existing share affordance. Plan-recon R5 determines whether the "Share as Image" action belongs as a new InteractionBar button or as an item inside the existing ShareDropdown (brief leans ShareDropdown to avoid crowding the bar).

**R6 — PLAN-RECON-REQUIRED: shared-lib extraction vs. parallel pattern (the central decision).**
Plan reads `PrayerReceipt.tsx`'s orchestration in full and decides:
- (a) EXTRACT: pull the orchestration (fonts.ready wait → html2canvas capture → Blob → Web Share API / download fallback → off-screen mount/unmount lifecycle) into `frontend/src/lib/prayer-wall/imageGen.ts`. Refactor `PrayerReceipt.tsx` to consume it. 6.7's new components also consume it. Cleaner long-term; single source of truth; but modifies shipped 6.1 code (regression risk — Gate-G-6.1-REGRESSION-SAFE applies).
- (b) PARALLEL: 6.7 builds its own orchestration following 6.1's documented pattern, in its own helper. No 6.1 code touched; zero 6.1 regression risk. Cost: two copies of the html2canvas dance that can drift over time.
Brief leans (a) extraction-with-regression-gate, because a single shared lib is the right long-term shape and 6.1 has good test coverage to catch regressions. But the plan owns this decision and documents it as a Plan-Time decision with rationale. If the plan finds `PrayerReceipt.tsx`'s orchestration is too entangled with receipt-specific concerns to extract cleanly, (b) is a legitimate choice.

**R7 — PLAN-RECON-REQUIRED: preview modal vs. direct-share flow.**
Plan determines whether 6.7 needs `ShareTestimonyModal` as a preview-before-share step, or whether it should mirror 6.1's PrayerReceipt flow exactly (which plan-recon R2/R3 will reveal — does the receipt show a preview, or share directly?). Brief leans toward a preview modal for testimony cards (the user is sharing their own words publicly; a preview is reassuring) but defers to what R7 finds about 6.1's pattern — consistency with 6.1 may win.

**R8 — PLAN-RECON-REQUIRED: long-content strategy for the testimony card.**
Testimony posts can be long. Plan reads the testimony content max-length (from the post-type content rules) and decides the card's long-content strategy:
- truncate with "…" + a "read the full testimony on Worship Room" line (brief's lean — D-LongContent)
- scale text down to fit
- let the card grow taller than 1080×1080
Brief leans truncation-with-attribution: it keeps the 1080×1080 social-friendly dimension, keeps typography legible, and the truncation line doubles as a soft "come to the app" pull. Plan confirms against the actual max content length.

**R9 — PLAN-RECON-REQUIRED: rate limiting on the share action.**
6.1's `PrayerReceipt.tsx` references a rate-limit endpoint ("advisory"). Plan determines whether 6.7's testimony-share action should also hit a rate-limit check, or whether the rate limit was receipt-specific (e.g., tied to receipt generation cost) and testimony sharing doesn't need it. Brief's lean: if 6.1's rate limit is advisory and cheap to include, mirror it for consistency; if it's receipt-specific infrastructure, 6.7 skips it (no new backend per MPD-6). Plan decides and documents.

**R10 — PLAN-RECON-REQUIRED: how attribution + anonymity is resolved for a post.**
Plan reads how a post's author display name vs. "Anonymous" is determined in the existing frontend post data (the same mechanism PrayerCard uses to show "Anonymous" on an anonymous post). 6.7's `TestimonyCardImage` MUST resolve attribution through that same mechanism — NOT by independently reaching for the author's identity. This is the implementation backbone of Gate-G-ANON-ATTRIBUTION. Plan identifies the exact field/helper and 6.7 uses it.

---

## 6. Gates — Applicability

| Gate | Applicability | Notes |
|------|---------------|-------|
| Gate-1 (Liquibase rules) | **N/A.** | No DB changes. 6.7 is entirely frontend. |
| Gate-2 (OpenAPI updates) | **N/A.** | No API changes (MPD-6). |
| Gate-3 (Copy Deck) | **Applies.** | The truncation line, modal copy, button label, accessible labels. See Gate-G-COPY. |
| Gate-4 (Tests mandatory) | **Applies.** | Master plan minimum is 10; brief targets ~14-16. |
| Gate-5 (Accessibility) | **Applies (HARD).** | Modal focus trap, aria-live loading state, accessible labels, preview alt text. See Gate-G-A11Y. |
| Gate-6 (Performance) | **Applies.** | PNG generation has a visible wait (inherent to html2canvas); the loading state must be honest. Off-screen component must mount + unmount cleanly (no leak). |
| Gate-7 (Rate limiting) | **Conditional.** | Only if plan-recon R9 finds 6.7's share action should mirror 6.1's advisory rate-limit. If not, N/A. |
| Gate-8 (Respect existing patterns) | **Applies (HARD).** | Reuse 6.1's pipeline + solved gotchas (MPD-5); reuse the app's attribution/anonymity mechanism (R10); reuse the existing modal pattern. No rediscovered bugs, no parallel systems where reuse is available. |
| Gate-9 (Plain text only) | **Applies.** | Testimony content rendered into the PNG is plain text (it's user content; the existing post-content sanitization applies upstream). |
| Gate-10 (Crisis detection supersession) | **N/A.** | No new user-content-creation surface. 6.7 only reads existing testimony content and renders it to an image. |

**New gates specific to 6.7:**

**Gate-G-ANON-ATTRIBUTION (HARD).**
Per MPD-3. The generated PNG for an anonymous testimony MUST show "Anonymous" and MUST NOT contain the author's real display name anywhere — not in visible text, not in alt text, not in a filename, not in any metadata 6.7 controls. The PNG generation path resolves attribution through the app's existing anonymity-respecting mechanism (R10), never by independently reaching for author identity. A test asserts: given an anonymous testimony, the generated card's text content includes "Anonymous" and does NOT include the author's display name. Code review hard-blocks any attribution path that reads author identity without routing through the anonymity check. This is the highest-stakes gate in 6.7 — a leaked PNG is irreversible.

**Gate-G-6.1-REGRESSION-SAFE (HARD, conditional).**
Per MPD-2. Applies ONLY if the plan chooses the shared-lib extraction path (R6 option a). If it applies: 6.1's Prayer Receipt share-as-image must work identically after the refactor. Proven by (1) 6.1's existing test suite for `PrayerReceipt` / `PrayerReceiptImage` still passing with zero modifications to those tests' assertions, and (2) a manual share-a-receipt check in Eric's verification. Code review hard-blocks if 6.1's tests were modified to accommodate the refactor (changing 6.1's test assertions to make them pass is the antipattern this gate exists to catch — if the refactor changes 6.1's behavior, the refactor is wrong, not the test). If the plan chooses the parallel path (R6 option b), this gate is N/A and the plan documents that.

**Gate-G-TESTIMONY-ONLY (HARD).**
Per MPD-4. The "Share as Image" affordance is rendered ONLY for `post_type === 'testimony'`. Not rendered-then-disabled, not rendered-with-error. A test asserts the affordance is absent on each of the other four post types. Code review hard-blocks any path that surfaces the affordance on a non-testimony post.

**Gate-G-COPY (HARD).**
All user-facing copy authored in Section 7 D-Copy. Eric reviews + approves before execute. Categories: the "Share as Image" affordance label, the modal title + actions, the long-content truncation line, the loading-state text, accessible labels.

**Gate-G-A11Y (HARD).**
MUST cover:
- The share modal traps focus while open; focus returns to the triggering control on close; Esc closes
- The loading state during PNG generation is announced via `aria-live="polite"`
- The "Share as Image" affordance has a descriptive accessible label
- The preview image in the modal has meaningful alt text (describing it as a preview of the shareable card)
- `prefers-reduced-motion` honored on modal open/close
- Axe-core passes zero violations on the modal (open state, loading state, ready state)
- Keyboard: the affordance is reachable and activatable; the modal's Share / Download / Close are all keyboard-operable

---

## 7. Decisions Catalog

11 design decisions for plan + execute.

**D-Scope: 6.7 is a frontend-only second consumer of 6.1's share-as-image pipeline.**
6.7 builds: the testimony-card design component, the share flow/modal, the InteractionBar/ShareDropdown affordance (testimony-gated), and — conditionally — a shared `imageGen.ts` lib. No backend, no DB, no endpoint, no analytics (MPD-6).

**D-SharedLib: extraction-with-regression-gate is the lean; the plan decides (R6).**
Brief leans toward extracting 6.1's orchestration into `frontend/src/lib/prayer-wall/imageGen.ts` and having both 6.1 and 6.7 consume it — single source of truth for the html2canvas dance. This is gated by Gate-G-6.1-REGRESSION-SAFE. If plan-recon R6 finds the orchestration too entangled with receipt-specific concerns to extract cleanly, the parallel path (6.7 builds its own helper mirroring 6.1's documented pattern) is a legitimate Plan-Time decision. Either way: ONE clear approach, documented with rationale. NOT a half-extraction.

**D-AnonAttribution: resolve through the app's existing anonymity mechanism.**
The testimony card's attribution is resolved through whatever mechanism PrayerCard already uses to render "Anonymous" vs. a display name (R10). 6.7 does NOT independently read author identity. This is the implementation of Gate-G-ANON-ATTRIBUTION.

**D-TestimonyGating: render-gate on `post_type === 'testimony'`.**
The affordance's visibility is a render-level check on post type. Implementation of Gate-G-TESTIMONY-ONLY.

**D-AffordancePlacement: ShareDropdown item preferred; plan confirms (R5).**
Brief leans toward placing "Share as Image" as an item inside the existing `ShareDropdown` rather than a new standalone InteractionBar button — avoids crowding the bar, groups share actions together. If R5 finds testimonies don't currently get a ShareDropdown, or the dropdown is awkward, a dedicated button is acceptable. Plan decides and documents.

**D-CardDesign: 1080×1080, the component IS the design, mirrors 6.1's `PrayerReceiptImage` approach.**
`TestimonyCardImage.tsx` is an off-screen-rendered React component (`position: fixed; left: -99999px`) at 1080×1080, captured via html2canvas — exactly 6.1's `PrayerReceiptImage` pattern (R1). The component's JSX IS the design. Plan-recon R2 confirms 6.1's exact dimensions + background approach; 6.7 matches unless there's a documented reason to differ. The visual composition (typography, branding placement, content layout) is the brand-visual review subject.

**D-LongContent: truncate with attribution line.**
Long testimony content is truncated with "…" plus a closing line directing to the full testimony on Worship Room (exact copy in D-Copy). Keeps the 1080×1080 dimension stable, keeps typography legible, and the truncation line doubles as a gentle pull back to the app. Plan-recon R8 confirms against the actual testimony max content length — if testimonies are short enough that truncation almost never triggers, the strategy still ships (it's the safety net) but is lower-stakes.

**D-FontHandling: carry forward 6.1's `document.fonts.ready` wait.**
The share flow waits for `document.fonts.ready` before capture so Lora italic renders instead of system serif (6.1's W33). Non-negotiable; this is one of the solved gotchas (MPD-5). Whether it lives in the shared lib or 6.7's parallel helper, it is present.

**D-ShareFallback: Web Share API with download fallback, mirroring 6.1.**
Mobile uses the Web Share API (`navigator.share` + `navigator.canShare` feature detection) to share the PNG as a file; desktop (or any environment without file-share support) falls back to download. Exactly 6.1's `PrayerReceipt.tsx` pattern (R2). The UI presents the right action for the environment — never a broken share button.

**D-Copy: Authored inline.** (Gate-G-COPY)

*"Share as Image" affordance label:* **"Share as image"**

*Share modal title:* **"Share this testimony"**

*Modal primary action (mobile, Web Share available):* **"Share"**

*Modal action (download / desktop):* **"Download image"**

*Modal dismiss / close:* **"Cancel"** (or a close × — plan matches the existing modal pattern)

*Loading state text (while PNG generates):* **"Preparing your image…"**

*Long-content truncation line (rendered into the PNG after truncated content):* **"… Read the full testimony on Worship Room"**

*Affordance accessible label:* **"Share this testimony as an image"**

*Preview image alt text:* **"Preview of the shareable testimony image"**

*Loading state, screen-reader (aria-live):* **"Preparing your image, please wait"**

**D-NoAnalytics: no share tracking.**
Per MPD-6. 6.7 emits NO analytics events — no `testimony.shared`, no share-count, no share-funnel tracking. A share count would be an engagement metric, inconsistent with Phase 6's anti-metrics posture. Code review hard-blocks any analytics event added by 6.7.

---

## 8. Watch-fors

~26 items.

### Anonymous attribution (Gate-G-ANON-ATTRIBUTION)
- W1 (CC-no-git): Claude Code never runs git operations at any phase.
- W2: An anonymous testimony's PNG shows "Anonymous" — NEVER the author's real display name. Not in visible text, not in alt text, not in a download filename, not in any metadata 6.7 controls.
- W3: Attribution is resolved through the app's existing anonymity mechanism (R10) — 6.7 does NOT independently reach for author identity.
- W4: The download filename for an anonymous testimony must not embed the author's name or id. Use a neutral filename (e.g., `worship-room-testimony.png` or a timestamp-based name).
- W5: A test asserts an anonymous testimony's generated card contains "Anonymous" and does NOT contain the author's display name.

### 6.1 regression safety (Gate-G-6.1-REGRESSION-SAFE, conditional)
- W6: IF extraction is chosen — 6.1's Prayer Receipt share-as-image works identically after the refactor. 6.1's existing tests pass with NO modification to their assertions.
- W7: IF extraction is chosen — do NOT change 6.1's test assertions to make them pass. If the refactor breaks a 6.1 test, the refactor is wrong, not the test.
- W8: IF extraction is chosen — 6.1's solved gotchas (fonts.ready, off-screen positioning, scale:2, backgroundColor) are preserved in the extracted lib, not lost in translation.
- W9: IF parallel path is chosen — 6.7's helper faithfully mirrors every one of 6.1's documented gotchas; the plan explicitly lists them and confirms each is carried.

### Reuse discipline (Gate-8 / MPD-5)
- W10: The `document.fonts.ready` wait is present before html2canvas capture (Lora italic must render, not system serif).
- W11: The capture target component is off-screen (`position: fixed; left: -99999px`) — never briefly visible to the user.
- W12: `scale: 2` (or 6.1's exact value per R2) is carried forward for resolution.
- W13: Explicit `backgroundColor` handling is carried forward (html2canvas handles transparency unreliably).
- W14: The off-screen component mounts AND unmounts cleanly — no lingering off-screen DOM node, no memory leak after the share completes or the modal closes.

### Testimony gating (Gate-G-TESTIMONY-ONLY)
- W15: The "Share as Image" affordance is rendered ONLY on `post_type === 'testimony'`. Not rendered-then-disabled. Not rendered-with-error.
- W16: A test asserts the affordance is absent on prayer_request, question, discussion, AND encouragement posts (all four).

### Share flow correctness
- W17: Mobile path uses `navigator.share` + `navigator.canShare` feature detection; desktop/unsupported falls back to download. Never a broken share button.
- W18: Dismissing the modal (Esc / close / click-outside) does NOT share or download anything.
- W19: The loading state during PNG generation is honest — it shows while generation is actually happening and clears when the PNG is ready or generation fails.
- W20: PNG generation failure is handled gracefully — an error state / toast, not a silent hang or a broken modal.
- W21: Long testimony content truncates per D-LongContent; short content doesn't leave the card looking empty/broken.

### Brand + copy + a11y
- W22: All copy matches Section 7 D-Copy. Eric-approved before execute.
- W23: The generated PNG passes brand-visual review — typography, branding placement, layout, colors all on-identity.
- W24: The modal traps focus, returns focus to the trigger on close, closes on Esc.
- W25: The loading state is announced via `aria-live`; the affordance + preview image have accessible labels/alt text.
- W26: No analytics events added (MPD-6 / D-NoAnalytics). No `testimony.shared`, no share count.

---

## 9. Test Specifications

~15 tests total (master plan minimum is 10; the anonymous-attribution + gating + regression surface warrants more).

### TestimonyCardImage component (~5)
- Renders the testimony content text into the card.
- Renders the author display name as attribution for a non-anonymous testimony.
- Renders "Anonymous" as attribution for an anonymous testimony AND does NOT render the author's display name anywhere in the card (Gate-G-ANON-ATTRIBUTION).
- Renders Worship Room branding.
- Long content: truncates with the "… Read the full testimony on Worship Room" line (D-LongContent); short content renders without looking broken.

### Share flow / modal (~5)
- Tapping "Share as image" opens the share modal with a preview (or triggers the share flow per R7's resolved pattern).
- The loading state shows during PNG generation and clears when ready.
- Web Share API path: when `navigator.canShare` reports file support, the primary action invokes `navigator.share` with the PNG file.
- Download fallback path: when Web Share is unavailable, the modal offers "Download image" and it produces the PNG.
- Dismissing the modal (Esc / Cancel / click-outside) does NOT share or download; focus returns to the trigger.

### Testimony gating (~2)
- The "Share as image" affordance is present on a testimony post.
- The affordance is ABSENT on prayer_request, question, discussion, and encouragement posts (Gate-G-TESTIMONY-ONLY — one parametric test across all four, or four assertions).

### 6.1 regression (~1, conditional)
- IF the shared-lib extraction path was chosen: a test (or the existing 6.1 suite, run unmodified) confirms `PrayerReceipt` / `PrayerReceiptImage` still produce their share output identically after the refactor. IF the parallel path was chosen: this test is N/A; instead a note in the plan confirms 6.1 code was not touched.

### Accessibility (~1, multi-assert)
- Axe-core scan on the share modal (open, loading, ready states): zero violations. Asserts focus trap, `aria-live` on the loading state, accessible label on the affordance, alt text on the preview image.

### Playwright E2E (~1)
- **Happy path:** On a testimony post, open the "Share as image" flow; verify the modal/preview appears; verify the loading state resolves; verify the Share or Download action is present and operable; dismiss; verify focus returns. (Real PNG-pixel verification is manual — brand-visual review — not E2E-asserted.)

---

## 10. Files

### To CREATE

**Components:**
- `frontend/src/components/prayer-wall/TestimonyCardImage.tsx` — the off-screen-rendered design component (mirrors 6.1's `PrayerReceiptImage.tsx` pattern per D-CardDesign)
- `frontend/src/components/prayer-wall/__tests__/TestimonyCardImage.test.tsx` — component tests
- `frontend/src/components/prayer-wall/ShareTestimonyModal.tsx` — the preview + share/download modal (pending R7 — if R7 finds 6.1 shares directly with no modal and consistency wins, this may instead be a share-flow hook; plan documents)
- `frontend/src/components/prayer-wall/__tests__/ShareTestimonyModal.test.tsx` — modal/flow tests
- `frontend/src/constants/testimony-share-copy.ts` — the Copy Deck strings per D-Copy (affordance label, modal title/actions, loading text, truncation line, a11y labels)
- `frontend/e2e/testimony-share.spec.ts` — Playwright E2E

**Conditional (per R6 / D-SharedLib):**
- `frontend/src/lib/prayer-wall/imageGen.ts` — the shared image-generation orchestration lib. CREATED only if the plan chooses the extraction path. If the plan chooses the parallel path, this file is NOT created and 6.7's orchestration lives in a 6.7-local helper instead. The plan documents which path was chosen and why.
- `frontend/src/lib/prayer-wall/__tests__/imageGen.test.ts` — only if `imageGen.ts` is created.

### To MODIFY

- `frontend/src/components/prayer-wall/InteractionBar.tsx` — surface the "Share as image" affordance, gated to `post_type === 'testimony'`. (Per R5 / D-AffordancePlacement — if the affordance goes into `ShareDropdown` instead, InteractionBar may be untouched and `ShareDropdown.tsx` is the modify target instead. Plan confirms.)
- `frontend/src/components/prayer-wall/ShareDropdown.tsx` — likely modify target if D-AffordancePlacement resolves to the dropdown-item placement (brief's lean). Add the "Share as image" item, testimony-gated.
- **Conditional:** `frontend/src/components/prayer-wall/PrayerReceipt.tsx` — modified ONLY if the extraction path (R6 option a) is chosen, to consume the new shared `imageGen.ts`. Under Gate-G-6.1-REGRESSION-SAFE. If the parallel path is chosen, this file is NOT touched.

### NOT to modify (explicit non-targets)
- `frontend/src/components/prayer-wall/PrayerReceiptImage.tsx` — 6.1's design component is the REFERENCE pattern for `TestimonyCardImage`, but it is NOT modified. 6.7 creates a sibling, it does not edit 6.1's component.
- `frontend/src/components/prayer-wall/__tests__/PrayerReceiptImage.test.tsx` and any 6.1 receipt tests — NEVER modified to accommodate a 6.7 refactor. If extraction breaks a 6.1 test, the refactor is wrong (Gate-G-6.1-REGRESSION-SAFE / W7).
- `frontend/src/components/prayer-wall/PrayerReceipt.tsx` — NOT modified UNLESS the extraction path is explicitly chosen; even then, only the minimal change to consume `imageGen.ts`.
- Any backend code — 6.7 is frontend-only (MPD-6). No `backend/` changes.
- `backend/.../openapi.yaml` — no API changes.
- Any Liquibase changelog — no DB changes.
- 6.6's AnsweredWall / AnsweredCard, 6.5's IntercessorTimeline, 6.4's Watch components — all orthogonal; not touched.
- Analytics modules — 6.7 adds NO events (D-NoAnalytics).

### To DELETE
None. 6.7 is purely additive (the conditional `PrayerReceipt.tsx` change, if extraction is chosen, is a refactor-to-consume, not a deletion).

---

## 11. Acceptance Criteria

**Functional (from master plan + brief):**
- A. "Share as image" affordance appears ONLY on testimony posts
- B. The affordance generates a PNG that includes testimony content, attribution, and Worship Room branding
- C. Web Share API works on mobile (shares the PNG as a file)
- D. Download fallback works on desktop / unsupported environments
- E. Anonymous testimonies show "Anonymous" attribution on the generated PNG
- F. Brand-visual review passes
- G. ~15 tests covering component, share flow, gating, a11y, E2E (+ conditional 6.1 regression)

**Anonymous attribution (Gate-G-ANON-ATTRIBUTION, HARD):**
- H. An anonymous testimony's PNG shows "Anonymous" and contains the author's real display name NOWHERE (visible text, alt text, filename, metadata)
- I. Attribution is resolved through the app's existing anonymity mechanism, not an independent author-identity read
- J. A test asserts the anonymous card contains "Anonymous" and not the author's display name

**6.1 regression safety (Gate-G-6.1-REGRESSION-SAFE, HARD, conditional):**
- K. IF extraction was chosen: 6.1's Prayer Receipt share-as-image works identically after the refactor; 6.1's existing tests pass with NO assertion changes; a manual share-a-receipt check confirms
- L. IF parallel path was chosen: no 6.1 code was modified; the plan documents this

**Testimony gating (Gate-G-TESTIMONY-ONLY, HARD):**
- M. The affordance is rendered only for `post_type === 'testimony'` — not rendered-then-disabled
- N. A test confirms the affordance is absent on all four other post types

**Reuse discipline (Gate-8 / MPD-5):**
- O. The `document.fonts.ready` wait is carried forward (Lora italic renders, not system serif)
- P. Off-screen positioning, `scale: 2`, and explicit `backgroundColor` handling are carried forward
- Q. The off-screen component mounts and unmounts cleanly (no leak)

**Share flow:**
- R. Mobile/desktop capability detection mirrors 6.1's pattern; never a broken share button
- S. Dismissing the modal does not share or download anything
- T. PNG generation failure is handled gracefully (error state, not silent hang)
- U. Long content truncates per D-LongContent; short content renders cleanly

**Accessibility (Gate-G-A11Y, HARD):**
- V. Modal traps focus, returns focus to trigger on close, closes on Esc
- W. Loading state announced via `aria-live`; affordance + preview image have accessible labels/alt text
- X. `prefers-reduced-motion` honored; axe-core zero violations on the modal

**Copy + anti-metrics:**
- Y. All copy is Eric-approved before execute (Gate-G-COPY)
- Z. No analytics events added (D-NoAnalytics)

---

## 12. Out of Scope

### Deferred (future spec may add)
- Share-as-image for non-testimony post types (prayer requests, answered prayers, etc.) — 6.7 is testimony-only by master plan scope; extending it is a future decision
- Multiple card templates / themes for the shareable image (6.7 ships one well-composed design)
- User customization of the card (color, layout, crop) before sharing
- Sharing to specific platforms via platform-specific APIs (6.7 uses the generic Web Share API + download)
- A server-side image-generation path (6.7 is fully client-side, mirroring 6.1)
- Share analytics / share-count surfacing (explicitly excluded — D-NoAnalytics, MPD-6)
- Animated / video share formats (6.7 is a static PNG)
- Localization of the card copy into non-English (consistent with the wave's en-US scope)

### Never (anti-features)
- Share-count or share-funnel metrics (engagement metric — violates Phase 6 anti-metrics posture)
- Leaking author identity on an anonymous testimony's PNG (Gate-G-ANON-ATTRIBUTION)
- Modifying 6.1's test assertions to accommodate a 6.7 refactor (Gate-G-6.1-REGRESSION-SAFE)
- Surfacing the affordance on non-testimony posts (Gate-G-TESTIMONY-ONLY)
- Rediscovering a gotcha 6.1 already solved (Gate-8 / MPD-5)

### Different concerns (out of scope entirely)
- 6.1's Prayer Receipt feature itself (6.7 reuses its pipeline; it does not change receipt behavior)
- The mechanism by which a post is marked a testimony (post-type is set at creation — existing flow)
- 6.6's Answered Wall (orthogonal surface; an answered prayer is not the same as a testimony post-type)
- The Prayer Wall Redesign side quest (separate; 6.7 just shouldn't execute concurrently with it due to InteractionBar overlap)

---

## 13. Tier Rationale (closing)

**Why High:** the share-as-image infrastructure is already shipped and de-risked by 6.1 — 6.7 is a second consumer of a proven pattern, fully frontend, no DB/backend/migration. The two factors that lift it above Medium: the shared-lib extraction decision (a real architecture call with 6.1-regression implications) and the brand-visual review (the PNG leaves the app and carries the brand into the wild).

**Why not xHigh:** no DB migration (unlike 6.6), no backend, no novel infrastructure, no safety-critical or crisis-adjacent surface. The one privacy concern (anonymous attribution) is real and HARD-gated, but it's an inherited pattern — the app already resolves anonymity correctly elsewhere; 6.7 just has to route through it.

**Why not Medium:** the extraction decision and the brand-visual gate both need genuine judgment; a Medium framing would under-resource them.

**Practical execution implication:**
- spec-from-brief: Opus 4.7 thinking high
- plan-from-spec: high overall, xhigh for the R6 extraction-vs-parallel decision (it's load-bearing and has 6.1-regression implications)
- execute: high for routine work; xhigh for the brand-visual composition of `TestimonyCardImage` and — if chosen — the shared-lib extraction + `PrayerReceipt.tsx` refactor
- review: focus on Gate-G-ANON-ATTRIBUTION (the anonymous-card test + the attribution path), Gate-G-6.1-REGRESSION-SAFE (6.1 tests unmodified + still passing), the brand-visual review of the actual generated PNG, and the testimony-only gating

---

## 14. Recommended Planner Instruction

```
Plan execution for Spec 6.7 per
/Users/eric.champlin/worship-room/_plans/forums/spec-6-7-brief.md.

Tier: High. Use Opus 4.7 thinking depth high for routine phases, xhigh
for the R6 shared-lib extraction-vs-parallel decision and the brand-visual
composition work.

This is the FINAL spec in the Phase 6 wave.

Honor all 6 MPDs, 11 decisions, ~26 watch-fors, ~15 tests, and 5 new gates
(Gate-G-ANON-ATTRIBUTION, Gate-G-6.1-REGRESSION-SAFE [conditional],
Gate-G-TESTIMONY-ONLY, Gate-G-COPY, Gate-G-A11Y).

CRITICAL: Gate-G-ANON-ATTRIBUTION is the highest-stakes gate. The generated
PNG leaves the app permanently — an anonymous testimony's card must show
"Anonymous" and must never contain the author's real display name in
visible text, alt text, filename, or metadata. Resolve attribution through
the app's existing anonymity mechanism (R10), never an independent author-
identity read. A test must assert this.

Required plan-time recon (R6-R10):
- R6 (THE central decision): read PrayerReceipt.tsx's orchestration in
  full; decide shared-lib EXTRACTION vs. PARALLEL pattern. Brief leans
  extraction-with-regression-gate. If extraction makes PrayerReceipt.tsx's
  receipt-specific concerns hard to separate cleanly, parallel is
  legitimate. Document the choice + rationale as a Plan-Time decision.
  If extraction is chosen, Gate-G-6.1-REGRESSION-SAFE is in force.
- R7: read 6.1's share flow; decide preview-modal vs. direct-share for
  6.7 (consistency with 6.1 may win over the brief's modal lean)
- R8: read the testimony post-type max content length; confirm the
  long-content truncation strategy (D-LongContent)
- R9: determine whether 6.7's share action should mirror 6.1's advisory
  rate-limit, or skip it (no new backend per MPD-6)
- R10: identify the exact mechanism PrayerCard uses to resolve "Anonymous"
  vs. display name; TestimonyCardImage MUST route attribution through it

Also read in full (R1-R3 confirmed these exist; the plan needs their
detail): PrayerReceiptImage.tsx and PrayerReceipt.tsx, including every
code comment — the solved gotchas (document.fonts.ready / W33, off-screen
positioning / W34, scale:2, backgroundColor handling) MUST be carried
forward into whatever path R6 picks. Re-introducing a 6.1-solved bug is a
Gate-8 violation.

Plan-time divergences from brief: document in a Plan-Time Divergences
section. The R6 decision is itself a documented Plan-Time decision, not a
divergence. Anonymity-related or 6.1-regression-related divergences require
Eric's explicit chat sign-off before execute — recorded in the Execution
Log when received, not retroactively.

ALL copy in Section 7 D-Copy is BRIEF-LEVEL CONTENT. Generate plan
referencing verbatim.

SEQUENCING: execute waits for 6.6 to merge (hard prereq). If the Prayer
Wall Redesign side quest is also queued, 6.7 executes after it (InteractionBar
overlap). 6.7 must not execute concurrently with any in-flight Phase 6 spec.

Per W1, you do not run any git operations at any phase.
```

---

## 15. Verification Handoff (Post-Execute)

After CC finishes execute and produces the per-step Execution Log:

**Eric's verification checklist:**

1. Read the Execution Log's Plan-Time decisions FIRST — specifically which R6 path was chosen (extraction vs. parallel). This determines whether Gate-G-6.1-REGRESSION-SAFE is in force for this review.

2. Anonymous attribution (highest stakes): generate a PNG from an anonymous testimony. Verify the card shows "Anonymous." Verify the author's real display name appears NOWHERE — inspect the visible card, the download filename, and (if a preview img) its alt text. Confirm the anonymous-card test exists and asserts this.

3. IF extraction was chosen: run 6.1's full Prayer Receipt test suite. Verify it passes with ZERO modifications to its assertions. Then manually share a Prayer Receipt (6.1's feature) and confirm it still works identically. If any 6.1 test was modified to pass, halt — that's the Gate-G-6.1-REGRESSION-SAFE antipattern.

4. IF parallel path was chosen: confirm via the diff that no 6.1 file was touched (`PrayerReceipt.tsx`, `PrayerReceiptImage.tsx`, their tests all unchanged).

5. Brand-visual review (the High-tier judgment call): generate PNGs from a short testimony, a long testimony, and a testimony containing scripture. For each, look at the actual image:
   - Typography on-brand? Lora italic rendering for scripture (not system serif)?
   - Branding placed well?
   - Long content truncates gracefully with the "Read the full testimony" line?
   - Short content doesn't look empty/broken?
   - Would you be happy seeing this on someone's Instagram story?

6. Testimony gating: confirm the "Share as image" affordance appears on a testimony post and is ABSENT on prayer_request, question, discussion, and encouragement posts. Confirm the gating test covers all four.

7. Mobile: on a real phone, tap "Share as image" — verify the native share sheet opens with the image as a file.

8. Desktop: verify "Download image" saves the PNG.

9. Failure handling: if you can force a generation failure (throttle, etc.), verify it shows an error state, not a silent hang or broken modal.

10. Accessibility: keyboard-operate the whole flow (open affordance → modal → Share/Download → close). Verify focus trap + focus return. Run axe-core on the modal. Confirm the loading state is announced.

11. Reuse discipline: confirm in the diff that `document.fonts.ready`, off-screen positioning, `scale: 2`, and `backgroundColor` handling are all present in whatever path was chosen.

12. Confirm no analytics events were added (D-NoAnalytics) and no backend files were touched (MPD-6).

13. Read all copy aloud against Section 7 D-Copy. Verify brand voice.

**If all clean:** Eric commits, pushes, opens MR, merges to master. Tracker updates: 6.7 flips ⬜ → ✅ — and with it, the **entire Phase 6 wave is complete**.

**If the anonymous-attribution check or the 6.1 regression check fails:** Halt merge immediately. Both are HARD gates. A leaked anonymous identity is irreversible once a PNG is shared; a broken 6.1 receipt is a regression on a shipped feature. Discuss in chat before any further work.

---

## 16. Prerequisites Confirmed

- **6.6 (Answered Wall):** must merge first (hard prereq) — establishes the testimony-surfacing context
- **6.1 (Prayer Receipt):** ✅ ESSENTIAL — shipped the share-as-image pipeline (`PrayerReceiptImage.tsx` + `PrayerReceipt.tsx`) that 6.7 reuses. Verified via R1-R3.
- **`testimony` post-type:** ✅ verified via R4 (`frontend/src/types/api/prayer-wall.ts`)
- **`InteractionBar.tsx` + `ShareDropdown.tsx`:** ✅ verified via R5
- **`html2canvas`:** ✅ confirmed as the established tool (in use by 6.1; in `package.json` per Eric's standing notes)

**Sequencing:**
- 6.6 is a HARD prerequisite — 6.7 cannot execute until 6.6 merges.
- If the Prayer Wall Redesign side quest is queued, 6.7 executes AFTER it (both touch InteractionBar-area surfaces; sequential avoids churn overlap).
- 6.7 must NOT execute concurrently with any in-flight Phase 6 spec.
- Recommended full wave order: `6.1 → 1.5g → 6.2 → 6.2b → 6.3 → 6.4 → 6.5 → 6.6 → Prayer Wall Redesign → 6.7`.

After 6.6 merges (and ideally the redesign):
- Rebase/merge `forums-wave-continued` onto master
- Eric reviews + approves all copy in Section 7 D-Copy
- Run `/spec-forums spec-6-7-brief.md` → generates spec file
- Run `/plan-forums spec-6-7.md` → generates plan file (with R6-R10 plan-recon; R6 extraction decision is load-bearing)
- Eric reviews plan + verifies the R6 decision rationale + the anonymity-attribution approach
- Run `/execute-plan-forums YYYY-MM-DD-spec-6-7.md` → executes
- Eric reviews code via the 13-item verification checklist above
- Eric commits + pushes + MRs + merges
- Tracker: 6.7 ⬜ → ✅

**Post-merge:** 6.7 ships — and the **entire Phase 6 "Slow Sanctuary" wave is complete** (6.1 through 6.7, plus 1.5g and the Prayer Wall Redesign side quest). The Prayer Wall has its full quiet-engagement loop: prayer receipts, quick lift, prayer-length options, night mode, 3am watch, intercessor timeline, answered wall, and shareable testimony cards.

---

## End of Brief
