# Worship Room — Deployment Target Options (Spec 1.10b)

**Canonical spec ID:** `round3-phase01-spec10b-deployment-target-decision`
**Master plan ref:** `_forums_master_plan/round3-master-plan.md` Appendix E, lines 2008–2023
**Written:** April 2026. All pricing and feature claims reflect the state of each platform as of this date. Platforms change pricing frequently — re-verify any number older than ~12 months before committing.
**Scope:** backend + Postgres only. Frontend hosting (Vercel/Netlify/Cloudflare Pages for the Vite build) is out of scope and implicitly continues wherever the worshiproom.com preview builds live today.

---

## Summary / Recommendation

**Primary pick: Railway (all-in — app + Postgres on one platform).** For Worship Room's Phase 1 profile — one solo developer, pre-revenue, <20 users for the first six months, Spring Boot 3 JAR + PostgreSQL 16 + Liquibase — Railway's $5-plus-usage model lands around $5–$8/month total with a single dashboard, a single bill, native PostgreSQL, GitHub-integrated deploys, and enough headroom to scale the JVM without re-architecting. Its one meaningful gap (no native point-in-time recovery) is tolerable at this scale because daily logical backups plus Liquibase-versioned schema are sufficient recovery tooling pre-launch, and Spec 1.10c's "verify backup configuration during onboarding" explicitly names this as a platform-by-platform check rather than a blocker.

**Runner-up: Render (app) + Neon (Postgres).** Pick this if PITR matters sooner than expected, if Eric wants per-branch database previews for future schema migrations, or if he wants Postgres to scale-to-zero overnight when traffic is truly zero. The split costs a little more (~$7/mo web + $0–$10/mo Neon, depending on whether the Free or Launch tier is chosen) and adds a second vendor, but gives the best backup story of any option here.

**Eric makes the final call.** This document surfaces the decision; it does not lock it.

---

## Evaluation Criteria

Every candidate is scored against these ten axes, in the per-candidate sections below and summarized in the comparison matrix:

1. **Backend hosting model** — container? buildpack? native JAR? deployment friction for a Spring Boot 3 app.
2. **Postgres hosting** — native, add-on, or external? How well does PostgreSQL 16 + Liquibase work?
3. **Pricing** — free-tier posture and the lowest paid tier that keeps a backend + DB always-on.
4. **Backup capabilities** — automated backups, PITR, retention, restore UX. Feeds Spec 1.10c.
5. **Environment variable management** — UI, CLI, secret separation, per-environment overrides. Feeds Spec 1.10i.
6. **Deploy workflow** — GitHub-integrated? CLI-only? image-based? Rollback UX.
7. **Regions available** — US-East/Central availability is table stakes; global edge optional.
8. **Health-check conventions** — what endpoint gets polled, what status codes matter. Feeds Spec 1.10j.
9. **Connection limits on the entry DB tier** — informs HikariCP pool sizing. Feeds Spec 1.10k.
10. **Support quality** — async-only? Community forum? Paid tier? Documented SLA?

Three additional concerns are woven into per-candidate prose where load-bearing (not as matrix columns): **vendor lock-in risk**, **operational maturity**, and **observability integrations** (feeds Spec 1.10d).

---

## Candidates

### Railway

**Backend hosting model.** Container-first with Nixpacks auto-build; a Spring Boot JAR deploys from a Dockerfile or from a Maven/Gradle project Nixpacks detects. No buildpack gymnastics. Railway detects `pom.xml` and the JVM version from `.tool-versions` or the pom's `<java.version>`. Zero friction.

