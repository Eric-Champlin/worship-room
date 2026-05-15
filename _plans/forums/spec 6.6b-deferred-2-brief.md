Brief: Spec 6.6b-deferred-2 — Answered-Text Crisis-Scan Coverage
Spec ID: round3-phase06-spec06b-deferred2-answered-text-crisis-scan
Origin: Not a master-plan stub. This spec closes 6.6b-deferred-2, a SAFETY-SURFACE GAP logged in the spec-tracker.md brief-drift remediation block (2026-05-14). The gap was discovered during 6.6b plan-recon (the R3 finding), not planned — so there is no master-plan stub, and this brief is authored from the tracker entry + the R3 finding. Plan-recon must verify all current-code claims against the live repo.
Phase: 6 (remediation follow-up)
Size: S–M (narrow surface: one service, one detection-input path, no new feature, no UI, no migration)
Risk: HIGH — crisis-detection surface. The failure mode is a post containing crisis content going unflagged because the field it's written in was never scanned. Tier accordingly.
Tier: xHigh — small code surface, but it is a safety mechanism. The cost of getting it subtly wrong (scanning one path but not another, or scanning at create but not edit) is a real-world harm to a vulnerable user. xHigh thinking for all phases.
Prerequisites:

6.6 (Answered Wall) — ✅ shipped (answered_text field exists)
6.6b (Answered Wall Drift Remediation) — must be merged before this executes. 6.6b adds the answered-text edit path, which is one of the three write paths this spec must cover. If 6.6b is not yet merged, this spec waits.

Branch: forums-wave-continued. Eric handles all git ops. CC never commits/pushes/branches.

0. Why This Spec Exists — Read First
   During 6.6b plan-recon, the R3 finding established: PostService.createPost does NOT include answeredText in detectionInput. Crisis detection never sees answered-text content.
   W29 of the 6.6b brief was a conditional: "if answered_text is scanned at creation, the edit path must scan too." Plan-recon found the condition unmet — neither path scans. That made W29 technically satisfied (create and edit are consistent: both unscanned), which is why 6.6b correctly did not add scanning: adding it to the edit path alone would have created the inconsistency W29 exists to prevent, and adding it to both paths was scope creep beyond 6.6b's four documented gap areas.
   Eric signed off (2026-05-14) to defer to a dedicated spec where the work can be done atomically across ALL answered_text write paths. This is that spec.
   The core principle of this spec: atomicity. answered_text must be added to crisis detection's detectionInput across every write path in the same spec, the same change. Never one path without the others. A partial fix is worse than no fix because it creates the false confidence that the surface is covered.

1. The Three Write Paths — [PLAN-RECON MUST VERIFY ALL THREE]
   The tracker entry names three answered_text write paths that must all be brought under crisis scanning:

PostService.createPost — when a post is created already marked answered with answer text. R3 confirmed this path does NOT currently include answeredText in detectionInput.
PostService.updatePost — when a post is marked answered (or its content edited) through the update path. [PLAN-RECON: confirm whether this path touches answered_text and whether it currently scans].
The 6.6b answered-text edit path — the "Share an update" / edit-answered-text affordance 6.6b shipped. [PLAN-RECON: confirm the exact service method 6.6b introduced for this — it may be a new method on PostService or a dedicated handler; confirm whether it currently scans].

Plan-recon's first job: read the live PostService.java (and any 6.6b-added handler) and produce the definitive list of every code path that writes answered_text. The "three paths" above is the expected set from the tracker — if plan-recon finds a fourth (or finds one of these doesn't exist as described), it STOPS and surfaces to Eric before planning. Do not assume the three are exhaustive or exactly as named.

2. What "Bring Under Crisis Scanning" Means — [PLAN-RECON MUST VERIFY THE DETECTION CONTRACT]
   The fix is: answered_text content must flow into whatever detectionInput the crisis-detection mechanism consumes, on every write path, the same way post body content already does.
   Plan-recon must establish, from live code:

What detectionInput actually is — its type, its shape, how post body content currently populates it.
What consumes it — the crisis classifier / detection service, and whether it's synchronous or deferred.
Whether answered_text should be scanned as a separate field or concatenated into the existing input. [PLAN-RECON: determine which — the answer affects whether a crisis flag points at "the post" vs "the answer text specifically." Surface the tradeoff to Eric if non-obvious.]
Whether there is a Universal Rule 13 / crisis-detection spec or rules file that defines the contract this must conform to. The 6.4 work added .claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md — there may be a sibling crisis-detection rules file. Plan-recon reads it and the brief/plan conform to it.

This brief deliberately does not specify the detection mechanism's internals because it cannot be confirmed from here. Plan-recon grounds it.

3. Gates

