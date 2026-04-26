# Database Backup Gap Analysis

**Spec:** 1.10c (pivoted from runbook + drill to gap analysis)
**Date:** 2026-04-25
**Status:** Decision deferred — trigger condition documented below
**Author:** Eric

---

## 1. Current State (verified 2026-04-25)

Phase 1 dashboard inspection of the production Railway project confirmed:

- The project runs on the **Railway Hobby plan** ($5/mo).
- The Postgres service's **Backups tab is locked** and displays the message: _"Backups are only available for customers on the Pro plan."_
- **Zero backups exist** for the Postgres service.
- **No manual backup trigger** is available — the "Create Backup" / "Backup Now" button is gated behind the Pro plan upsell.
- **No restore capability** is exposed in the dashboard. There is no list of backup snapshots to click through, and no restore modal to inspect.

Implication: today, if the Railway Postgres volume were lost, corrupted, or accidentally truncated, there is **no Railway-managed recovery path**. The only recovery would be re-running Liquibase migrations against a fresh database and re-creating any users by hand.

---

## 2. Risk Assessment Given Current Scale

| Dimension                      | Today                                        | After first real user registers               |
| ------------------------------ | -------------------------------------------- | --------------------------------------------- |
| Real (non-tester) user count   | 0                                            | 1+                                            |
| Data loss exposure             | Low — test users only, trivially recreatable | **High** — real user content is unrecoverable |
| Recovery Time Objective (RTO)  | ~5 minutes (recreate test users by hand)     | Infinite (no recovery possible)               |
| Recovery Point Objective (RPO) | N/A (nothing worth recovering)               | Total loss of all data since launch           |
| Acceptable in current state?   | Yes (with caveats)                           | **No**                                        |

The risk profile inverts the moment the first stranger registers. Today the database holds Playwright smoke test users and friends-of-Eric test data — losing it costs an afternoon of recreation. Once a real user trusts the app with their journal entries, prayer wall posts, or community profile, "no backup" stops being an acceptable posture.

---

## 3. Remediation Paths

Three viable paths exist. The decision is deferred (see § 4) but each path is pre-thought so the choice is fast when the trigger fires.

### Path A — Upgrade to Railway Pro

- **Cost:** ~$20/mo total (vs $5/mo Hobby — net delta ~$15/mo).
- **Pros:**
  - Backups become native to the existing platform; no new infrastructure.
  - Same dashboard, same CLI, same deploy pipeline.
  - Fastest switch — likely a single billing-page action plus a verification pass.
- **Cons:**
  - ~$15/mo extra recurring cost.
  - **PITR semantics still need verification.** `_plans/forums/deployment-target-options.md` made assumptions about Railway's backup behavior at the Pro tier that have not been confirmed against a live Pro dashboard. Cadence, retention window, and restore-modal language (in-place vs sibling-database) are all currently unknown for Pro.
- **Verification before adopting:** a fresh Phase-1-style dashboard inspection of a Pro-tier Postgres service is required before this path is considered a complete answer. The unknowns are: (a) backup cadence, (b) retention period, (c) does restore replace the live database in-place or spin up a sibling, (d) is point-in-time recovery offered or only daily snapshots.

### Path B — Stay on Hobby, build pg_dump automation

- **Cost:** ~$1/mo for object storage (S3, Cloudflare R2, or Backblaze B2) plus setup time.
- **Pros:**
  - Cheap.
  - Full control over backup format, retention, encryption, and destination.
  - Decoupled from Railway's plan tier — works the same if we later migrate to a different host.
  - The dump can be tested locally before any restore touches production.
- **Cons:**
  - More moving parts: a cron job (Railway scheduled job, GitHub Actions workflow, or external scheduler), object storage credentials managed as backend secrets, monitoring to alert when a dump fails silently.
  - Maintenance burden owned by us — Railway won't notice or fix a broken backup pipeline.
  - **Drift risk:** an untested backup is not a backup. Without a periodic restore drill (quarterly minimum), the pipeline can rot for months before being caught.
  - No native PITR — restores are limited to discrete dump snapshots.
- **Future spec:** would be tracked as `1.10c-bis` or similar; estimated M-size. Includes the cron job, the storage adapter, the monitoring/alert wiring, and a documented restore drill that runs at least once before the trigger condition fires.

