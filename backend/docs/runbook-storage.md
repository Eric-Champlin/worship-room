# Object Storage — Operator Runbook

This runbook documents how the Worship Room object-storage adapter is wired and how to operate it across dev / test / prod. Established by Forums Wave **Spec 1.10e** (Object Storage Adapter Foundation).

- **Code authority:** `backend/src/main/java/com/worshiproom/storage/S3StorageAdapter.java` + `LocalFilesystemStorageAdapter.java` + `StorageConfig.java`
- **Policy authority:** `.claude/rules/02-security.md` (input validation, secret handling), spec 1.10e
- **Test authority:** `backend/src/test/java/com/worshiproom/storage/AbstractObjectStorageContractTest.java` — the load-bearing parity contract
- **Sibling runbooks:** `runbook-monitoring.md`, `runbook-security-headers.md`, `env-vars-runbook.md`, `api-error-codes.md`

---

## 1. Purpose and scope

The object-storage adapter is the foundation for every binary-blob persistence concern downstream. As of Spec 1.10e shipping, no consumer is live — the adapter is purely infrastructure. The pending consumers and what they will store:

| Spec | Consumer | What it stores |
|---|---|---|
| 1.10c | Database backup | Daily PostgreSQL `pg_dump` archives, 30-day retention |
| 4.6b | Image uploads | Post images (testimonies, encouragements), thumbnails, transformed variants |
| 6.7 | Testimony cards | Generated share-image PNGs |
| 10.11 | Account deletion | Cleanup pass — enumerate + delete all keys belonging to a deleted user |

Every consumer injects `ObjectStorageAdapter` and uses the 6 methods declared on the interface. Consumers do NOT depend on `S3StorageAdapter` or `LocalFilesystemStorageAdapter` directly.

---

## 2. Provider matrix

| Profile | Adapter | Backing | Notes |
|---|---|---|---|
| `dev` | `LocalFilesystemStorageAdapter` | `${HOME}/.worshiproom-dev-storage` | Local-filesystem; presigned URLs point at `/dev-storage/{key}` served by `DevStorageController` (HMAC-SHA256-verified). |
| `test` | `S3StorageAdapter` | MinIO Testcontainer | S3-API-compatible; container starts per test class via `@DynamicPropertySource`. |
| `prod` | `S3StorageAdapter` | Cloudflare R2 | S3-API-compatible. Boot fails fast on missing `STORAGE_*` env vars. |

**Why R2 over AWS S3 for production:**

- **Zero egress fees.** R2 charges $0/GB egress. AWS S3 charges $0.09/GB egress. For Worship Room's expected mix of post images served to the public, this is a meaningful operating-cost difference.
- **S3-API-compatible.** No code path is R2-specific — the adapter uses AWS SDK v2 with `endpointOverride(...)` pointing at the R2 endpoint.
- **Provider lock-in is low.** Switching to AWS S3, Backblaze B2, or any other S3-compatible provider is an env-var change (see § 5).

**Why MinIO over LocalStack for tests:**