Gate-G-ATOMIC (HARD). answered_text is added to detectionInput on ALL write paths in this spec, or none. Code review hard-blocks a diff that scans one path but not another. There is no partial-credit version of this spec.
Gate-G-NO-W29-INCONSISTENCY (HARD). After this spec, create / update / edit paths are consistent — all scan answered_text. The exact thing W29 guards against (one scans, another doesn't) must not exist in the merged result.
Gate-G-CONTRACT-CONFORM (HARD). The scanning conforms to the crisis-detection contract as defined by its rules file / spec (plan-recon establishes this). answered_text is scanned the same way post body content is — not a weaker or different treatment.
Gate-G-NO-SCOPE-CREEP (HARD). This spec adds answered_text to crisis scanning. It does NOT refactor the detection mechanism, does NOT touch other unscanned fields (if plan-recon finds any, it documents them as a separate future gap and surfaces — it does not absorb them), does NOT change crisis-flag UX.
Gate-4 (Tests mandatory). See Section 5.
Gate-G-6.6b-REGRESSION-SAFE (HARD). 6.6b's shipped tests pass unmodified.

4. Decisions Catalog

D-Atomic: all answered_text write paths brought under scanning in one spec, one change. The defining decision.
D-SameAsBody: answered_text is scanned the same way post body content is — same detection path, same severity treatment, same flag behavior. No bespoke weaker handling.
D-NoMechanismRefactor: if the cleanest long-term fix would be a detection-mechanism refactor, this spec does NOT do it — it does the minimal correct thing (add the field to every path's input) and, if a refactor is genuinely warranted, plan-recon surfaces that to Eric as a separate recommendation. This spec stays small and safe.
D-FieldVsConcat: [DEFERRED TO PLAN-RECON] — whether answered_text enters detectionInput as a discrete field or concatenated with body. Plan-recon decides with Eric; brief does not pre-commit.

5. Test Specifications
   Minimum coverage — plan-recon may add:

Create path: a post created with crisis content in answered_text IS flagged. (Today it is not — this is the regression-defining test.)
Update path: a post updated such that answered_text gains crisis content IS flagged.
6.6b edit path: editing answered_text to add crisis content IS flagged.
Consistency: the same crisis string in answered_text produces the same detection outcome regardless of which of the three paths wrote it.
Non-regression — body: post body crisis detection still works exactly as before (unchanged).
Non-regression — benign: benign answered_text does NOT produce a false positive.
6.6b regression: 6.6b's shipped test suite passes with zero assertion changes.

[PLAN-RECON: confirm whether these are unit tests against the service, integration tests against the detection mechanism, or both — depends on how detection is wired.]

6. Files — [ALL PLAN-RECON CONFIRMED]
   Modify (expected):

PostService.java — createPost, updatePost, and the 6.6b answered-text edit method: add answered_text to detectionInput construction in each.
Possibly the detection-input builder / DTO, if detectionInput is assembled in a shared helper — [PLAN-RECON: if there's a shared builder, the fix may be cleaner there, but it must still demonstrably cover all three call sites].

Create:

Test file(s) per Section 5.

Do NOT modify:

The crisis-detection mechanism's internals (Gate-G-NO-MECHANISM-REFACTOR).
6.6b's shipped test assertions.
Any other unscanned field (document + surface, don't absorb).

7. Recommended Planner Instruction

Plan spec-6-6b-deferred-2 from this brief. This is a HIGH-risk safety-surface remediation spec closing 6.6b-deferred-2 from the tracker. There is no master-plan stub — author the plan from this brief + live-code recon.
Plan-recon FIRST, before planning: (1) read live PostService.java and enumerate every answered_text write path — confirm or correct the expected three; (2) establish what detectionInput is and how post-body content currently populates it; (3) find and read the crisis-detection contract (rules file / spec — check .claude/rules/ for a sibling of CRITICAL_NO_AI_AUTO_REPLY.md); (4) determine field-vs-concat for answered_text in detectionInput.
If plan-recon finds a write path not in the expected three, or finds the detection contract forbids something this brief assumes, or finds another entirely-unscanned field — STOP and surface to Eric before planning.
Honor HARD gates: Gate-G-ATOMIC, Gate-G-NO-W29-INCONSISTENCY, Gate-G-CONTRACT-CONFORM, Gate-G-NO-SCOPE-CREEP, Gate-G-6.6b-REGRESSION-SAFE. Standard discipline: no git operations.

8. Prerequisites Confirmed

   6.6 shipped — answered_text exists
   6.6b merged — REQUIRED before execute (this spec covers 6.6b's edit path). Confirm before pipeline.
   Tracker entry 6.6b-deferred-2 is the authoritative scope source
   [PLAN-RECON] — live PostService.java wiring confirmed
   [PLAN-RECON] — crisis-detection contract / rules file located and read

End of Brief