### Path C — Migrate Postgres to Neon

- **Cost:** free tier likely covers Phase 1 scale (Phase 1 storage and compute requirements are well under Neon's free-tier ceilings).
- **Pros:**
  - Backups and **point-in-time recovery** are included on the free tier. PITR is the gap that Railway Pro may or may not close — Neon explicitly documents it.
  - Decouples the database from the Railway deploy lifecycle, which is incidentally useful if we ever switch app hosting.
  - Branching workflow (Neon's native feature) becomes available for staging-style schema testing later.
- **Cons:**
  - ~1-hour migration window during which writes are paused or dual-routed.
  - New vendor relationship, new dashboard, new credentials in the secret store.
  - `DATABASE_URL` swaps from Railway-injected to Neon-managed; backend env vars in Railway need updating, and the Postgres service in Railway gets retired.
  - Network hop changes — Railway backend → Neon Postgres is cross-provider rather than same-provider. Latency is generally fine for serverless Postgres but should be measured.
- **Future spec:** bounded migration spec; rough sketch already lives in `_plans/forums/deployment-target-options.md`. Estimated M to L size depending on whether we keep Railway Postgres warm as a parallel for one cycle.

---

## 4. Decision Deferred Until Trigger Condition

The choice between A, B, and C does **not** need to be made today.

- The gap is now documented (this file).
- The three viable paths are pre-thought, with cost, pros, cons, and verification-blockers spelled out.
- The choice will be made when the trigger condition (§ 5) fires — at which point the decision is a 30-minute conversation, not a research project.

This deferral is deliberate, not lazy. Today's risk exposure is low enough that paying $15/mo or building pg_dump tooling now would be premature optimization. Once the trigger condition approaches, the situation re-evaluates against current information (Pro plan terms, Neon free-tier ceilings, real user growth rate).

---

## 5. Trigger Condition

**Before the first non-friend user registers, one of paths A, B, or C must be in place and verified by a successful restore drill.**

- This is a **hard prerequisite for public beta**. The app cannot accept registrations from strangers without a working backup-and-restore story.
- It is **acceptable** to defer through a friends-and-family beta phase, provided every invitee receives an explicit, written disclosure stating: _"This is an early-access build. The database is not currently backed up. Your data may be lost without warning. Treat any content you post here as ephemeral."_ No surprises, no implicit trust.
- It is **not acceptable** the moment a registration form is exposed to anyone the team does not know personally.

The trigger is binary, not gradual. The day before public-beta launch is too late — the verification drill alone takes time, and a failed first drill (almost always the case) needs days of buffer to diagnose and re-test.

---

## 6. Related Specs

- **1.10b — Deployment target decision (Railway selected).** Captured the original platform choice; this gap is a downstream consequence of the Hobby tier choice that 1.10b documented.
- **1.10c — Backup runbook (this spec, pivoted).** Originally scoped as "write a runbook + execute a drill against Railway-native backups." Pivoted to gap analysis after Phase 1 dashboard inspection revealed Hobby has no backups to drill against.
- **1.10d — Production monitoring (Sentry + UptimeRobot).** Currently has no backup-related alerting because no backups exist. Once Path A, B, or C is adopted, an alert on backup failure or staleness is a follow-on requirement.
- **Future spec — 1.10c-bis** if Path B is picked: pg_dump cron, object storage destination, monitoring, restore drill cadence.
- **Future spec — DB migration** if Path C is picked: Neon provisioning, dual-write or maintenance-window cutover, env var rotation, parallel-run validation.
- **`_plans/forums/deployment-target-options.md`** — contains the original platform comparison and a rough sketch of the Neon migration path; this file is the authoritative current-state assessment.

---

## Notes for Future Eric

- This document is the answer to "why does production have no backups?" Don't be surprised — it's deliberate and trigger-gated.
- When you come back here to make the decision, the first verification step is **inspect a live Pro-tier Postgres dashboard** before committing to Path A. The assumptions in `deployment-target-options.md` were made without that inspection.
- The trigger condition is sharper than "before public launch." It's "before the first stranger registers." Phrase it that way to yourself when measuring readiness.
- A backup that has never been restored is not a backup. Whichever path is chosen, the first deliverable is a documented, executed restore drill — not the backup pipeline itself.