- Lightweight (~1s container start vs LocalStack's much heavier startup).
- S3-API-only (no irrelevant feature surface).
- Well-known Testcontainers integration via `org.testcontainers:minio`.

---

## 3. R2 account setup (Eric's responsibility, OUT OF BAND)

Setup is OUT OF SPEC SCOPE for 1.10e. The spec only ships the adapter that consumes credentials; Eric provisions the R2 account and bucket before the first downstream consumer (1.10c, 4.6b) ships.

Steps (link Cloudflare R2 docs as needed):

1. **Create a Cloudflare account** (free tier sufficient to start).
2. **Enable R2** in the Cloudflare dashboard.
3. **Create a bucket** named `worshiproom-prod`. Optionally a separate `worshiproom-dev` bucket if R2 is ever used for dev (currently only LocalFilesystem is used in dev).
4. **Create an API token** scoped to **Object Read & Write** on the specific bucket — NOT account-wide. Capture the Access Key ID and Secret Access Key.
5. **Capture the R2 endpoint URL** in the format `https://<account-id>.r2.cloudflarestorage.com`.
6. Store the four secrets (`STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_ENDPOINT_URL`) plus `STORAGE_REGION=auto` in Railway Variables UI for the backend service.

---

## 4. Production cutover checklist

When the first downstream consumer (likely 1.10c backups or 4.6b image uploads) ships and prod traffic begins flowing through the adapter:

1. **Set 5 env vars in Railway → Backend service → Variables:**
   - `STORAGE_BUCKET=worshiproom-prod`
   - `STORAGE_REGION=auto`
   - `STORAGE_ACCESS_KEY=<R2 access key>`
   - `STORAGE_SECRET_KEY=<R2 secret key>`
   - `STORAGE_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com`
   - Optionally `STORAGE_MAX_PRESIGN_HOURS=1` (default value, change only if a specific consumer needs longer URLs).
2. **Redeploy the backend.** Railway will rebuild and roll out the new env. If any required value is missing, the deployment fails at the `S3StorageAdapter.initialize()` `@PostConstruct` step and the rollout aborts (no partial-traffic exposure).
3. **Verify deploy logs** show:
   - `Started WorshipRoomApplication` — context refresh succeeded.
   - No `IllegalStateException` mentioning `STORAGE_*` env vars.
4. **Smoke test** (after the first consumer ships): trigger a single end-to-end write (e.g., upload a small post image, OR run a backup), then verify the object appears in the R2 dashboard at `Cloudflare → R2 → worshiproom-prod`.
5. **Rollback procedure** (if anything goes wrong):
   - Revert Railway env var changes to the previous values.
   - Or redeploy the previous build via Railway Dashboard → service → Deployments → previous → Redeploy.
   - Since no schema migration is involved, rollback is purely a Railway operation.

---

## 5. Provider rotation (R2 → AWS S3, R2 → B2, etc.)

Switching providers is an env-var-only operation:

1. Provision the new bucket in the target provider with the same naming.
2. Copy existing objects across (one-shot operation; out of scope for this runbook — typically done via `rclone` or a custom job with both providers' SDKs).
3. Update Railway env vars:
   - `STORAGE_ENDPOINT_URL=<new provider's endpoint>` (e.g., `https://s3.us-east-1.amazonaws.com` for AWS S3, `https://s3.us-west-002.backblazeb2.com` for B2).
   - `STORAGE_REGION=<new provider's region>` (e.g., `us-east-1`, `us-west-002`).
   - `STORAGE_ACCESS_KEY=<new provider's access key>`.
   - `STORAGE_SECRET_KEY=<new provider's secret key>`.
   - `STORAGE_BUCKET=<new bucket name>` (only if naming differs).
4. Redeploy. Verify smoke test as in § 4.4.

The adapter code path is provider-agnostic (path-style addressing is enabled, AWS SDK v2 default retry policy is replaced with the bounded retry helper). The only adapter assumption is "S3-API-compatible."

---

## 6. API token rotation

Rotate quarterly, OR immediately on suspected compromise.

Worked example (~5 minutes total wall-clock):

1. Generate a new R2 token with the same scope (Object Read & Write on the specific bucket).
2. In Railway Variables, update `STORAGE_ACCESS_KEY` and `STORAGE_SECRET_KEY` with the new values.
3. Redeploy the backend. Wait for the readiness probe to flip to UP (`/actuator/health/readiness` returns 200).
4. Run a smoke test (upload + immediate read).
5. Revoke the old token in the Cloudflare dashboard.
6. Confirm next backend log lines show no `403 InvalidAccessKeyId` errors.

The adapter does not cache credentials beyond the lifetime of a single `S3Client` / `S3Presigner` (rebuilt at every `@PostConstruct` invocation, i.e., once per app start). No in-flight requests use stale credentials after redeploy.

---

## 7. Failure modes

| Symptom | Likely cause | Diagnostic | Resolution |
|---|---|---|---|
| Backend boot fails with `IllegalStateException: S3StorageAdapter is required in production but missing env vars: STORAGE_BUCKET, ...` | One or more required env vars unset in Railway | Check Railway Variables UI | Set the missing var(s); redeploy |
| `ObjectStorageIntegrityException: Declared contentLength=N but stream produced M bytes` | Caller's declared contentLength disagrees with actual bytes | Check controller / service contract | Fix the caller; this is a programming error, not a network issue |
| `S3Exception statusCode=503` with retries | Transient R2 / S3 outage | Check provider status page | Adapter retries 100ms / 300ms / 1000ms automatically; consumer sees the eventual failure if all 3 attempts exhaust |
| Presigned URL returns 403 from R2 | URL expired between issue and fetch | Compare `expires` timestamp to current time | Issue a fresh URL with longer expiry (capped at `STORAGE_MAX_PRESIGN_HOURS`) |
| Dev-storage URL returns 401 | HMAC signature mismatch | Verify `worshiproom.storage.dev-signing-secret` matches between issuer (LocalFilesystemStorageAdapter) and verifier (DevStorageController) | They share the same `StorageProperties` bean — mismatch indicates env-var override broke the config; check `application-dev.properties` |
| Dev-storage URL returns 410 | Presigned URL expired | Re-issue from the application | Note: dev URLs are also capped at `worshiproom.storage.max-presign-hours` (default 1 hour) |

---

## 8. Out of scope (for downstream consumer specs)

This runbook covers the adapter only. The following concerns belong to consumer specs:

- **1.10c (Database backup):** Backup retention rotation, restore procedure, backup verification, encryption-at-rest of backups beyond R2's own.
- **4.6b (Image uploads):** Image transformation pipeline, thumbnail generation, multipart-upload threshold tuning, MIME-type allowlist, image-size limits at the controller boundary.
- **6.7 (Testimony cards):** Generated-image storage path conventions, share-card lifecycle (regenerate vs. cache).
- **10.11 (Account deletion):** Bulk-delete-by-prefix orchestration when a user is deleted; eventual consistency considerations.

If a question arises about any of these concerns and this runbook does not answer it, the right destination is the consumer spec, not this runbook.

---

## 9. Code Boundary Reference

For a full read-the-code exploration, the storage package layout is:

```
backend/src/main/java/com/worshiproom/storage/
├── ObjectStorageAdapter.java          (interface — 6 methods)
├── LocalFilesystemStorageAdapter.java (dev profile)
├── S3StorageAdapter.java              (test + prod profiles)
├── StorageConfig.java                 (@Profile-gated bean wiring)
├── StorageProperties.java             (@ConfigurationProperties("worshiproom.storage"))
├── StorageKeyValidator.java           (validate(String key) + validatePrefix(String prefix))
├── StorageExceptionHandler.java       (@RestControllerAdvice basePackages="...storage")
├── StoredObject.java                  (record — put result)
├── StoredObjectStream.java            (record — get result; AutoCloseable)
├── StoredObjectSummary.java           (record — list result)
├── ObjectStorageIntegrityException.java
└── controller/
    └── DevStorageController.java      (@Profile("dev"), GET /dev-storage/{key})
```

Tests live in the parallel package under `src/test/java/com/worshiproom/storage/`. The contract test (`AbstractObjectStorageContractTest.java`) is the load-bearing artifact — both `LocalFilesystemStorageAdapterIntegrationTest` and `S3StorageAdapterIntegrationTest` extend it and run the same 19 behavioral scenarios. A regression in either adapter trips the same set of assertions.