**Postgres hosting.** Native PostgreSQL 16 offered as a first-class service (same dashboard, one click to provision). Connects via standard `DATABASE_URL`. Liquibase applies cleanly on JAR startup ([Railway Postgres docs](https://docs.railway.com/databases/postgresql)).

**Pricing.** Hobby plan is $5/month with $5 of included usage credits; you pay the $5 subscription fee regardless of usage, plus any overage beyond the credit ([Railway Pricing](https://railway.com/pricing), verified April 2026). Real-world small-app cost lands around $5–$8/month for a single backend service + small Postgres. A lower-tier "Free" plan offers a 30-day trial with $5 credits, then $1/month at heavily constrained resources (1 vCPU, 0.5 GB RAM) — not suitable for a production Spring Boot JVM. For Worship Room, plan on Hobby.

**Backup capabilities.** This is Railway's weakest point. Backups ship as a feature but are daily with 7-day retention as the default, and **Railway does not natively provide point-in-time recovery** — the Railway community Q&A page confirms PITR is a documented gap and recommends third-party tools or self-managed pgBackRest for teams that need it ([Railway Help Station — PITR question](https://station.railway.com/questions/postgres-point-in-time-recovery-53f5c167)). Logical backups are sufficient for a pre-revenue, pre-launch stage; once user data volume grows and a bad migration becomes existentially risky, the PITR gap is where the platform starts to feel thin.

**Environment variable management.** Railway has a clean UI for vars with per-service scoping. Secrets flagged in the UI are masked. Per-environment overrides work via Railway's "Environments" feature (a "Production" vs "Staging" split). CLI `railway variables` mirrors the UI. Good fit for Spec 1.10i's env-var runbook.

**Deploy workflow.** GitHub-native: connect a repo, pick a branch, deploys happen on push. Rollback is a two-click affair from the deployments list. No image-push required unless you prefer pre-built Docker images. This is Railway's strongest differentiator.

**Regions.** US-East, US-West, EU-West, Southeast Asia ([Railway regions docs](https://docs.railway.com/reference/deployment-regions)). US-East and US-West cover Worship Room's expected user base; plenty.

**Health-check conventions.** Railway polls a user-defined health-check path (defaults to `/`), expects 2xx. Timeout and retry settings exist in the service config. Spec 1.10j's `/api/v1/health` liveness endpoint plugs in directly.

**Connection limits on the entry DB tier.** Railway's Postgres connection cap scales with the provisioned instance size; the platform doesn't publish a hardcoded ceiling but Postgres's own `max_connections` setting is tunable. Default is Postgres's 100 — plenty for a HikariCP pool of 10 on a single app instance. [unverified specific connection count for small Postgres — check at provisioning time, Railway's docs don't list it explicitly].

**Support quality.** Community forum (Railway Help Station) is active; paid support tiers are available on Pro plans. Documented SLA on the platform page is light — expect async community response for Hobby-tier issues. For a solo pre-revenue project this is fine; it stops being fine somewhere around "real users depend on the platform at 3 AM."

**Vendor lock-in: low.** A Spring Boot JAR and a vanilla PostgreSQL database are maximally portable. `DATABASE_URL` is a standard connection string. Migration to any other platform is a `pg_dump`/`pg_restore` plus a redeploy. No proprietary auth layer, no proprietary ORM, no platform-specific APIs in the running JAR.

**Operational maturity: mid.** Railway is a mature-enough product (seven figures of ARR, large hobby-dev community) but carries occasional deploy-time hiccups during busy infra windows. No dramatic 2024/2025 incidents on par with Fly.io's. The recent January 2026 observability blog post ([InfoQ coverage](https://www.infoq.com/news/2026/01/railway-diagnosing-failure/)) signals Railway is thinking seriously about production operations, which is a positive signal for a pre-revenue project planning to grow into it.

**Observability integrations: BYO with docs.** Railway ships logs + basic metrics in the UI. First-class Sentry integration is via the Java SDK (no platform-specific wiring needed). Datadog integration is documented via a deployable agent ([Set Up a Datadog Agent in Railway](https://docs.railway.com/guides/set-up-a-datadog-agent)) — note the egress cost warning. For Spec 1.10d's Sentry-based approach, Railway is effectively neutral: it won't help, it won't hinder.

---

### Render

**Backend hosting model.** Multi-mode: native buildpack autodetection (Maven/Gradle detected for Java/Spring Boot), Docker image, or pre-built JAR. Spring Boot 3 JAR deploys via the native Java runtime without a Dockerfile if desired. Render's build-and-deploy UX is the closest thing to legacy-Heroku in the current market.

**Postgres hosting.** Native PostgreSQL 16 as a first-class service ([Render Postgres docs](https://render.com/docs/postgresql)). Connect via `DATABASE_URL`. Liquibase applies on startup cleanly. Render supports both single-node and high-availability Postgres configurations, though HA is a paid upgrade well beyond entry-tier.

**Pricing.** Web service Starter is $7/month for 512 MB RAM ([Render Pricing](https://render.com/pricing), verified April 2026). Postgres starts at ~$6–$7/month for a 256 MB RAM / 1 GB storage development tier, but the **Basic tier at $20/month is the lowest plan Render itself characterizes as production-viable**. Workspace-tier pricing on Professional plans adds $19/user/month on top — irrelevant for a solo dev staying on Hobby but worth flagging since it changes the math dramatically if collaborators ever join. Realistic monthly cost for Worship Room on Render all-in: **$7 web + $20 Basic Postgres = $27/month**. This is more than 3× Railway Hobby, and the extra cost buys PITR and operational maturity (see below).

**Backup capabilities.** This is Render's strongest differentiator. **Point-in-time recovery is enabled on every paid Postgres instance** with a recovery window of 3 days on Hobby-plan workspaces and 7 days on higher-plan workspaces ([Render PITR announcement](https://render.com/blog/point-in-time-recovery), [Render Postgres backups docs](https://render.com/docs/postgresql-backups)). Logical backups are retained 7 days regardless of plan. For Spec 1.10c this is the lowest-friction backup story on the board; no third-party setup required.

**Environment variable management.** Per-service dashboard UI, with "Environment Groups" to share vars across services. Secret masking in UI. Per-environment overrides via Render's preview-environments system (branches automatically get preview env overrides). Clean.

**Deploy workflow.** GitHub-native. Automatic deploy on push to main, preview environments on PRs. Rollback via the deployments list. Same ergonomics as Railway, slightly more mature overall UI.

**Regions.** Oregon (US-West), Ohio (US-East), Virginia (US-East), Frankfurt (EU), Singapore (APAC) ([Render regions docs](https://render.com/docs/regions); Virginia region announced in early 2026, [changelog](https://render.com/changelog/virginia-region-us-east-now-generally-available)). Solid US coverage.

**Health-check conventions.** Render polls a configurable path and port, expects 2xx. Unhealthy services are marked and traffic is re-routed. Zero-downtime deploys are built-in. `/api/v1/health` plugs in directly.

**Connection limits on the entry DB tier.** Render does not publish a hardcoded connection count per tier on the pricing page. Empirically, the Basic Postgres tier ($20/mo) comfortably supports HikariCP pools of 10–20 connections per app instance. [unverified specific max_connections value on Basic tier — check at provisioning time]. At Worship Room scale this will not be the binding constraint.

**Support quality.** Community forum plus documented paid support. Async-first. No public SLA on Hobby-tier, but the platform has an extended uptime track record and public status page. Render is the most Heroku-like of the five candidates on support feel — not stellar, but predictable.

**Vendor lock-in: low.** Native buildpacks are standard (Heroku-compatible buildpack ecosystem). Postgres is vanilla. Migrating to another platform is `pg_dump` + redeploy. No proprietary APIs in the running app.

**Operational maturity: high.** Render has been in market since ~2019 and has a long track record of predictable behavior, public status page history with postmortems, and documented incident response. Nothing in the 2024–2026 window on par with Fly.io's IAD-dependency incident (below). The sticker shock of the Professional plan's $19/user/month fee has been a source of community pushback ([Render pricing criticism](https://servercompass.app/blog/render-pricing-is-it-worth-it)), but this is an ergonomics complaint, not a reliability one.

**Observability integrations: good.** Built-in logs and basic metrics in the dashboard. Log tailing via `render logs` CLI. Sentry drops in via the Java SDK with no platform-specific wiring. Built-in metrics cover HTTP requests, CPU, memory, bandwidth. For Spec 1.10d's needs (Sentry primary + UptimeRobot + Actuator), Render is effectively neutral-positive.

---

### Fly.io

**Backend hosting model.** Docker-image-first. The `flyctl` CLI builds and pushes images, then runs them on Fly Machines. Spring Boot JAR deploys via a Dockerfile (or a `Procfile` equivalent Fly provides); there is no buildpack autodetection comparable to Railway/Render. Deployment friction is noticeably higher than the alternatives — not painfully so, but CLI-heavy and image-oriented.

**Postgres hosting.** **This is the decisive fact about Fly.io for this decision:** as of this writing, Fly does not offer a managed Postgres product. The Supabase-managed "Fly Postgres" service was **deprecated April 11, 2025** ([Supabase deprecation notice](https://github.com/orgs/supabase/discussions/33413)), and Fly's own Postgres offering is explicitly documented as ["This Is Not Managed Postgres"](https://fly.io/docs/postgres/getting-started/what-you-should-know/) — single-node, manual upgrades, manual backups, no PITR. Fly.io's own docs recommend external managed Postgres (Neon, Supabase, etc.) for production workloads. **Any Fly.io recommendation is implicitly a Fly+Neon or Fly+Supabase split**, not a bundled deploy.

**Pricing.** Pay-as-you-go with no flat monthly. Smallest VM (shared-cpu-1x, 256 MB RAM) runs ~$2.02/month in Amsterdam, slightly more in North American regions ([Fly.io Resource Pricing](https://fly.io/docs/about/pricing/)). Volume storage $0.15/GB/month, outbound bandwidth $0.02/GB in North America/Europe, dedicated IPv4 $2/month per app. Free allowances are deprecated for new organizations as of 2026; legacy customers retain benefits grandfathered in. **Spring Boot JVM needs more than 256 MB RAM to be healthy** — realistically a shared-cpu-1x 1 GB or 2 GB machine, which bumps to ~$5–$15/month just for compute. Typical production app on Fly.io costs $20–$40/month all-in for compute + volumes + bandwidth + IP (searched pricing breakdown as of 2026; [Orb blog](https://www.withorb.com/blog/flyio-pricing), [CostBench](https://costbench.com/software/developer-tools/flyio/)), **before** adding external managed Postgres.

**Two pricing changes shipped in early 2026 that matter:** (a) volume snapshots are billed separately starting January 2026 — so any backup strategy that relied on auto-snapshots now incurs additional charges; (b) inter-region private network traffic (Fly's 6PN) is billed at machine rates starting February 2026 — multi-region architectures pay more. Both are reasonable changes but they mean public pricing advice written before late 2025 is stale.

**Backup capabilities.** **Gap by design.** Fly's Postgres is not managed. Snapshots are your responsibility, PITR is your responsibility. A Fly + Neon pairing gets Neon's restore window (see Neon section). A Fly + Supabase pairing gets Supabase's daily backups + optional PITR add-on. Standalone Fly Postgres is not an acceptable production answer for Worship Room.

**Environment variable management.** `fly secrets set` CLI for secrets; regular env vars via `fly.toml` or CLI. Secrets are encrypted at rest and injected at runtime. Functional, but CLI-primary rather than UI-primary.

**Deploy workflow.** `fly deploy` is the canonical flow; GitHub Actions integration works but isn't native the way Railway/Render's is. Rollback via `fly releases rollback`. The dev loop feels like `kubectl` for apps — powerful, but more knobs than a solo dev needs.

**Regions.** 35+ globally including iad (Ashburn VA), ord (Chicago), lhr (London), fra (Frankfurt), ams (Amsterdam), arn (Stockholm), bom (Mumbai), cdg (Paris), dfw (Dallas), ewr (Secaucus NJ), gru (São Paulo), jnb (Johannesburg), lax (LA), nrt (Tokyo), sin (Singapore), sjc (San Jose), syd (Sydney), yyz (Toronto) ([Fly regions docs](https://fly.io/docs/reference/regions/)). Global edge is Fly's marquee feature; for Worship Room's US-centric user base this is value Eric isn't going to use.

**Health-check conventions.** HTTP, TCP, and command health checks in `fly.toml`. Configurable timeouts, intervals, and grace periods. `/api/v1/health` plugs in fine.

**Connection limits on the entry DB tier.** N/A — Fly has no managed Postgres. Deferred to the external DB choice (Neon/Supabase) with its own connection-limit story.

**Support quality.** Community forum (`community.fly.io`) is very active and developer-dense; support tier "Serious Support" starts at $29/month ([Fly.io pricing](https://fly.io/pricing/)). Documented SLA of 99.9% with notable exclusions (see operational maturity below).

**Vendor lock-in: low at the compute layer.** The Docker image is portable. Anycast and 6PN are Fly-specific but no Worship Room code depends on them. The lock-in story is really "switching cost for someone who invested in multi-region routing" — which Worship Room hasn't.

**Operational maturity: mixed, with known structural risk.** Fly.io publishes a public status page ([status.flyio.net](https://status.flyio.net)) and a detailed infra log with postmortems ([infra-log](https://fly.io/infra-log/)) — positive transparency signals. **But** a 2025 postmortem confirmed that Fly's API has a strategic dependency on the IAD (Ashburn VA) region, and a sustained IAD failure can cause sustained API outages globally — including preventing deploys and new app creation — while existing running apps outside IAD continue to function. This is a documented, accepted design trade-off by Fly.io, and worth naming plainly: it means "deploying a hotfix during an IAD incident" is not something Fly.io commits to. The 2024–2025 window also saw multiple GraphQL API outages (Nov 25 and Nov 26, 2024, both documented in the infra log). The SLA 99.9% commitment is real, but the exclusions in Fly's [SLA terms](https://fly.io/legal/sla-uptime/) matter. For Worship Room's pre-launch pace these risks are survivable; they would be more load-bearing for a paid product.

**Observability integrations: strongest of the five.** Built-in Prometheus metrics shipped for every app. Fly runs a managed Grafana at fly-metrics.net with preconfigured dashboards ([Metrics on Fly.io](https://fly.io/docs/monitoring/metrics/)). Logs ship via NATS streams and can be forwarded to any log aggregator. Custom metrics exported in Prometheus format are auto-scraped. This is genuinely best-in-class among these five candidates, and is the strongest argument for Fly for a project that plans to grow observability needs.

---

### Supabase

**Evaluated on its actual offering (Postgres + auth + storage + Edge Functions), with a clearly-flagged gap on backend hosting.** The brief and the master plan both treat Supabase as a deployment-target candidate, but Supabase does not host arbitrary Spring Boot JARs. It hosts managed Postgres, an auth service, S3-compatible file storage, and Deno-based Edge Functions. If Worship Room were rearchitected to replace its Spring Boot backend with Supabase's bundle + Deno Edge Functions, Supabase would be a strong candidate. That rearchitecture is **not** on the table for Phase 1 — the Forums Wave master plan is explicitly Spring Boot + Java + PostgreSQL. So **Supabase in this evaluation is realistically only a Postgres-and-adjacent-services host**, paired with one of the other candidates (likely Fly.io or Render) for the Spring Boot JAR.

**Backend hosting model.** Not a general backend host for Java/Spring Boot. Edge Functions run Deno (TypeScript), not JVM. **Disqualifying for Worship Room's existing architecture.**

**Postgres hosting.** PostgreSQL (15/17 options; PG 16 supported) ([Supabase Docs regions](https://supabase.com/docs/guides/platform/regions)). Liquibase applies without issue via `DATABASE_URL`. Supabase exposes both Supavisor (connection pooler, used for most workloads) and PgBouncer (dedicated pooler on paid tiers, co-located with the database) alongside direct connections ([Supavisor & Connection Terminology](https://supabase.com/docs/guides/troubleshooting/supavisor-and-connection-terminology-explained-9pr_ZO)).

**Pricing.** Free plan: 2 projects, 500 MB database, 50K monthly active users for auth, 1 GB file storage, 5 GB egress ([Supabase Pricing](https://supabase.com/pricing)). **Critical Free-tier gotcha: projects pause after 7 days of inactivity** — not acceptable for a production backend, fine for dev/preview. Pro plan: $25/month + usage, 8 GB DB, 100K MAU, 100 GB file storage, 250 GB egress. Team: $599/month. For Worship Room, a Pro-tier Postgres-only setup (used just for the database, not for auth/storage) is paying $25/mo for value Eric mostly doesn't use — Neon is a more focused DB-only option for less.

**Backup capabilities.** Pro plan: daily backups with 7-day retention by default. **PITR is a paid add-on, not included in Pro**; it provides 14-day retention with seconds-granularity, but runs on the order of $100–$400/month depending on retention window and requires at minimum a Small compute add-on ([Supabase PITR docs](https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery)). For Worship Room's scale this is overkill.

**Environment variable management.** Supabase isn't a backend host — its env-var model applies to Edge Functions, not Spring Boot. N/A for this evaluation.

**Deploy workflow.** N/A — no backend deployment happens on Supabase for Worship Room.

**Regions.** AWS-only, 17 datacenter locations globally. US: us-west-1 (N. California), us-west-2 (Oregon), us-east-1 (N. Virginia), us-east-2 (Ohio). EU: Ireland, London, Paris, Frankfurt, Zurich, Stockholm ([regions docs](https://supabase.com/docs/guides/platform/regions)). Plenty of coverage; US-East or US-West matches Worship Room's user base.

**Health-check conventions.** N/A for backend — Supabase exposes its own health endpoints for its services.

**Connection limits on the entry DB tier.** Free tier: 60 direct + 200 pooler concurrent connections. Pro tier: higher, tied to compute size, with Supavisor pooler absorbing most client-connection pressure. Both Supavisor and PgBouncer have "max pooler clients" caps tied to compute tier ([connection management docs](https://supabase.com/docs/guides/database/connection-management)). For HikariCP sizing: use the pooler endpoint, not direct, and you have headroom.

**Support quality.** Community forum + Discord + paid tier on Pro+. Documented status page. Async-first.

**Vendor lock-in: this is where Supabase's picture gets interesting and is load-bearing for any composite recommendation.** The raw Postgres layer is maximally portable — `pg_dump`/`pg_restore` just works. The **auth service**, however, couples to Supabase's JWT issuance, magic-link flows, and OAuth provider config in ways that are non-trivial to migrate; the **Realtime service** similarly uses a Supabase-specific SDK surface; the **Storage service** is S3-compatible and portable. A Worship Room deployment that used Supabase purely as a Postgres host would carry essentially zero lock-in. A deployment that migrated auth to Supabase's GoTrue would carry meaningful lock-in — and Worship Room's Phase 1 already ships Spring Security + BCrypt + JWT-issuance in Java (Spec 1.4), so adopting Supabase auth would be a regression, not a feature gain. **The sensible role for Supabase in this decision is "maybe DB-only if Neon doesn't work out,"** not a bundle.

**Operational maturity: high.** Supabase publishes a [security retrospective](https://supaexplorer.com/dev-notes/supabase-security-2025-whats-new-and-how-to-stay-secure.html) annually, runs a public status page ([status.supabase.com](https://status.supabase.com)), and has a track record of shipping incident postmortems. Self-hosting migration documentation is maintained and was last updated April 8, 2026 ([Cloud-to-self-host guide](https://supabase.com/docs/guides/troubleshooting/transferring-from-cloud-to-self-host-in-supabase-2oWNvW)). Solid platform.

**Observability integrations.** Built-in logs and metrics in the Supabase dashboard. Supabase exposes standard Postgres logs and also its own service-level logs (auth, storage, Edge Functions). Sentry integrates on the app side (Spring Boot, not Supabase). Nothing notable beyond standard for this decision.

---

### Neon

**Postgres-only. Evaluated as a candidate for the database half of any split pairing (with Fly.io or Render hosting the Spring Boot JAR).**

**Backend hosting model.** N/A — Neon hosts Postgres only.

**Postgres hosting.** Serverless PostgreSQL 17 (and earlier versions on request), with compute scale-to-zero and storage-compute separation. PostgreSQL 16 is supported for Liquibase compatibility. Connection via standard `DATABASE_URL`; Neon requires the driver to accept the `options=project%3D<id>` connection parameter which Spring Boot's Hikari + PGJDBC handle transparently.

**Pricing.** Free plan: 100 CU-hours per project per month (doubled from 50 in October 2025), 0.5 GB storage per project, aggregate 5 GB across up to 10 projects, 6-hour restore window (1 GB limit), 1 manual snapshot, 5 GB network transfer, up to 60K MAU ([Neon Pricing](https://neon.com/pricing)). Launch plan: pay-as-you-go, no monthly minimum — $0.106/CU-hour, $0.35/GB-month storage, up to 16 CU autoscaling, 7-day restore window, 100 GB network transfer included, 1,000 projects with 10 branches each. For Worship Room's early-launch scale a Launch plan Postgres lands at roughly $5–$15/month depending on sustained CU-hours (1 CU = 1 vCPU + 4 GB RAM).

**2026 pricing changes:** in 2025, post-Databricks-acquisition, Neon dropped compute costs 15–25% across all tiers and cut storage from $1.75 to $0.35/GB-month — a dramatic reduction that moves Neon from "expensive niche" to "cheapest credible managed Postgres." Snapshot storage will be billed separately at $0.09/GB-month starting **May 1, 2026** (shortly after this decision doc is written); worth confirming at provisioning.

**Backup capabilities.** Strong. Instant restore / PITR is a first-class feature; configurable restore window up to 7 days on Launch, 30 days on Scale plan. Branching enables fork-at-any-point-in-time for previews (e.g., test a migration on a fork of production, then merge or throw away). Point-in-time restore is available from root branches ([branch restore docs](https://neon.com/docs/introduction/branch-restore), [PITR announcement](https://neon.com/blog/point-in-time-recovery)). For Spec 1.10c this is the most developer-ergonomic backup story on the board.

**Environment variable management.** N/A — this is a database, not an app host. Neon's API key and connection string are what get set as vars on the app host.

**Deploy workflow.** N/A for backend. Schema changes via Liquibase from the app host apply cleanly.

**Regions.** Primary: AWS us-east-1 (N. Virginia). Historically also on AWS us-west-2, eu-central-1, etc.; full region list on [Neon regions docs](https://neon.com/docs/introduction/regions). **Notable:** as of April 7, 2026, Neon has **deprecated** its Azure regions (azure-eastus2, azure-westus3, azure-gwc) — existing projects continue to run, but new Azure projects are no longer creatable. Stick to AWS regions, where Neon continues to invest.

**Health-check conventions.** N/A — database.

**Connection limits on the entry DB tier.** Driven by the Postgres `max_connections` setting, which scales with compute size ([Neon compute docs](https://neon.com/docs/manage/computes)). For a 1 CU (1 vCPU / 4 GB RAM) Launch compute, expect a `max_connections` in the low-to-mid hundreds — ample for HikariCP pools of 10 per app instance. **Worth flagging for Spec 1.10k:** if scale-to-zero activates during idle periods, the first request after idle will take longer (cold start in hundreds of milliseconds to ~1 second) as the compute resumes. For Worship Room's low-traffic early launch this is a mild latency tax, not a dealbreaker. Configurable minimum compute to keep the database warm is available (at compute-hour cost).

**Support quality.** Community Discord + paid support on higher tiers. Backed by Databricks since May 2025, which is a meaningful corporate-durability upgrade from the independent-startup era.

**Vendor lock-in: very low.** Postgres is Postgres. `pg_dump` to anywhere. The one feature that would create switching cost — Neon's branching model — is additive; losing it on migration costs you a dev-ergonomic feature, not production data.

**Operational maturity: high and rising.** Neon ran a public roadmap and postmortem culture before the Databricks acquisition and has continued post-acquisition. Pricing reduction in 2025 signals Databricks capital is flowing into operational maturity, not into extraction. The Azure-regions deprecation announcement on April 7 2026 was handled with 30-day notice and clear guidance for existing customers, which is the handling you want from an infra vendor.

**Observability integrations.** Dashboard-based metrics. Standard Postgres logs and performance-insights views. No first-class Sentry integration (Sentry wires in via the app, not the DB). For Spec 1.10d observability is handled upstream at the Spring Boot layer; Neon is neutral.

---

## Comparison Matrix

The matrix compresses each candidate to a single glance-able row against all 10 criteria. Per-candidate prose above is authoritative where the matrix abbreviates.

| Criterion | Railway | Render | Fly.io | Supabase | Neon |
|---|---|---|---|---|---|
| **1. Backend hosting** | Native Nixpacks/Docker; Java detected | Native Java buildpack + Docker option | Docker image + CLI; more friction | N/A (not a Java host) | N/A (DB only) |
| **2. Postgres hosting** | Native PG 16 | Native PG 16 | Unmanaged ("not managed Postgres"); pair with external | Managed PG (AWS) | Serverless PG 17 with branching |
| **3. Pricing (always-on small app + DB)** | ~$5–$8/mo | ~$27/mo ($7 web + $20 Basic DB) | $20–$40+/mo for compute before DB | DB-only use: $25/mo Pro | Free or ~$5–$15/mo Launch |
| **4. Backups** | Daily + 7-day retention; **no PITR** | **PITR on all paid DBs**, 3–7 day window | N/A (use external DB) | Daily 7-day; **PITR is $100–$400/mo add-on** | Instant PITR, 7-day Launch / 30-day Scale |
| **5. Env vars** | UI + CLI, per-env groups, masked secrets | UI + CLI + Env Groups, preview envs | `fly secrets` CLI-primary | N/A for backend | N/A (DB only) |
| **6. Deploy workflow** | GitHub push-to-deploy | GitHub push-to-deploy + preview envs | CLI-primary image deploy | N/A | N/A |
| **7. Regions** | US-East, US-West, EU-West, SEA | Oregon, Ohio, Virginia, Frankfurt, Singapore | 35+ global | AWS-only, 17 locations | AWS-only, multiple regions; Azure deprecated 2026 |
| **8. Health-check** | Configurable path, 2xx | Configurable path, 2xx, zero-downtime | Configurable in `fly.toml` | N/A | N/A |
| **9. Connection limits (entry tier)** | Tied to instance size; Postgres default 100 | Tied to instance size; scales with compute | N/A — external DB | Free: 60 direct / 200 pooler | Tied to CU size; mid-hundreds on 1 CU |
| **10. Support** | Community forum, paid on Pro | Community + paid, public status | Very active community, $29/mo tier | Community + Discord, paid Pro+ | Community + Databricks-backed paid |

**Matrix notes:**

- "N/A" on rows 1, 5, 6, 8 for Supabase and Neon reflects that those platforms don't host the Spring Boot JAR — the row would be filled by whichever app host they're paired with (Fly.io or Render).
- Row 3 pricing is "minimum viable always-on" for Worship Room's profile (single Spring Boot JAR + small Postgres). Not a forecast of costs at scale.
- Row 4 is the row where decisions tend to get made. PITR absence on Railway and PITR-as-paid-addon on Supabase are both notable; Render and Neon are the only candidates with PITR included at entry tier.
- [unverified specific connection-count numbers on entry tiers of Railway and Render — neither publishes a hardcoded value on their pricing pages; check at provisioning.]

---

## Candidates Explicitly Excluded

These are credible-enough platforms that some readers will wonder about. Each is excluded with a one-line rationale.

- **AWS (RDS + ECS/App Runner), GCP (Cloud Run + Cloud SQL), Azure (App Service + Flexible Server):** outside the "managed-service for solo dev, set-it-and-forget-it" bucket — more operational surface than Worship Room's Phase 1 needs.
- **Heroku (Eco Dynos / Basic Dynos + Essential-0 Postgres):** post-Salesforce price jump and the Essential-0 Postgres's 20-connection limit + 1 GB storage are too tight; community momentum has meaningfully shifted elsewhere ([Heroku alternatives roundup](https://snapdeploy.dev/blog/best-heroku-alternatives-2026)).
- **Vercel + Neon:** Vercel is frontend-only; doesn't host Spring Boot JARs. Neon pairing is already covered in the main matrix via Render/Fly.io.
- **DigitalOcean App Platform + Managed Postgres:** viable but entry-tier Managed Postgres starts at $15/month single-node (no HA) and App Platform entry costs comparable to Render — more expensive than Railway without a meaningful feature advantage for this profile.
- **Koyeb / Scaleway Serverless / Clever Cloud / Northflank:** credible EU-centric alternatives but smaller community footprints and less English-language tooling support; adds risk Eric doesn't need to take on.

---

## Bundling Question: One Platform or Two?

Three realistic pairings emerge from the candidates above, and picking between them is where most of the decision-weight actually lives.

**Option A — Bundled on Railway (app + DB).** Single vendor, single dashboard, single bill. Cheapest total cost (~$5–$8/month). Easiest debugging (one dashboard shows app logs next to DB logs). Easiest env-var wiring (Railway auto-injects `DATABASE_URL`). Matching regions are guaranteed. **Trade:** no PITR; Railway-as-platform maturity is mid rather than high; if Railway ever has a bad day you have no fallback.

**Option B — Bundled on Render (app + DB).** Single vendor, predictable flat-rate billing, production-grade PITR out of the box. The "graduate from Heroku" story. ~$27/month. **Trade:** costs ~3× Railway for functionally similar shape at Worship Room's scale; Render's workspace-tier pricing is a latent gotcha if collaborators ever join. Won't surprise anyone; won't delight anyone.

**Option C — Split across two platforms (app host + Neon).** Render + Neon is the best-of-class split: Render's $7 Starter web service + Neon Launch or Free for Postgres. Total cost $7–$20/month depending on Neon tier. Best backup story (Neon's branch-based PITR is ergonomically lovely). Fly.io + Neon is the same shape but adds Fly's edge-network benefits nobody in Phase 1 will use, at higher compute cost. **Trade:** two vendors means two billing dashboards, two status pages to monitor, two incident channels; env-var wiring needs `DATABASE_URL` set manually from Neon console into Render/Fly app config; region-matching is on Eric (Render Virginia + Neon us-east-1 is the obvious pairing).

**When the one-platform answer is right:** early-stage, low traffic, solo dev, cost-sensitive, "I want to ship not operate" — this is Worship Room today. Option A (Railway) wins on pure ergonomic-per-dollar.

**When the split answer is right:** when PITR is load-bearing (a bad Liquibase migration past the point of obvious failure, one that slips detection for a few hours, is the nightmare Phase 1 is designed to tolerate — but Option A's daily backup + Liquibase rollback does cover this); when you want DB branching for migration previews (nice but not essential); when you've outgrown the single-platform vendor-risk profile. Worship Room is probably not at any of these thresholds yet.

**The split also becomes right later.** If Railway's PITR absence becomes load-bearing — say, at the moment user data volume crosses "casual loss would be painful" — migrating just the database out of Railway onto Neon is a relatively simple cut (export, re-point `DATABASE_URL`, redeploy). That optionality is a real feature of picking Railway now: you can split later at low cost.

---

## Recommendation (Expanded)

**Primary: Railway, bundled (app + Postgres on one platform).**

**Three-sentence reasoning.** Railway minimizes the operational surface area Eric has to manage during a phase when shipping features (Phases 1 through 5 of the Forums Wave) is the binding constraint, not infrastructure tuning — one dashboard, one bill, GitHub push-to-deploy, and an automatically-wired `DATABASE_URL` all collapse the Spec 1.10 cutover checklist down to ~3 items ("set env vars, deploy the JAR, verify Liquibase applies"). The total cost at Worship Room's scale (~$5–$8/month) is the lowest of any credible production-grade option evaluated, which matters given stated cost-sensitivity and pre-revenue posture. The one real gap — no native PITR — is survivable for Phase 1 because daily logical backups plus Liquibase's own rollback changesets cover the realistic corruption scenarios, and migrating just the database to Neon later (when/if PITR becomes load-bearing) is a ~1-hour re-point operation with no code changes.

**Runner-up: Render (app) + Neon (Postgres).**

**One-sentence trigger.** Pick this if Eric wants PITR available on day one — either because Forums Wave Phase 2 dual-write migrations make the blast radius of a bad deploy feel too large to defer, or because the branch-based DB previews Neon offers would meaningfully speed Liquibase-migration testing.

**Both options are acceptable.** Neither is reckless, neither is over-engineered. If the read-through makes Eric lean the runner-up direction based on temperament ("I sleep better with PITR") rather than arithmetic, that's a legitimate override.

**What Eric should do after reading this:**

1. Pick one of the two. Update the tracker line 21 to ✅ with the pick noted.
2. Create the account(s) personally (safety rule — not Claude).
3. Proceed to Spec 1.10 (Phase 1 Cutover), which will plan against the picked platform's specifics.
4. Downstream specs (1.10c/d/e/i/j/k) can then plan against the picked platform's backup, monitoring, storage, env-var, health-check, and connection-limit specifics.

---

## Known Unknowns

Things deliberately **not** investigated in this decision. If any of these turn out to matter, the pick may need revisiting — but pre-emptively researching them would bloat this doc past its read-time budget.

- **Month-by-month cost forecasts at scale.** Entry-tier pricing is documented; cost at 10K users, 100K users, or under a bursty community challenge spike has not been modeled. Phase 2+ concern.
- **Performance benchmarks.** No p50/p95/p99 latency measurements, no sustained-load testing, no cold-start timing on Neon's scale-to-zero for Worship Room's specific query workload. "Set it up and measure in prod" is the right escape hatch at this scale.
- **Security audits / SOC 2 / HIPAA.** Worship Room Phase 1 stores prayer wall posts (public) and journal entries (encrypted, private). All five platforms are reputable-enough for this scope. A deep audit is overkill pre-revenue.
- **Cross-platform migration runbooks.** No "how to move from Railway to Render" guide written. This is the "if we picked wrong" problem, and the fact that all candidates use standard Postgres + Docker/buildpack-friendly app shapes means a future migration is a well-understood operation, not a research project.
- **Precise `max_connections` values on the entry DB tier of Railway, Render, and Supabase.** None of the three publishes a hardcoded value on their pricing pages; these need verifying at provisioning time with a `SHOW max_connections;` query. Feeds Spec 1.10k's HikariCP pool sizing.
- **Fly.io + Neon latency specifics.** Fly.io's global edge + Neon's AWS us-east-1-only deployment could introduce cross-region latency if Fly.io app machines run far from N. Virginia. Mitigation: pin Fly.io region to `iad` (Ashburn VA) to co-locate. Not validated empirically.
- **Backup-restore drill.** None of the candidates has been exercised with a mock "restore from backup to a fresh cluster" for Worship Room's schema. Spec 1.10c is where this gets done. Until then the PITR claims above are platform promises, not validated behavior.
- **Frontend hosting.** The brief explicitly defers frontend target to wherever the worshiproom.com preview builds currently live. Vercel is the likely incumbent; no evaluation of swapping frontend host accompanies this doc.
- **Domain/DNS/SSL/CDN details.** Every listed platform handles these automatically but the mechanics differ. Deferred to the per-platform onboarding step in Spec 1.10.

---

## Sources

Platform documentation and pricing pages (all verified April 2026):

- Railway: [Pricing](https://railway.com/pricing), [Pricing plans](https://docs.railway.com/pricing/plans), [PostgreSQL docs](https://docs.railway.com/databases/postgresql), [Regions](https://docs.railway.com/reference/deployment-regions), [Datadog agent guide](https://docs.railway.com/guides/set-up-a-datadog-agent), [PITR community Q&A](https://station.railway.com/questions/postgres-point-in-time-recovery-53f5c167).
- Render: [Pricing](https://render.com/pricing), [Regions](https://render.com/docs/regions), [Flexible plans for Postgres](https://render.com/docs/postgresql-refresh), [PITR announcement](https://render.com/blog/point-in-time-recovery), [Postgres backups docs](https://render.com/docs/postgresql-backups), [Virginia region GA changelog](https://render.com/changelog/virginia-region-us-east-now-generally-available).
- Fly.io: [Pricing](https://fly.io/pricing/), [Resource pricing docs](https://fly.io/docs/about/pricing/), [Regions](https://fly.io/docs/reference/regions/), [Not Managed Postgres](https://fly.io/docs/postgres/getting-started/what-you-should-know/), [Supabase-managed Fly Postgres deprecation](https://github.com/orgs/supabase/discussions/33413), [Status page](https://status.flyio.net), [Infra log](https://fly.io/infra-log/), [Metrics on Fly.io](https://fly.io/docs/monitoring/metrics/), [SLA terms](https://fly.io/legal/sla-uptime/).
- Supabase: [Pricing](https://supabase.com/pricing), [Available regions](https://supabase.com/docs/guides/platform/regions), [Database backups](https://supabase.com/docs/guides/platform/backups), [PITR usage](https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery), [Connection management](https://supabase.com/docs/guides/database/connection-management), [Supavisor terminology](https://supabase.com/docs/guides/troubleshooting/supavisor-and-connection-terminology-explained-9pr_ZO), [Cloud-to-self-host migration](https://supabase.com/docs/guides/troubleshooting/transferring-from-cloud-to-self-host-in-supabase-2oWNvW).
- Neon: [Pricing](https://neon.com/pricing), [Plans](https://neon.com/docs/introduction/plans), [Regions](https://neon.com/docs/introduction/regions), [Scale to zero](https://neon.com/docs/introduction/scale-to-zero), [Branch restore / PITR](https://neon.com/docs/introduction/branch-restore), [PITR announcement](https://neon.com/blog/point-in-time-recovery), [Compute management](https://neon.com/docs/manage/computes).
- Third-party comparison context: [Railway vs Fly.io 2026 (TheSoftwareScout)](https://thesoftwarescout.com/fly-io-vs-railway-2026-which-developer-platform-should-you-deploy-on/), [Railway vs Render (Northflank blog)](https://northflank.com/blog/railway-vs-render), [Fly.io pricing breakdown (Orb)](https://www.withorb.com/blog/flyio-pricing), [Supabase vendor lock-in analysis (Hrekov)](https://www.hrekov.com/blog/supabase-vendor-lock-in-myth), [Heroku alternatives roundup](https://snapdeploy.dev/blog/best-heroku-alternatives-2026).

---

**End of document.**
