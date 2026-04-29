# Forums Wave: Spec 1.10e — Object Storage Adapter Foundation

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 1.10e (lines 2476-2610)
**Branch:** `forums-wave-continued` (no branch change — staying on the active Forums Wave branch per Eric's instruction)
**Date:** 2026-04-29
**Tier:** xHigh (foundation for 1.10c backups, 4.6b image uploads, 6.7 testimony cards, 10.11 deletion cleanup — wrong here forces retrofits in four downstream consumers)

---

## Affected Frontend Routes

N/A — backend-only spec. Infrastructure abstraction with no user-facing UI. The dev-profile-only `DevStorageController` exposes a presigned-URL serving endpoint at `http://localhost:8080/dev-storage/{key}` but it is not a user-facing route — it is a development convenience consumed only when a dev-mode adapter generates a "presigned URL" and the browser fetches it.

---

## Phase 3 Execution Reality Addendum — Applicability

The master plan body for 1.10e (lines 2476-2610) was authored before Phase 3 shipped, so it does not reference the Phase 3 Execution Reality Addendum. Applying the Addendum gates now:

| # | Addendum convention | Applies to 1.10e? | Action |
|---|---|---|---|
| 1 | EditWindowExpired returns 409 | N/A — no edit endpoints | — |
| 2 | L1-cache trap | N/A — no JPA entities | — |
| 3 | `@Modifying` flags | N/A — no JPQL | — |
| 4 | SecurityConfig method-specific rule ordering | **APPLIES** | `DevStorageController` URL pattern (`/dev-storage/**`) MUST be added to `PublicPaths.OPTIONAL_AUTH_PATTERNS` BEFORE the permitAll catchall, AND the controller class must carry `@Profile("dev")` so it is not registered in test/prod profiles. Test asserts both the rule ordering (method-specific BEFORE OPTIONAL_AUTH_PATTERNS) and that no bean is created under `prod`. |
| 5 | Caffeine-bounded bucket pattern | N/A for 1.10e itself | Applies to consumers (e.g., 4.6b's per-user upload rate limit). Spec calls this out for downstream awareness only. |
| 6 | Domain-scoped `@RestControllerAdvice` | **APPLIES** | `StorageExceptionHandler` MUST be `@RestControllerAdvice(basePackages = "com.worshiproom.storage")` (domain-scoped, not global) for `ObjectStorageIntegrityException` and any other domain exceptions defined by the spec. Test asserts the handler does NOT trip on exceptions thrown from siblings (e.g., `com.worshiproom.post`). |
| 7 | `CrisisAlertService` unified entry | N/A — no UGC handling | — |
| 8 | Schema realities — do NOT recreate | N/A — no schema changes | — |
| 9 | INTERCESSION ActivityType | N/A | — |
| 10 | `wr_prayer_reactions` shape | N/A | — |
| 11 | Liquibase filename convention | N/A — no schema changes | — |
| 12 | BB-45 cross-mount subscription test | N/A — backend spec | — |

---

## Recon Ground Truth (verified 2026-04-29 on active machine)

| ID | Finding |
|---|---|
| R1 | `com.worshiproom.storage/` package does NOT exist. Sibling packages confirmed at `backend/src/main/java/com/worshiproom/`: `activity/, auth/, config/, controller/, friends/, mute/, post/, proxy/, safety/, social/, user/`. This spec creates the new `storage/` package. |
| R2 | `application-{profile}.properties` pattern is standard. `application.properties`, `application-dev.properties`, `application-prod.properties` all present; **no `application-test.properties` exists**. New properties go under `worshiproom.storage.*`; AWS SDK reads its own env vars (`STORAGE_*`) directly. |
| R3 | `backend/.gitignore` does not currently exclude `storage/`. The LocalFilesystem adapter writes to `$HOME/.worshiproom-dev-storage` (per master plan body line 2509) — outside the repo, so no `.gitignore` change is needed. If the dev path moves into the repo at plan-time, update `.gitignore` accordingly. |
| R4 | No multipart upload config currently exists; `spring.servlet.multipart.max-file-size=1MB` is the shared default. 1.10e does NOT change this — Spec 4.6b will raise it for image uploads. |
| R5 | Testcontainers two-base-class pattern confirmed (Phase 1 Addendum #1). `AbstractIntegrationTest` exists for full-Spring-context integration tests; `AbstractDataJpaTest` exists for repository slice tests. Per Phase 1 Addendum, **do NOT introduce `application-test.properties`** — use `@DynamicPropertySource` for MinIO container endpoint binding. This contradicts the master plan body line 2552 ("`application-test.properties` — MinIO Testcontainer config") — Phase 1 Addendum is authoritative. The plan must wire MinIO via `@DynamicPropertySource` on the integration test, not via a properties file. |
| R6 | `backend/pom.xml` does NOT currently include `software.amazon.awssdk:*`. This spec adds `s3` and `s3-transfer-manager` via the SDK BOM (`software.amazon.awssdk:bom`) for version coherence. AWS SDK v2 (NOT v1; v1 is in maintenance mode). |
| R7 | `com.worshiproom.safety.CrisisAlertService` is the precedent for "domain owns its public interface at the package root, with implementations alongside." `com.worshiproom.storage.ObjectStorageAdapter` follows the same shape: interface at package root, implementations alongside. |
| R8 | `backend/.env.example` exists; `.env.example` at repo root does NOT. Storage env vars MUST be appended to `backend/.env.example`, not a new root-level file. (Brief originally said `.env.example` — disambiguated to `backend/.env.example` here.) |
| R9 | `backend/docs/runbook-storage.md` does NOT exist. This spec creates it. Sibling runbooks present: `runbook-monitoring.md`, `runbook-security-headers.md`, `env-vars-runbook.md`, `api-error-codes.md`. |
| R10 | `PublicPaths.OPTIONAL_AUTH_PATTERNS` lives at `backend/src/main/java/com/worshiproom/auth/PublicPaths.java:56`. `SecurityConfig.java:78` consumes it via `.requestMatchers(PublicPaths.OPTIONAL_AUTH_PATTERNS.toArray(new String[0])).permitAll()`. Method-specific rules MUST appear in `SecurityConfig` BEFORE that line (existing pattern at lines 49, 57, 66). |
| R11 | Spec tracker (`_forums_master_plan/spec-tracker.md`): row 21 (1.10b) is ✅ shipped. Row 23 (1.10e) is ⬜ — this spec. Prerequisite met. |

---

## Production Provider Decision

**Cloudflare R2.** Confirmed by Eric on 2026-04-29.

- **Why:** Free tier (10 GB / 1M Class A ops / 10M Class B ops / **zero egress cost**) covers MVP scale indefinitely. Egress cost is the primary differentiator vs. AWS S3 — for a backup + image upload workload that does not yet have public read traffic, R2's zero-egress model is materially cheaper.
- **How:** R2 is S3-API-compatible. `S3StorageAdapter` works against R2 by setting `STORAGE_ENDPOINT_URL` to `https://<account-id>.r2.cloudflarestorage.com`. AWS SDK v2 (`software.amazon.awssdk:s3` + `s3-transfer-manager`) handles AWS-native and R2 transparently — no R2-specific code path.
- **Eric's responsibility (NOT in spec scope):** R2 account creation, bucket creation (`worshiproom-prod` and optional `worshiproom-dev`), API token generation. Credentials live in Eric's secrets manager and are plugged into Railway env vars at production-cutover time. CC does NOT need the credentials to ship this spec.
- **Spec deliverables:**
  - `backend/.env.example` documents all 6 storage env vars with R2-specific examples in the comments.
  - `application-prod.properties` includes the R2 endpoint URL pattern as a comment.
  - `backend/docs/runbook-storage.md` confirms R2 is the chosen provider and documents API-token rotation procedure.

---

## Master Plan Divergences

**One divergence (Phase 1 Addendum override over master plan body):**

- Master plan body line 2552 lists `application-test.properties` as a "Files to modify" target for MinIO Testcontainer config. **Phase 1 Addendum #1 forbids this file.** The plan MUST use `@DynamicPropertySource` on the integration test to bind MinIO container endpoints into the Spring environment. See R5.

**No other divergences.** Three implementations, six interface methods, AWS SDK v2 dep, MinIO Testcontainer for tests, LocalFilesystem for dev, S3StorageAdapter for prod (bound to R2 via endpoint URL).

---

## Universal Rules quick reference (1.10e-relevant)

- **Rule 4** — OpenAPI extended for the dev-only presigned URL endpoint at `/dev-storage/{key}`. The prod `S3StorageAdapter` has NO public HTTP surface — clients hit R2 directly via signed URLs, so OpenAPI does not document any prod endpoint.
- **Rule 6** — All new code has tests. The `AbstractObjectStorageContractTest` is the load-bearing artifact (per master plan body lines 2587-2588 and "Out-of-band notes for Eric").
- **Rule 16** — Respect existing patterns:
  - Domain-scoped `@RestControllerAdvice` (Phase 3 Addendum #6)
  - Constructor injection
  - `@ConfigurationProperties` for config (`worshiproom.storage.*`)
  - `application-{profile}.properties` for profile-specific values (NOT `application-test.properties`)
  - AWS SDK v2 (NOT v1)
  - Domain interface at package root with implementations alongside (precedent: `CrisisAlertService`)

---

# Master Plan Canonical Body — Spec 1.10e

> The text below is preserved verbatim from `_forums_master_plan/round3-master-plan.md` lines 2476-2610. The Phase 3 Addendum applicability table (above) and Recon Ground Truth (above) supplement but do NOT supersede the canonical body, except where Phase 1 Addendum #1 overrides line 2552 (see Master Plan Divergences above).

### Spec 1.10e — Object Storage Adapter Foundation

- **ID:** `round3-phase01-spec10e-object-storage-adapter-foundation`
- **Size:** M
- **Risk:** Medium (foundational abstraction used by 1.10c backups, 4.6b images, 6.7 testimony cards, 10.11 deletion cleanup)
- **Prerequisites:** 1.10b
- **Goal:** Establish a single `ObjectStorageAdapter` interface with three implementations (production S3, test-time MinIO via Testcontainers, dev-time local filesystem). Every downstream consumer (backups, image uploads, shareable testimony cards, async deletion cleanup) depends on this adapter rather than talking to S3 SDK directly. This prevents four ad-hoc S3 integrations from drifting apart and makes dev iteration cheap (no AWS credentials needed for local work). Land this in Phase 1 — before any consumer — so the abstraction is genuinely tested against multiple backends before any feature code depends on it.

**Approach:** Thin interface, three implementations, Spring profile selection.

**The interface** (Java, illustrative):

```java
public interface ObjectStorageAdapter {
    StoredObject put(String key, InputStream data, long contentLength, String contentType, Map<String, String> metadata);
    Optional<StoredObjectStream> get(String key);
    boolean exists(String key);
    boolean delete(String key);
    List<StoredObjectSummary> list(String prefix, int maxResults);
    String generatePresignedUrl(String key, Duration expiry);
}
```

`StoredObject` returns `{ key, sizeBytes, etag, contentType }`. `StoredObjectStream` returns an `InputStream` the caller is responsible for closing (use try-with-resources). `StoredObjectSummary` is `{ key, sizeBytes, lastModified }`.

**The three implementations:**

1. **`S3StorageAdapter`** — AWS SDK v2, for production. Reads `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` env vars. Works against native AWS S3, Cloudflare R2 (S3-compatible), Backblaze B2 (S3-compatible endpoint), and any other S3-API-compatible provider by overriding `STORAGE_ENDPOINT_URL`. Retry with exponential backoff (3 attempts, 100ms / 300ms / 1000ms) on transient errors; non-retriable on 4xx. Active under `prod` profile.

2. **`MinIOStorageAdapter`** — Same code path as S3StorageAdapter (MinIO is S3-compatible), but initialized against a Testcontainers-managed MinIO container for integration tests. Active under `test` profile. Inside `AbstractIntegrationTest`, a `@Container` MinIO instance starts once per test class and is torn down cleanly.

3. **`LocalFilesystemStorageAdapter`** — Writes files to a configurable local directory (default `$HOME/.worshiproom-dev-storage`). Keys map to hierarchical filesystem paths (forward slashes become actual subdirectories). Metadata stored as sidecar `.meta.json` files alongside the data file. Presigned URLs generated as `http://localhost:8080/dev-storage/{key}?expires=...` served by a dev-only controller that verifies the expiry signature. Active under `dev` profile. Gives Eric a zero-setup local workflow — no AWS credentials, no Docker container, just `./mvnw spring-boot:run`.

**Key conventions:**

- All keys are lowercase, forward-slash-separated, hierarchical: `post-images/{user_id}/{post_id}/{rendition}.jpg` — not `PostImages\{UserId}\...`
- Top-level key prefixes (load-bearing across consumers): `post-images/`, `testimony-cards/`, `backups/pg_dump/`, `exports/user-data/`
- Keys never contain user input directly — always sanitize (strip `..`, enforce allowed charset) before composing a key. A consumer that builds `post-images/{filename}` where `filename` is user-supplied is a path traversal vulnerability
- Max key length: 256 characters (S3 allows 1024, but this buffer prevents surprises across providers)

**Content-Type and Content-Length** are required on every `put` — no inference. Callers MUST know what they're uploading. The adapter validates Content-Length matches the stream's actual byte count; a mismatch throws `ObjectStorageIntegrityException`.

**Retry and failure semantics:**

- Transient failures (timeouts, 5xx, connection resets) retry up to 3 times with exponential backoff
- Non-retriable failures (403 forbidden, 400 bad request, key-too-long) throw immediately — no retry
- Every retry logs at WARN; every final failure logs at ERROR and surfaces to Sentry per 1.10d
- Successful operations log at DEBUG with key + size + duration
- Adapter operations include `requestId` from MDC per 1.10d's logging foundation

**Security:**

- Never include `STORAGE_SECRET_KEY` in logs or exceptions (PII scrubber from 1.10d catches this as defense-in-depth, but don't rely on the scrubber; log only the error class + key)
- Presigned URL generation uses the adapter's signing key, NEVER a user-provided parameter
- Presigned URL expiry maximum: 24 hours (configurable via `STORAGE_MAX_PRESIGN_HOURS`, defaults to 1 hour; caller can request shorter)
- Bucket ACL defaults to private; individual objects never get public-read ACL from this adapter (consumers that need public objects, like testimony card shares, use presigned URLs instead)

**Files to create:**

- `backend/src/main/java/com/worshiproom/storage/ObjectStorageAdapter.java` (interface)
- `backend/src/main/java/com/worshiproom/storage/StoredObject.java` (record types)
- `backend/src/main/java/com/worshiproom/storage/S3StorageAdapter.java`
- `backend/src/main/java/com/worshiproom/storage/LocalFilesystemStorageAdapter.java`
- `backend/src/main/java/com/worshiproom/storage/StorageConfig.java` (Spring `@Configuration` that picks the adapter by profile)
- `backend/src/main/java/com/worshiproom/storage/controller/DevStorageController.java` (dev-profile-only presigned URL serving)
- `backend/src/main/java/com/worshiproom/storage/ObjectStorageIntegrityException.java`
- `backend/src/main/java/com/worshiproom/storage/StorageExceptionHandler.java` (added per Phase 3 Addendum #6 — domain-scoped `@RestControllerAdvice`)
- `backend/src/test/java/com/worshiproom/storage/S3StorageAdapterIntegrationTest.java`
- `backend/src/test/java/com/worshiproom/storage/LocalFilesystemStorageAdapterIntegrationTest.java`
- `backend/src/test/java/com/worshiproom/storage/AbstractObjectStorageContractTest.java` (contract test both impls must pass)
- `backend/docs/runbook-storage.md`

**Files to modify:**

- `backend/pom.xml` — add `software.amazon.awssdk:s3` and `software.amazon.awssdk:s3-transfer-manager` via the SDK BOM (`software.amazon.awssdk:bom`) for version coherence
- `backend/src/main/resources/application-dev.properties` — local filesystem storage path (`worshiproom.storage.local-path=${HOME}/.worshiproom-dev-storage`)
- ~~`backend/src/main/resources/application-test.properties`~~ **DO NOT CREATE** — Phase 1 Addendum #1 forbids `application-test.properties`. Use `@DynamicPropertySource` on the integration test to bind MinIO container endpoint, region, bucket, access key, secret key into the Spring environment.
- `backend/src/main/resources/application-prod.properties` — S3 binding (with R2 endpoint URL pattern as a comment: `# Cloudflare R2 endpoint format: https://<account-id>.r2.cloudflarestorage.com`)
- `backend/.env.example` (NOT `.env.example` — repo-root file does not exist; use the existing backend file per R8) — append all 6 storage env vars with R2-specific example values
- `backend/src/main/java/com/worshiproom/auth/PublicPaths.java` — add `/dev-storage/**` to `OPTIONAL_AUTH_PATTERNS` so the dev controller is reachable without JWT (dev profile only; controller is `@Profile("dev")` so the path is dead in test/prod). Per Phase 3 Addendum #4 the entry must appear BEFORE the catchall in the existing list.

**Database changes:** None

**API changes:** None for production (consumers expose their own endpoints).

Dev-only: `GET /dev-storage/{key}?expires=<unix-seconds>&signature=<hmac>` — verifies expiry signature, streams object bytes from local filesystem. Documented in OpenAPI under a `dev` tag with a note that the endpoint is registered only when `spring.profiles.active=dev`.

**Copy Deck:** None (no user-facing copy — infrastructure only).

**Anti-Pressure Copy Checklist:** N/A — no user-facing copy.

**Anti-Pressure Design Decisions:** N/A — infrastructure-only spec.

**Acceptance criteria:**

(Master plan body criteria, lines 2566-2588:)

- [ ] `ObjectStorageAdapter` interface defined with all 6 operations
- [ ] `S3StorageAdapter` passes the contract test against MinIO Testcontainer
- [ ] `LocalFilesystemStorageAdapter` passes the same contract test
- [ ] Both implementations implement all 6 operations with identical semantics (contract test enforces this)
- [ ] Spring profile `dev` selects LocalFilesystemStorageAdapter
- [ ] Spring profile `test` selects MinIOStorageAdapter (via same S3StorageAdapter code)
- [ ] Spring profile `prod` selects S3StorageAdapter
- [ ] Content-Length mismatch throws `ObjectStorageIntegrityException`
- [ ] Retry fires 3 attempts with exponential backoff on transient failures
- [ ] Non-retriable 4xx failures throw immediately (no retry loop)
- [ ] Presigned URL expiry capped at `STORAGE_MAX_PRESIGN_HOURS` (integration test verifies cap enforcement)
- [ ] Key sanitization rejects `..`, leading slashes, and non-allowed characters with `IllegalArgumentException`
- [ ] Max key length enforced at 256 characters
- [ ] Dev-profile controller serves presigned URLs with expiry signature verification
- [ ] Contract test covers: put+get roundtrip, put+exists+delete+exists-false, put+list-by-prefix, put+generatePresignedUrl, metadata preservation, Content-Type preservation, large-file handling (>5MB test fixture)
- [ ] Secret keys never appear in logs (unit test asserts no `STORAGE_SECRET_KEY` value in emitted log lines after a failure)
- [ ] Storage operations integrate with 1.10d's requestId MDC + Sentry error capture
- [ ] Runbook documents provider rotation and key rotation procedures
- [ ] At least 20 tests (contract + per-impl + config + security)

(Phase 3 Addendum and brief additions:)

- [ ] **Phase 3 Addendum #4:** `DevStorageController` carries `@Profile("dev")`. `/dev-storage/**` is added to `PublicPaths.OPTIONAL_AUTH_PATTERNS` BEFORE the permitAll catchall in `SecurityConfig`. Test verifies (a) no `DevStorageController` bean is registered under `prod`, and (b) the `OPTIONAL_AUTH_PATTERNS` list contains `/dev-storage/**` and that `SecurityConfig` consumes it before the catchall (existing rule-ordering test pattern in the codebase).
- [ ] **Phase 3 Addendum #6:** `StorageExceptionHandler` is annotated `@RestControllerAdvice(basePackages = "com.worshiproom.storage")` (domain-scoped, NOT global). Test asserts that exceptions thrown from `com.worshiproom.post` or `com.worshiproom.proxy` do NOT trigger this handler.
- [ ] `backend/.env.example` documents all 6 storage env vars (`STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_ENDPOINT_URL`, `STORAGE_MAX_PRESIGN_HOURS`) with R2-specific example values in inline comments (e.g., `# Cloudflare R2: https://<account-id>.r2.cloudflarestorage.com`).
- [ ] `backend/docs/runbook-storage.md` documents R2 token rotation procedure.
- [ ] `backend/pom.xml` adds AWS SDK v2 via the SDK BOM (`software.amazon.awssdk:bom`) — NOT pinned per-artifact versions. Sub-artifacts (`s3`, `s3-transfer-manager`) inherit BOM-managed versions.
- [ ] **Production startup safety:** `S3StorageAdapter` includes a `@PostConstruct` validator that throws `IllegalStateException` if `spring.profiles.active=prod` is active AND any of `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_ENDPOINT_URL` are null or empty. Test verifies that a prod-profile boot with missing env vars fails fast (does NOT silently fall back to LocalFilesystem). Error message names the missing env var(s) explicitly so the operator knows what to set.
- [ ] **Production cutover checklist:** `backend/docs/runbook-storage.md` includes a "Production Cutover Checklist" section with: (a) the 5 env vars to set in Railway with example R2 endpoint URL format, (b) verification step (deploy logs show `S3StorageAdapter` selected, no fail-fast trip), (c) smoke test (upload an image, verify object appears in R2 dashboard), (d) rollback procedure if the cutover misfires (revert Railway env vars, redeploy from previous build via `railway` dashboard).
- [ ] **Phase 1 Addendum #1:** No `application-test.properties` file is introduced. MinIO container endpoint binding is via `@DynamicPropertySource` on the integration test class only.

**Testing notes:**

- The `AbstractObjectStorageContractTest` is the load-bearing artifact: both S3 (against MinIO) and LocalFilesystem implementations extend it and MUST pass identical assertions. This is how we prevent drift between adapters.
- Use real byte streams in tests (fixture files at `src/test/resources/fixtures/`) — don't mock `InputStream` with string-based stubs that hide encoding/size issues.
- Contract test parameterized with small (1 KB), medium (500 KB), and large (6 MB, triggering multipart) file sizes.
- Local filesystem adapter test verifies actual disk writes/reads under a `@TempDir`.
- Per Phase 1 Addendum: integration test extends `AbstractIntegrationTest`; MinIO container is declared `@Container` and bound via `@DynamicPropertySource` on the test class. Pure-Java unit tests for `LocalFilesystemStorageAdapter` use `@TempDir` and do NOT need Spring context.
- Test count target: **~25 tests** (master plan body says "at least 20"; Phase 3 Addendum additions — auth rule ordering test, exception handler scope test, profile-bean-registration test, fail-fast prod boot test — push the realistic floor to ~25).

**Notes for plan phase recon:**

1. ~~Confirm Cloudflare R2 is acceptable as production storage~~ **CONFIRMED 2026-04-29** — R2 is the production provider. See "Production Provider Decision" section above.
2. Verify the MinIO Testcontainer image tag (`minio/minio:RELEASE.2024-...`) is current and stable. Choose the latest stable tag at plan-time and pin it.
3. ~~Decide bucket naming convention~~ **DECIDED** — `worshiproom-prod` (and optional `worshiproom-dev`). Eric provisions buckets out-of-band; spec does NOT include account/bucket creation steps.
4. ~~Confirm AWS SDK v2~~ **CONFIRMED** — AWS SDK v2 (NOT v1; v1 is in maintenance mode).
5. **NEW (Plan Tightening Audit focus areas):**
   - **Lens 5 (SecurityConfig rule ordering):** verify `DevStorageController` is `@Profile("dev")` AND `/dev-storage/**` is added to `OPTIONAL_AUTH_PATTERNS` correctly (BEFORE the catchall, per Phase 3 Addendum #4).
   - **Lens 6 (validation surface):** key sanitization (reject `..`, leading slashes, non-allowed chars) MUST run BEFORE any IO. Sanitization unit tests should not require an adapter to be wired.
   - **Contract test (load-bearing artifact):** both LocalFilesystem AND S3-against-MinIO must pass identical assertions including: put+get roundtrip, exists+delete+exists-false, list-by-prefix, generatePresignedUrl, metadata preservation, Content-Type preservation, large-file handling (>5MB multipart trigger).
   - **Secret-key scrubbing:** assert no `STORAGE_SECRET_KEY` value appears in any log line during failure tests (capture logs via `OutputCaptureExtension` or Logback list appender; assert the env-var value is NOT a substring of any captured line).

**Out of scope** (per master plan body lines 2599-2606):

- Client-side direct-to-S3 uploads (presigned POST). Deferred; all uploads go through the backend for PII/size/malware checks.
- Image transformation (resize, format conversion). That's Spec 4.6b's responsibility — the adapter only stores bytes.
- Server-side encryption with customer-managed keys (SSE-C, SSE-KMS). Defer until a real compliance need emerges.
- Cross-region replication. Deferred; MVP is single-region.
- Versioning (S3 object versions). Deferred; backup retention covers the accidental-overwrite case.
- Malware scanning (ClamAV integration). Deferred; PII stripping catches metadata-based risks, and user-uploaded images in a Prayer Wall context are lower-risk than, say, PDF uploads.
- R2 account creation, bucket creation, API token generation. Eric's responsibility, executed out-of-band at production-cutover time.

**Out-of-band notes for Eric:** The contract test is the single most important thing in this spec. It's what lets you swap providers in the future (R2 → S3 → B2) with confidence that your code still works. When you add new operations to the interface in later specs, add the assertion to the contract test FIRST — if the contract test doesn't cover it, future drift between S3 and Local implementations is guaranteed. Also: the `LocalFilesystemStorageAdapter` is intentionally not production-grade (no concurrency guarantees across processes, no atomic writes). That's fine — it's a dev convenience. If you ever find yourself tempted to use it in production, the answer is always "no, use real S3 or R2."

---

## Recommended planner instruction

When invoking `/plan-forums _specs/forums/spec-1-10e.md`, run the Plan Tightening Audit with extra scrutiny on:

- **Lens 5 (SecurityConfig rule ordering)** — `DevStorageController` must be `@Profile("dev")` AND `/dev-storage/**` added to `OPTIONAL_AUTH_PATTERNS` correctly.
- **Lens 6 (validation surface)** — key sanitization (reject `..`, leading slashes, non-allowed chars) BEFORE any IO.
- **Contract test** (the master plan body's load-bearing artifact) — both LocalFilesystem AND S3-against-MinIO must pass identical assertions including: put+get roundtrip, exists+delete+exists-false, list-by-prefix, generatePresignedUrl, metadata preservation, Content-Type preservation, large-file handling (>5MB multipart trigger).
- **Secret-key scrubbing** — assert no `STORAGE_SECRET_KEY` value appears in any log line during failure tests.
- **Phase 1 Addendum #1 compliance** — confirm the plan does NOT introduce `application-test.properties` and DOES use `@DynamicPropertySource` for MinIO container binding.
