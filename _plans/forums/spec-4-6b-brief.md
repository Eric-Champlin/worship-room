/spec-forums spec-4-6b

# Spec 4.6b — Image Upload for Testimonies & Questions

**Master plan ID:** `round3-phase04-spec06b-image-upload`
**Size:** L
**Risk:** Medium (introduces external storage dependency surface — though the adapter abstraction lives in 1.10e — plus image processing pipeline + PII concerns)
**Prerequisites:** 4.3 (Testimony Post Type), 4.4 (Question Post Type), 1.10e (Object Storage Adapter Foundation). The master plan body lists prereqs as 4.2 + 4.3 — that's stale numbering; current numbering is 4.3 (Testimony) + 4.4 (Question). Plus 1.10e for the adapter (which the body lists as a file to create — also stale; see MPD-1).
**Tier:** xHigh

---

## 1. Branch discipline (CRITICAL)

**You are on a long-lived working branch named `forums-wave-continued`. Stay on it.**

Eric handles all git operations manually. Claude Code MUST NEVER run any of the following commands in this session, in any phase (recon, plan, execute, verify, review):

- `git checkout`
- `git checkout -b`
- `git switch`
- `git switch -c`
- `git branch`
- `git commit`
- `git commit -am`
- `git push`
- `git stash`
- `git stash pop`
- `git reset` (any flag)
- `git rebase`
- `git cherry-pick`
- `git merge`
- `gh pr create`, `gh pr merge`, `glab mr create`, etc.

If Claude Code believes a git operation is needed, surface it as a recommendation and STOP. Eric will execute manually.

The only acceptable git tooling Claude Code may invoke is read-only inspection: `git status`, `git diff`, `git log --oneline`, `git blame`, `git show <sha>`.

---

## 2. Tier — xHigh

This is the largest Phase 4 spec by surface area. New backend module (the `upload/` package), schema migration, three-rendition image processing pipeline, lightbox UX, per-type composer integration, R2 storage integration via the existing 1.10e adapter, alt-text accessibility, rate limiting, and orphan-image cleanup all in one spec.

**Why xHigh (not Standard):**

- The PII stripping correctness is a privacy concern. EXIF GPS metadata in a testimony photo could leak the user's home address. Standard tier sometimes ships incomplete EXIF stripping (camera-only, missing GPS).
- The orphan-image problem (uploaded but never associated with a post) requires a defined cleanup strategy. Standard tier ships uploads without cleanup, accruing storage waste.
- The two-step upload flow (POST /upload returns URL; POST /posts with URL) has subtle timing bugs (orphan if post creation fails; double-claim if same URL submitted to two posts). Standard tier sometimes ships these without thinking through the failure modes (D14, W11).
- The dimension validation BEFORE byte transfer (header check via Content-Length) prevents 100MB upload of an image that will be rejected anyway. Standard tier sometimes uploads first, validates after — wastes bandwidth and Railway compute.
- Alt-text accessibility is non-negotiable. The submit-blocked-without-alt-text behavior must be foolproof.

**Why not MAX:**

- 1.10e shipped the storage abstraction. 4.6b consumes via DI — no R2-specific code, no adapter wiring.
- Image processing libraries (Java Image I/O, Apache Commons Imaging, ImgScalr, metadata-extractor) are well-known. No novel algorithms.
- The composer integration follows the per-type pattern established by 4.3/4.4/4.5/4.6.
- The `<PostImage>` and `<ImageLightbox>` components are well-bounded — render-only, no shared state with the rest of the app.
- No new auth conditionals beyond standard authenticated-only upload.

**Cost-benefit:**
- xHigh + this brief: ~100 minutes pipeline runtime. Substantial.
- MAX + thinner brief: ~150 minutes; same quality output if the brief covers the trap doors.
- The four override moments are listed in Section 14.

---

## 3. Visual verification — REQUIRED

**Run `/verify-with-playwright` after `/code-review` passes.**

Verification surface:

1. **Composer image upload affordance** — testimony composer (`postType='testimony'`):
   - 'Add a photo' button visible next to the textarea
   - Tapping opens the file picker (accept attribute restricts to image/jpeg, image/png, image/webp)
   - Selected JPEG/PNG/WebP file ≤5MB triggers upload state
   - Drag-and-drop onto the composer triggers upload state
   - Drag-over shows 'Drop image here' with dotted outline
   - Upload progress shows shimmering skeleton with percentage
   - Upload success shows preview with 'Remove' button + alt-text input
   - Alt-text input is REQUIRED (single-line, labeled 'Describe this image for screen readers')
   - Submit button is DISABLED until alt-text has at least one non-whitespace character
   - Removing the image clears the preview AND alt-text

2. **Same affordance on question composer** (`postType='question'`):
   - All same behavior as testimony

3. **Affordance ABSENT for prayer_request, discussion, encouragement composers** — entirely absent from DOM (not disabled)

4. **HEIC/HEIF rejection**:
   - Selecting a `.heic` file shows error: 'HEIC images aren't supported yet. Open the Photos app, share the image, and choose JPEG.'
   - No upload attempt fires
   - The 'Add a photo' button remains enabled to retry

5. **Size rejection** (>5 MB):
   - Selecting a 6MB file shows error: 'Image is larger than 5 MB. Try a smaller version.'
   - No upload attempt fires
   - Check happens client-side (read file size before upload)

6. **Dimension rejection** (>4000 × 4000 px):
   - Server-side validation rejects with 400
   - Frontend shows: 'Image is larger than 4000 × 4000 pixels. Try a smaller resolution.'
   - The bytes were already sent — server returns rejection AFTER receiving body

7. **Card rendering with image** (PrayerCard):
   - Image renders below content, above InteractionBar
   - Image uses the `medium` rendition by default (960 long-edge)
   - First 5 cards in the feed get `loading='eager'`; rest get `loading='lazy'`
   - Alt text from the post is the `<img alt>` value
   - Image has rounded corners matching the FrostedCard aesthetic
   - On narrow viewports, image is full-width with maintained aspect ratio

8. **Lightbox**:
   - Tapping the image opens lightbox
   - Lightbox shows the `full` rendition (1920 long-edge)
   - `role='dialog'` with focus trap
   - Escape closes
   - Tapping outside the image closes
   - Close button visible top-right
   - Background is dark with subtle blur of the underlying card
   - Alt-text shown below the image (caption-style)

9. **Cards WITHOUT image render unchanged**:
   - No empty `<PostImage>` slot
   - No regression on prayer_request, discussion, encouragement cards (which can't have images)
   - Testimony or question without `image_url` renders without the image slot — clean absence

10. **Rate limit**:
    - 11th upload in an hour returns 429 with copy: 'You've uploaded a lot of images recently. Try again in a bit.'
    - The 1st-10th succeed normally

11. **Mixed feed**:
    - All five post types interleave correctly
    - Chrome variants (white / amber / cyan / violet / rose) preserved
    - Image-bearing cards interleave naturally with non-image cards

12. **EXIF stripping verification** (backend integration test):
    - Upload a JPEG with embedded GPS EXIF tag
    - Server-side processed image has NO GPS tag
    - Verify via re-reading the stored bytes

Minimum 12 Playwright scenarios. Backend integration tests cover the EXIF strip and dimension validation.

<!-- CHUNK_BOUNDARY_2 -->

---

## 4. Master Plan Divergence

The master plan body for 4.6b lives at `_forums_master_plan/round3-master-plan.md` lines ~4267–4329. Several parts are stale relative to what's actually shipped now.

### MPD-1 — Storage adapter ALREADY SHIPPED by 1.10e

The master plan body's Files-to-Create list includes:

> - `backend/src/main/java/com/worshiproom/upload/S3StorageAdapter.java` (interface + impl; dev profile uses `LocalFilesystemAdapter` for now)

Recon ground truth: `backend/src/main/java/com/worshiproom/storage/ObjectStorageAdapter.java` and friends already exist (1.10e shipped them). The runbook at `backend/docs/runbook-storage.md` documents the adapter, the three profile-wired implementations (dev = LocalFilesystemStorageAdapter, test = S3StorageAdapter against MinIO Testcontainer, prod = S3StorageAdapter against R2), and the `StorageExceptionHandler`.

**4.6b CONSUMES the existing adapter via DI.** It does NOT create a new adapter. Specifically:

- `UploadService` (NEW in 4.6b) `@Autowire`s the existing `ObjectStorageAdapter` interface
- The Spring profile mechanism handles dev/test/prod wiring — 4.6b doesn't touch profile config
- The 6 methods on `ObjectStorageAdapter` (`put`, `get`, `exists`, `delete`, `generatePresignedUrl`, plus one more — verify in plan) are the entire surface 4.6b uses

**Action for the planner:** Strike `S3StorageAdapter.java` from the Files-to-Create list. The `upload/` package depends on the `storage/` package via DI; that's the architectural seam.

### MPD-2 — PII stripping infrastructure is BUILT IN 4.6b, not reused from 6.7

The master plan body says:

> **PII stripping (reuses Spec 6.7 infrastructure):**

This is dependency-flipped. Spec 6.7 (Shareable Testimony Cards) hasn't shipped — it's a Phase 6 spec that generates share-card PNGs. 6.7 will eventually need EXIF stripping to ensure share cards don't leak GPS metadata, but it doesn't have it built today.

**4.6b BUILDS the PII stripping infrastructure.** The `ImageProcessingService` introduced by 4.6b will be reused by 6.7 later — not the other way around.

What 4.6b ships for PII stripping:

- Strip ALL EXIF metadata (camera, lens, software, GPS, timestamps) via the `metadata-extractor` library (or equivalent — plan picks specific dependency)
- Re-encode as JPEG Q=85 server-side as belt-and-suspenders against any metadata the stripping library missed
- For PNG inputs, strip ancillary chunks (tEXt, iTXt, zTXt, tIME, eXIf if present) and re-encode
- For WebP inputs, strip XMP and EXIF chunks and re-encode
- The output is always JPEG (regardless of input format) — simplifies downstream rendering and eliminates format-specific metadata leak vectors

The master plan body is ALSO inconsistent on the input format question — line 4290 says 'Re-encoded server-side as JPEG Q=85' but only mentions JPEG explicitly. PNG and WebP inputs are accepted (line 4280) but the output behavior isn't fully specified. **Decision: all renditions stored as JPEG regardless of input format.** Matches the 'belt-and-suspenders against metadata' framing.

### MPD-3 — Per-type composer integration uses the established `ComposerCopy` pattern

The master plan body says:

> **Files to modify:**
> - Testimony and Question composer components (integrate `ImageUpload`)

This predates 4.3/4.4/4.5/4.6's per-type composer infrastructure. There aren't separate 'Testimony composer component' and 'Question composer component' — there's `InlineComposer.tsx` with a `composerCopyByType` map (added in 4.3, extended in 4.4 with `subline`, in 4.5 with `showScriptureReferenceField`, in 4.6 with `showAnonymousToggle`/`expiryWarning`/`submitsAsCategory`).

**4.6b extends the same map** with two new optional fields:

```typescript
interface ComposerCopy {
  // ... existing fields ...
  showImageUpload?: boolean        // NEW in 4.6b — only true for testimony, question
  imageUploadHelperText?: string   // NEW in 4.6b — inline helper for the affordance
}
```

The `<ImageUpload>` component is conditionally rendered when `copy.showImageUpload === true`.

### MPD-4 — Image columns on Post are NEW in 4.6b

The master plan body says:

> - `posts` schema (adds `image_url`, `image_alt_text` columns)
> - `backend/src/main/resources/db/changelog/2026-04-20-001-add-posts-image-columns.xml`

Recon ground truth (per R3): grep of `image_url|imageUrl|image_alt|imageAlt` in `backend/src/main/java/com/worshiproom/post/` returns ZERO matches. Columns don't exist. 4.6b adds:

```sql
ALTER TABLE posts ADD COLUMN image_url VARCHAR(500) NULL;
ALTER TABLE posts ADD COLUMN image_alt_text VARCHAR(500) NULL;
```

No foreign key (the URL is a key into the storage system, not a relational ref). Both columns nullable — most posts won't have images.

Note: `image_url` stores a relative key path (e.g., `posts/{postId}/medium.jpg`) NOT a fully-qualified URL. The frontend builds the absolute URL by combining the key with a configured CDN/base URL. Reasoning: storage location may change (R2 → S3 → something else); storing the bucket-relative key keeps post rows portable across providers. This matches the 1.10e abstraction's design philosophy (provider rotation is env-var-only).

**Plan verifies during recon:** what naming convention the existing `storage/` package uses for keys. If 1.10e established a `{module}/{entity-id}/{name}` convention, 4.6b follows it.

### MPD-5 — Three renditions stored, not just one

The master plan body line 4283 specifies three renditions: `full` (1920 long-edge), `medium` (960 long-edge), `thumb` (320 long-edge). The DB column `image_url` stores ONE key. Two interpretations:

(a) `image_url` stores the base path (e.g., `posts/{postId}/`) and the frontend appends `/full.jpg`, `/medium.jpg`, `/thumb.jpg` based on context
(b) `image_url` stores the medium rendition's key, and the frontend computes `full` and `thumb` keys by string-replace

**Decision: option (a).** `image_url` stores the base directory key (e.g., `posts/{postId}/`). Frontend builds rendition URLs by appending the rendition name. Clearer mental model.

Actually — simpler still: the `image_url` column stores a LOGICAL identifier (e.g., `posts/{postId}`), and the storage adapter knows how to translate that into rendition-specific keys via convention. The frontend never sees raw storage keys; it gets a list of rendition URLs from the API.

**Concrete shape in PostDto:**

```typescript
interface PostDto {
  // ... existing fields ...
  image: {
    full: string         // absolute URL to 1920-long-edge JPEG
    medium: string       // absolute URL to 960-long-edge JPEG
    thumb: string        // absolute URL to 320-long-edge JPEG
    altText: string      // accessibility description
  } | null               // null when post has no image
}
```

The DB stores only the base path + alt text. The mapper builds the three URLs at serialization time using a configured CDN base URL (from env or app config). Provider rotation just changes the CDN base; the DB rows don't change.

### MPD-6 — Orphan-image cleanup is part of 4.6b's scope

The master plan body doesn't address the orphan problem: user uploads an image, gets a URL back, but never submits the post (or the post submission fails). The image sits in R2 forever, costing storage.

**4.6b includes a basic cleanup strategy:**

- Image keys include the uploader's `userId` and an upload timestamp (e.g., `posts/pending/{userId}/{uploadId}/`)
- After a configurable TTL (default 1 hour), unclaimed pending images are eligible for deletion
- A simple Spring `@Scheduled` task runs daily, lists `posts/pending/`, and deletes anything older than 24 hours that hasn't been claimed (claimed = referenced by a row in `posts.image_url`)
- When a post is created with `image_url`, the upload service MOVES the image from `posts/pending/{userId}/{uploadId}/` to `posts/{postId}/` — that's the 'claim' operation

This is simpler than presigned URLs and avoids the two-step-with-orphans hazard. The MOVE operation is the atomic-claim primitive.

See D14 for full details and the alternative considered (transactional outbox).

### MPD-7 — Stale prereq numbering

Master plan body says prereqs are 4.2 (Testimony), 4.3 (Question). After Phase 4 renumbering, those are 4.3 (Testimony) and 4.4 (Question). Plus 1.10e for the storage adapter.

**Action:** Brief lists the correct prereqs at the top. Planner doesn't propagate the stale numbering.

<!-- CHUNK_BOUNDARY_3 -->

---

## 5. Recon Ground Truth (2026-05-08)

Concrete facts verified on disk via `Desktop Commander:start_search` against `/Users/Eric/worship-room/`. These are load-bearing observations.

### R1 — `ObjectStorageAdapter` interface exists with 6 methods

`backend/src/main/java/com/worshiproom/storage/ObjectStorageAdapter.java` is the interface 1.10e shipped. Methods discovered via grep:

- `void put(...)` (or similar) — stores `data` under `key`, validates the key, throws on infrastructure failure
- `byte[]` or `InputStream get(...)` — retrieves stored object
- `boolean exists(...)` — returns true iff a stored object exists for `key`
- `boolean delete(...)` — deletes object; safe to invoke on keys that may or may not exist
- `String generatePresignedUrl(...)` — creates time-limited URL; throws if `expiry.isNegative()` or `expiry.isZero()`
- (1 more method — verify in plan; likely `getMetadata` or `list`)

The class-level Javadoc says infrastructure failures are handled centrally by `StorageExceptionHandler`. 4.6b doesn't need to wrap the adapter calls in try/catch — the existing exception handler maps storage exceptions to appropriate HTTP responses.

Plan reads the full interface during recon to confirm exact signatures and capture the 6th method.

### R2 — Profile-based wiring already in place

Per the runbook (`backend/docs/runbook-storage.md` § 2):

- `dev` profile: `LocalFilesystemStorageAdapter` backed by `${HOME}/.worshiproom-dev-storage`
- `test` profile: `S3StorageAdapter` backed by MinIO Testcontainer (~1s startup)
- `prod` profile: `S3StorageAdapter` backed by Cloudflare R2

The `S3StorageAdapter` is provider-agnostic (AWS SDK v2 with `endpointOverride`). Switching providers is env-var-only.

**Implication:** 4.6b's tests use the test profile (MinIO). 4.6b's local dev uses the dev profile (filesystem). 4.6b's prod uses R2. No special test setup needed beyond what 1.10e shipped.

### R3 — Post entity has NO image columns

Grep of `image_url|imageUrl|image_alt|imageAlt` in `backend/src/main/java/com/worshiproom/post/` returns ZERO matches.

4.6b adds:

- `image_url VARCHAR(500) NULL` — stores logical key (e.g., `posts/{postId}`)
- `image_alt_text VARCHAR(500) NULL` — accessibility description

Via Liquibase changeset (next available date — plan picks the file name).

### R4 — Post entity already has all needed integrations

The existing `Post.java` entity has columns set up for:
- Soft delete (`is_deleted`, `deleted_at`)
- Moderation status
- Last activity timestamp
- Author, post type, etc.

4.6b just adds two columns. No other entity changes.

### R5 — No `upload/` package exists yet

The `backend/src/main/java/com/worshiproom/` package list (per earlier recon for 4.4): `activity, auth, config, controller, friends, legal, mute, post, proxy, safety, social, storage, user`.

No `upload/`. 4.6b creates it.

### R6 — Per-type composer infrastructure (post-4.6 state)

After 4.6 ships, `composerCopyByType` map in `InlineComposer.tsx` has:

- `header`, `placeholder`, `ariaLabel`, `submitButton`, `footerNote`
- `subline?` (4.4 — question only)
- `showCategoryFieldset`, `showChallengeCheckbox`, `showAttributionNudge`
- `showScriptureReferenceField?` (4.5 — discussion only)
- `showAnonymousToggle?`, `expiryWarning?`, `submitsAsCategory?`, `minHeight?` (4.6)

4.6b extends with:
- `showImageUpload?: boolean` — only `true` for testimony, question
- `imageUploadHelperText?: string` — optional inline helper text near the affordance

Following the established pattern: each new optional UI affordance / behavioral override becomes another optional field on `ComposerCopy`.

### R7 — `PrayerCard` is the rendering target for `PostImage`

The `PrayerCard` component (post-4.6 state) renders:
- Type-specific chrome (rose / cyan / amber / violet / white)
- Type-specific icon (`POST_TYPE_ICONS` map)
- QotdBadge (when `qotdId` set)
- AuthorName + timestamp
- Content body
- ScriptureChip (when `scriptureReference` set)
- InteractionBar (with type-specific reaction labels and conditional comment button)
- Conditional CommentsSection (mounted unless `postType === 'encouragement'`)

4.6b adds:
- `<PostImage>` rendered between content body and InteractionBar, when `prayer.image` is non-null

### R8 — PostDto serialization shape

`backend/src/main/java/com/worshiproom/post/dto/PostDto.java` is a Java record. Adding fields requires:
- Adding to record params
- Updating PostMapper
- Updating OpenAPI schema

**4.6b adds:**

```java
public record PostDto(
    UUID id,
    // ... existing fields ...
    @Nullable PostImageDto image  // NEW — nested DTO
) {}

public record PostImageDto(
    String fullUrl,
    String mediumUrl,
    String thumbUrl,
    String altText
) {}
```

The nested object is `null` for posts without images. Frontend type matches:

```typescript
interface PostImage {
  full: string
  medium: string
  thumb: string
  altText: string
}

interface PrayerRequest {
  // ... existing ...
  image?: PostImage  // optional, undefined when no image
}
```

### R9 — Storage key naming convention (verify in plan)

The runbook § 8 mentions storage path conventions for downstream consumers but doesn't fix one. Plan verifies during recon by reading any existing usage (e.g., 1.10c backups should have a `backups/{date}/...` convention).

**4.6b proposes:**

- Pending uploads: `posts/pending/{userId}/{uploadId}/{rendition}.jpg`
- Claimed (post-creation): `posts/{postId}/{rendition}.jpg`
- Renditions: `full.jpg`, `medium.jpg`, `thumb.jpg`

The MOVE-on-claim pattern (D14) renames pending to claimed.

If 1.10c established a different convention, 4.6b adapts. The convention isn't load-bearing as long as it's consistent.

### R10 — OpenAPI schema location

`backend/src/main/resources/openapi.yaml` (verify path during recon — may also live at `backend/src/main/resources/static/openapi.yaml`). 4.6b adds:
- POST `/api/v1/uploads/post-image` endpoint
- `PostImage` schema
- `PostDto.image` field reference
- Error responses: 400 INVALID_IMAGE_FORMAT, 400 IMAGE_TOO_LARGE, 400 IMAGE_DIMENSIONS_TOO_LARGE, 400 INVALID_ALT_TEXT, 429 RATE_LIMITED

### R11 — LoadingSkeleton component exists (per master plan body line 4302)

Master plan body references `<LoadingSkeleton>` from Spec 1.x (number truncated in recon). 4.6b's ImageUpload component reuses it for the upload-progress state.

If the component doesn't actually exist on disk under the expected path, plan creates a small in-component spinner as a fallback. Verify during recon.

### R12 — RetryBanner component exists (per master plan body line 4304)

Similarly referenced. 4.6b's ImageUpload uses `<RetryBanner severity='error'>` for upload failures. Verify on disk.

### R13 — Rate limiting infrastructure

`PostsRateLimitService` exists from earlier specs. The pattern:

```java
rateLimitService.checkAndConsume(userId);
// ... if not throttled, do the work ...
```

4.6b creates a separate `UploadRateLimitService` (or parameterizes the existing one if its bucket can be parameterized). 10 uploads per user per hour.

Reasoning for separate bucket: image uploads are bandwidth-expensive. Their rate limit shouldn't borrow from the post-creation rate limit (and vice versa). Verify during recon whether `PostsRateLimitService` can be parameterized; if not, copy the pattern.

### R14 — Authentication context

Upload endpoint requires authentication. The pattern for getting the authenticated user is:

```java
@PostMapping(...)
public UploadResponse upload(@AuthenticationPrincipal AuthenticatedUser user, ...) {
    // user.getUserId() returns the UUID
}
```

Matches existing post creation, comment creation, etc. No new auth infrastructure.

### R15 — Multipart file handling in Spring Boot

Spring Boot accepts `MultipartFile` parameters via `@RequestParam('file')` on the controller method. The body of the request is `multipart/form-data` with the image bytes plus optional metadata fields.

Default Spring upload size limit may need adjustment via `application.properties`:

```properties
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB
```

The 10MB limit accommodates the 5MB master limit plus headroom for the multipart envelope. Plan verifies the project's existing multipart configuration; if smaller, 4.6b raises it.

### R16 — Image processing library choice

Java ecosystem options:
- `javax.imageio` (built-in) — supports JPEG, PNG, but NOT WebP without extension; limited metadata stripping
- `com.drewnoakes:metadata-extractor` — widely-used metadata reader/stripper
- `org.imgscalr:imgscalr-lib` — simple image scaling
- `com.twelvemonkeys.imageio:imageio-webp` — WebP support extension to ImageIO
- `ws.schild:jave-all-deps` — ffmpeg wrapper, overkill

**Suggested combination:**
- ImageIO + TwelveMonkeys WebP extension for decode
- metadata-extractor for stripping
- imgscalr (or manual ImageIO operations) for resize
- ImageIO for JPEG encode (Q=85)

Plan picks specific dependencies and adds to `pom.xml`. The plan's recon includes a check for whether any of these are already present from other specs.

### R17 — Existing dimension validation pattern

The content-length / dimension validation patterns exist for textual content (`ContentTooLongException`). Image dimension validation follows the same pattern:

```java
public class ImageDimensionsTooLargeException extends RuntimeException {
    public ImageDimensionsTooLargeException(int width, int height) {
        super(String.format("Image dimensions %dx%d exceed maximum 4000x4000.", width, height));
    }
}
```

Mapped to 400 IMAGE_DIMENSIONS_TOO_LARGE in the upload exception handler.

### R18 — Frontend mocks need image fixtures

`frontend/src/mocks/prayer-wall-mock-data.ts` (verify path during plan). 4.6b adds:
- 1 testimony fixture WITH image (full URL set)
- 1 testimony fixture WITHOUT image
- 1 question fixture WITH image
- 1 question fixture WITHOUT image

The mock URLs can point to static placeholder images (e.g., picsum.photos) for visual fidelity in dev. In tests, mock URLs are stubbed.

### R19 — No existing per-image rate limit

Grep for 'upload' or 'image' in `backend/src/main/java/com/worshiproom/` returns nothing rate-limit-related. 4.6b's `UploadRateLimitService` is net-new.

### R20 — _plans/post-1.10-followups.md status

After 4.3-4.6 file their respective follow-ups, the next available section number for 4.6b's filings (if any) is whatever comes next. The planner reads the file at plan time.

**4.6b may file:**

- `Image lightbox accessibility audit` — if the implementation surfaces edge cases beyond what the brief specifies (e.g., zoom on touch devices, screen-reader announcement of dialog open). Captured as a polish follow-up if found during /verify-with-playwright.
- `Multi-image upload (2-5 images per post)` — master plan body says ONE image. Multi-image is a future enhancement; file as `Phase 6+ enhancement` follow-up.
- `HEIC support via server-side conversion` — 4.6b rejects HEIC. A future spec could accept HEIC and convert server-side. File as a follow-up if appetite emerges.

<!-- CHUNK_BOUNDARY_4 -->

---

## 6. Phase 3 Execution Reality Addendum gates — applicability

The 13 invariants from Phase 3. For 4.6b, the post-creation path is unchanged (testimonies and questions still go through `PostService.createPost`); the new upload endpoint is a separate flow with its own analysis.

| # | Gate | Applies to 4.6b? | Notes |
| - | ---- | --- | ----- |
| 1 | Idempotency lookup BEFORE rate-limit check | **Applies — NEW** | Upload endpoint accepts `Idempotency-Key` header. Same client retrying with same key returns the prior result. |
| 2 | Rate-limit consumption order | **Applies — NEW limiter** | UploadRateLimitService check happens after idempotency lookup. 10/hour. |
| 3 | Cross-field validation | **Applies — NEW rules** | (a) MIME type matches actual decoded format. (b) Dimensions ≤ 4000x4000. (c) Decoded size ≤ actual file size + small overhead (catches polyglot files). |
| 4 | HTML sanitization BEFORE length check | N/A | Image upload doesn't accept HTML content. The alt text is a separate text field that DOES go through HTML sanitization (no embedded HTML in alt text — plain text only). |
| 5 | Length check after sanitization | **Applies to alt text** | Alt text ≤ 500 chars (matches DB column). Sanitized first. |
| 6 | Crisis detection on sanitized content | N/A for image bytes; **applies to alt text** | Alt text could carry crisis-language; run through CommentCrisisDetector or similar (verify pattern in plan). |
| 7 | AFTER_COMMIT crisis event publishing | Applies if alt text triggers crisis | Same publish pattern. |
| 8 | Activity recording | N/A | Uploading an image is not a content-creation event. The post creation that consumes the image emits PRAYER_WALL activity (existing); the upload itself is silent. |
| 9 | EntityManager refresh for DB defaults | Applies (limited) | Upload endpoint doesn't touch the `posts` table directly. But when the post is later created with `image_url`, the EntityManager refresh pattern applies to the post (existing flow). |
| 10 | Logging IDs only (no content) | **Applies — emphasized** | Image bytes never logged. Alt text never logged. Storage keys logged (they're path-style identifiers, not PII). |
| 11 | `ContentTooLongException` error code/message contract | Adapted | New exceptions: `ImageTooLargeException`, `ImageDimensionsTooLargeException`, `InvalidImageFormatException`. Each follows the existing exception→error-code pattern. |
| 12 | JSR-303 enforcement BEFORE service-layer rules | Applies | The `MultipartFile` parameter has Spring's built-in size validation; the `altText` field has `@Size(max=500)` and `@NotBlank`. Service-layer rules layer on top. |
| 13 | PostType wire-format ↔ Java enum drift sync | N/A for upload itself | But the post creation that follows still respects this gate. |

**New addendum gates introduced by 4.6b:**

**Gate 14: MIME-type spoof detection.** A polyglot file (e.g., a PHP script with a JPEG magic-byte header and `.jpg` extension) is a security concern. The image processing service MUST decode the file via ImageIO; if decode fails, reject with `InvalidImageFormatException`. Don't trust the client-provided Content-Type header alone.

**Gate 15: PII-stripping verification.** After processing, the output image's metadata must NOT contain any of: GPS coordinates, camera make/model, original timestamp with sub-day precision, or any custom EXIF tags. Test surface: process a known-PII-laden test fixture and assert the output has none of these.

**Gate 16: Atomic claim semantics.** When a post is created with `image_url`, the move from `posts/pending/...` to `posts/{postId}/...` is the claim. If the move fails, post creation rolls back (transactional). If the move succeeds and post creation later fails (shouldn't happen because move is part of the same transaction, but defensively), a compensating delete fires.

---

## 7. Decisions and divergences

### D1 — Architecture: PROXIED uploads (not direct browser → R2 presigned)

The master plan body's mention of 'presigned-URL TTL caps for direct-to-R2 client uploads if that pattern is chosen' (in the runbook § 8) implies presigned-PUT was an option. **4.6b uses PROXIED uploads instead.**

Reasoning:

- Server-side image processing (resize, EXIF strip, JPEG re-encode) requires the bytes to flow through the backend
- Direct presigned PUT means client uploads raw bytes; we'd need a post-upload processing step that fires async and updates the URL when ready — added complexity and a window where the unprocessed image is publicly accessible
- Proxied is simpler: single request, fully-processed result returned
- Bandwidth: Railway's free tier has limits, but 5MB max per upload × 10/hour rate limit caps the worst case

**Rejected alternative:** Direct browser → R2 presigned PUT. Faster for the user and cheaper for our server, but loses server-side processing guarantees. PII stripping has to happen somewhere; if not at upload time, then async after — worse UX (post appears, then image-with-metadata appears, then sanitized image replaces it).

**If Eric wants to revisit:** the brief is structured so the `UploadController` could be replaced with a presign endpoint + post-upload processor without breaking the rest of the spec. But that's a Phase 6+ optimization, not 4.6b's scope.

### D2 — Three renditions: full / medium / thumb

Per master plan body line 4283. Specific dimensions:

| Rendition | Long-edge max | Use case |
| --------- | ------------- | -------- |
| `full`    | 1920 px       | Lightbox display, downloadable view |
| `medium`  | 960 px        | Default card display in feed |
| `thumb`   | 320 px        | Future use (notifications, share cards, etc.); also serves as the loading-state placeholder |

All three are stored at upload time. Storage cost: ~3x the single-rendition cost, but R2 storage is cheap and the bandwidth savings on feed rendering (medium vs full) more than compensate.

All renditions are JPEG Q=85 regardless of input format. This is the belt-and-suspenders metadata strip per MPD-2.

### D3 — 5MB max upload size

Per master plan body. Configurable via `POST_IMAGE_MAX_SIZE_BYTES` env var (default 5242880 = 5 × 1024 × 1024).

Client-side check: read `file.size` before upload. If over, show error and don't upload.

Server-side check: enforced via `spring.servlet.multipart.max-file-size=10MB` (with 5MB master limit checked in the controller) AND a programmatic check in `UploadService` that re-validates before processing.

Two checks (Spring config + service code) is intentional: the Spring-level limit prevents memory exhaustion attacks; the service-level check provides the user-facing error message.

### D4 — Allowed MIME types: JPEG, PNG, WebP

Per master plan body line 4280.

**Server-side validation:** Decode via ImageIO (with TwelveMonkeys WebP extension). If decode fails OR the decoded format isn't in the allowlist, reject with `InvalidImageFormatException`.

Client-side: file picker `accept='image/jpeg,image/png,image/webp'`. This is a HINT, not security — user can still drag-drop other formats. Server-side validation is the actual enforcement.

### D5 — HEIC/HEIF rejection with helpful copy

Per master plan body line 4281. Copy:

> 'HEIC images aren't supported yet. Open the Photos app, share the image, and choose JPEG.'

The copy is actionable — it tells the user exactly what to do. ("Convert your file" without instructions would be a UX trap.)

**Implementation:** Client-side check on `file.type` and `file.name` extension. If `image/heic`, `image/heif`, or `.heic`/`.heif` extension, show the error and don't upload.

Server-side: ImageIO won't decode HEIC anyway; the `InvalidImageFormatException` would fire as a fallback if a client somehow bypasses the client-side check.

**Rejected alternative:** Server-side HEIC → JPEG conversion. Possible via libheif but adds a JNI dependency. Not worth the complexity for 4.6b. Filed as a follow-up (R20).

### D6 — 4000x4000 dimension cap

Per master plan body line 4282. Hard reject above this; recommended 1920x1920.

**Validation order:**

1. File size check (5MB) — client and server
2. Decode via ImageIO
3. Read decoded width/height
4. If width > 4000 OR height > 4000, throw `ImageDimensionsTooLargeException`
5. Resize to renditions (full/medium/thumb)

The reason 4000x4000 is a hard cap: a 4000x4000 image at full color depth is ~48MB uncompressed in memory. Larger images risk OOM on Railway's memory-constrained dynos.

### D7 — Alt text REQUIRED before submit

Per master plan body line 4294. Single-line input labeled 'Describe this image for screen readers'.

**Validation:**
- Frontend: submit button is `disabled` until alt-text input has at least one non-whitespace character
- Backend: `@NotBlank` JSR-303 validation on the create-post request's alt text field (when image is present)
- Backend: cross-field validation: if `image_url` is set on create-post request, `image_alt_text` MUST be set too (else 400 with clear error code)

**Copy for the alt-text input:**
- Label: `'Describe this image for screen readers'`
- Placeholder: `'A short description of what's in the photo'`
- Helper text below: `'Required for accessibility — screen readers will read this aloud.'`
- Max length 500 chars

The copy is honest: explains *why* it's required, not just that it's required. Reduces friction by giving the user reason rather than rule.

### D8 — Lightbox UX

- `role='dialog'` + `aria-modal='true'`
- `aria-labelledby` points to a hidden heading with the alt text
- Focus trap: tab cycles through close button + image only
- Escape closes
- Click outside the image (on the dimmed backdrop) closes
- Background: dark overlay with subtle backdrop-blur of the underlying card
- Close button: top-right, large enough for tap (44x44 minimum), keyboard-focusable
- Image: centered, max 90vw / 90vh, maintains aspect ratio
- Alt text shown below the image as a caption
- No zoom controls in 4.6b (filed as polish follow-up R20)
- No swipe-between-images (master plan says one image per post; multi-image is filed as follow-up R20)

**Rejected alternative:** Full-screen native browser image view (right-click → 'View image'). Less custom, but loses the dim-overlay aesthetic and the alt-text caption.

### D9 — Lazy loading on feed

Per master plan body line 4296.

```typescript
<img
  src={prayer.image.medium}
  alt={prayer.image.altText}
  loading={index < 5 ? 'eager' : 'lazy'}
  // ... other props
/>
```

The first 5 cards' images are eager-loaded to avoid layout shift on initial paint. Subsequent images load as they scroll into view.

**Implementation note:** the `index` comes from the feed's map iteration. Plan verifies the existing iteration in PrayerWall.tsx exposes the index (it does for keyed lists).

### D10 — Storage retention: indefinite, soft-delete preserved

Per master plan body line 4308.

- Images stored alongside posts indefinitely
- Soft-deleted posts (`is_deleted = true`) keep their image data — reasoning: a moderator-soft-deleted post might be restored; the image is part of the content
- HARD-deleted posts (Phase 10 admin operation, distinct from soft delete) DO trigger image deletion — spec 10.11 (account deletion) handles this generically
- Orphan cleanup (D14) handles uploaded-but-not-claimed images via the `posts/pending/` prefix

### D11 — Per-type composer integration

```typescript
// In composerCopyByType:
testimony: {
  // ... existing testimony entries ...
  showImageUpload: true,
  imageUploadHelperText: 'Add a photo if it tells the story.',
},
question: {
  // ... existing question entries ...
  showImageUpload: true,
  imageUploadHelperText: 'A photo can help others understand your question.',
},
// prayer_request, discussion, encouragement: showImageUpload omitted (defaults to false)
```

The helper text is short, optional, and non-pressuring. It's not a guilt-trip.

The `<ImageUpload>` component renders below the textarea, above the submit button area, when `showImageUpload === true`.

### D12 — Rate limit: 10 uploads per user per hour

Per master plan body line 4306.

Separate from the post-creation rate limit. Reasoning:
- A user composing a longer testimony might preview multiple photo attempts before settling on one
- Each preview attempt uses an upload (the orphan cleanup catches the unused ones)
- 10/hour is generous enough for normal use, restrictive enough to prevent abuse

Returned as 429 with `Retry-After` header (existing rate-limit pattern).

### D13 — Error codes

| HTTP | Code | When |
| ---- | ---- | ---- |
| 400 | `INVALID_IMAGE_FORMAT` | MIME type not in allowlist; ImageIO decode fails; HEIC/HEIF detected |
| 400 | `IMAGE_TOO_LARGE` | File size > 5MB |
| 400 | `IMAGE_DIMENSIONS_TOO_LARGE` | Width > 4000 OR Height > 4000 |
| 400 | `INVALID_ALT_TEXT` | Alt text empty when image_url is set; alt text > 500 chars |
| 400 | `IMAGE_CLAIM_FAILED` | Post creation references an image_url that doesn't exist in pending storage (e.g., expired) |
| 401 | `UNAUTHENTICATED` | No JWT |
| 413 | `PAYLOAD_TOO_LARGE` | Spring multipart limit exceeded (defense-in-depth before D3 service check) |
| 429 | `RATE_LIMITED` | 11th upload in the hour |
| 500 | `STORAGE_FAILURE` | R2 / MinIO write failure (handled by StorageExceptionHandler from 1.10e) |

### D14 — Two-step upload with MOVE-on-claim (orphan strategy)

Flow:

1. **User selects image** in composer.
2. **Frontend POSTs to `/api/v1/uploads/post-image`** with multipart body. Endpoint:
   - Validates size, format, dimensions
   - Strips PII metadata
   - Generates three renditions (full/medium/thumb)
   - Stores at `posts/pending/{userId}/{uploadId}/{rendition}.jpg` (where `{uploadId}` is a server-generated UUID)
   - Returns `{ uploadId, fullUrl, mediumUrl, thumbUrl }` for preview
3. **Frontend shows preview** in composer with the Remove button + alt-text input.
4. **User types alt text and submits the post.**
5. **Frontend POSTs to `/api/v1/posts`** with `image_upload_id: '{uploadId}'` and `image_alt_text: '...'` (NOT the URLs — the upload ID).
6. **Backend `PostService.createPost`** sees `image_upload_id`. It:
   - Verifies the pending upload exists and belongs to the requesting user (security: prevents Bob from claiming Alice's pending upload)
   - Creates the post row with placeholder `image_url` (e.g., the upload ID for now)
   - MOVES (or copies + deletes) the three renditions from `posts/pending/{userId}/{uploadId}/` to `posts/{newPostId}/`
   - Updates the post row with the final `image_url` (logical key: `posts/{newPostId}`)
   - All within a single `@Transactional` boundary; if the move fails, post creation rolls back
7. **Pending cleanup** (separate cron job, `@Scheduled`) deletes anything in `posts/pending/{userId}/` older than 24 hours.

**Why MOVE not COPY:**
- Copy + delete: two operations; failure mode where copy succeeds but delete fails leaves storage in an inconsistent state (file in two places)
- Move (R2/S3 supports server-side rename via copy + delete on the same SDK call, but conceptually atomic)
- Most S3-compatible providers don't have a true atomic move; the implementation is copy + delete with idempotency — if delete fails, the next cleanup catches it

**Rejected alternative: transactional outbox pattern.** Use a `pending_images` DB table that's queried by a worker which then MOVEs to the final location. Cleaner but adds a table, a worker, and orchestration complexity. Save for if 4.6b's approach hits scale issues.

**Why ID-not-URL on the create-post payload:**

If the frontend sent the URLs back, a malicious user could send arbitrary URLs (e.g., the URL of someone else's pending upload, or a public URL of an unrelated image). Sending the upload ID forces the backend to look up the pending record, verify ownership, and use the verified URLs.

<!-- CHUNK_BOUNDARY_5 -->

### D15 — PII stripping pipeline

Three layers of defense:

**Layer 1: metadata-extractor library.** Read all metadata directories (EXIF, IPTC, XMP, ICC profile). Build a stripped output by writing ONLY the pixel data and color profile to the new image. Discard everything else.

**Layer 2: ImageIO re-encode.** Decode pixels, encode as JPEG Q=85. ImageIO's default JPEG writer doesn't carry over input metadata unless explicitly told to. This catches anything Layer 1 missed.

**Layer 3: Test fixture verification.** Backend test loads a known-PII-laden JPEG (with embedded GPS, camera, software, custom XMP), runs it through the pipeline, and asserts the output has NONE of those tags. The test fixture lives at `backend/src/test/resources/fixtures/pii-laden.jpg`.

**What gets preserved:**
- Pixel data (the actual image)
- Color profile (sRGB) — important for color accuracy
- Image dimensions
- Format (forced to JPEG)

**What gets stripped:**
- ALL EXIF (camera make/model, lens, ISO, exposure, GPS, timestamps, software, etc.)
- ALL IPTC (caption, byline, copyright, etc.)
- ALL XMP (Adobe metadata)
- All custom/private tags
- Thumbnail (some cameras embed a thumbnail in EXIF)
- Filename / source path metadata

### D16 — Configurable env vars

New env vars introduced by 4.6b (alongside 1.10e's STORAGE_*):

| Var | Default | Purpose |
| --- | ------- | ------- |
| `POST_IMAGE_MAX_SIZE_BYTES` | `5242880` (5MB) | Per-upload size cap |
| `POST_IMAGE_MAX_DIMENSION` | `4000` | Max width or height in px |
| `POST_IMAGE_PENDING_TTL_HOURS` | `24` | How long pending uploads live before cleanup |
| `POST_IMAGE_RATE_LIMIT_PER_HOUR` | `10` | Per-user upload rate limit |
| `POST_IMAGE_CDN_BASE_URL` | (derived from STORAGE_ENDPOINT_URL) | Public URL prefix for serving images |

All have sensible defaults; production overrides only if needed. Documented in `backend/docs/runbook-storage.md` (4.6b updates the runbook with a new section).

### D17 — Storage key format and CDN URL construction

**Storage keys (logical, written to DB):**
- Pending: `posts/pending/{userId}/{uploadId}` (no extension; the renditions hang off this prefix)
- Claimed: `posts/{postId}` (same convention)

**Storage object keys (physical, written to R2):**
- `{logical-key}/full.jpg`
- `{logical-key}/medium.jpg`
- `{logical-key}/thumb.jpg`

**Public URL construction (in PostMapper):**

```java
String cdnBase = config.getCdnBaseUrl();  // from POST_IMAGE_CDN_BASE_URL or derived
String fullUrl = String.format("%s/%s/full.jpg", cdnBase, post.getImageUrl());
```

The CDN base URL pattern allows future migration to a custom domain (`https://images.worshiproom.com/...`) without changing DB rows.

### D18 — Mobile UX considerations

- File picker on mobile: `accept='image/jpeg,image/png,image/webp'` opens the camera roll; some platforms also surface a 'Take Photo' option
- Drag-and-drop is desktop-only (mobile browsers don't fire drag events for file uploads)
- Upload progress should show on small screens too (the percentage indicator is essential on slow connections)
- Lightbox on mobile: tap-to-close on backdrop is essential (no Escape key); pinch-to-zoom is the OS default for `<img>` and works without our custom zoom
- Lightbox close button on mobile must be 44x44 minimum (already specified in D8)

### D19 — Composer state when image is removed

When user clicks 'Remove' on the image preview:
- Frontend deletes the local preview
- Frontend clears alt-text state
- Frontend re-enables submit button (assuming other validation passes)
- Frontend does NOT issue a DELETE to the backend — the pending upload sits in `posts/pending/...` until the cleanup cron deletes it

**Why no DELETE call:** simpler. The cleanup cron handles unclaimed pending uploads anyway. Adding a DELETE call introduces a race (user removes, then re-uploads same image content with different uploadId; the DELETE for the old upload races with the new). Easier to just let cleanup handle it.

### D20 — Mock data for the dev profile

The `dev` profile uses `LocalFilesystemStorageAdapter` backed by `${HOME}/.worshiproom-dev-storage`. For 4.6b's local development to work, the dev profile must:
- Accept uploads to local filesystem
- Serve uploaded files via a dev-only endpoint (since R2's CDN URL pattern doesn't apply locally)
- Generate dev URLs in the format `http://localhost:8080/dev-storage/{key}` (or similar; verify pattern in plan against 1.10e's existing dev setup)

The runbook § 7 mentions `worshiproom.storage.dev-signing-secret` for HMAC-signed dev URLs — verify this is the established mechanism. If yes, 4.6b reuses it. If not, 4.6b establishes the dev-storage URL convention.

<!-- CHUNK_BOUNDARY_6 -->

---

## 8. Watch-fors

### W1 — 4.6 must ship before 4.6b starts

Verify `_forums_master_plan/spec-tracker.md` shows 4.6 ✅. The `composerCopyByType` infrastructure is fully realized after 4.6 ships. Per-type fields like `showImageUpload` extend the established pattern.

If 4.6 hasn't shipped, STOP. The interface contract for `ComposerCopy` may shift between 4.6's draft state and merged state.

### W2 — 1.10e must be merged AND env vars set in Railway

Verify `backend/src/main/java/com/worshiproom/storage/ObjectStorageAdapter.java` exists and is current. If it doesn't exist, 1.10e hasn't merged and 4.6b can't proceed (no adapter to consume).

**Pre-merge requirement (Eric's task):** Set the 5 STORAGE_* env vars in Railway per the runbook. Per Eric's tracker note, this prevents a wasted deploy attempt. The fail-fast check in S3StorageAdapter (1.10e) rejects boot if any STORAGE_* var is missing.

The brief Section 17 (Operational handoff) reproduces the env-var setup verbatim for posterity.

### W3 — Don't create a new S3StorageAdapter

Per MPD-1. The master plan body's Files-to-Create list mentions it; that's stale. 1.10e shipped it. 4.6b's UploadService `@Autowire`s the existing `ObjectStorageAdapter` interface.

If CC's plan or execution creates a file at `backend/src/main/java/com/worshiproom/upload/S3StorageAdapter.java`, abort.

### W4 — Image bytes never logged

New gate 10 emphasis. The image processing service operates on byte arrays / streams; never log the bytes themselves. Log:
- Upload ID (UUID, identifier-style)
- User ID (UUID)
- Final logical key (path-style identifier)
- File size, format, dimensions (numeric/categorical, not pixel data)
- Processing time (numeric)

Do NOT log:
- Raw byte contents (would be base64-binary garbage)
- Stripped EXIF metadata (could contain GPS or other PII even if we're stripping it from output)
- Alt text (user-provided, treat as content)

### W5 — Don't trust client-supplied MIME type alone

New gate 14. The `Content-Type` header from the client is a hint. The actual format check is: decode via ImageIO; if decode succeeds, capture the actual format from the decoded image; if that doesn't match the allowlist (JPEG, PNG, WebP), reject.

A polyglot file (PHP script with JPEG magic bytes) wouldn't decode as a real image and would be rejected at the decode step. Don't shortcut this validation.

### W6 — PII stripping verification test must use a real PII-laden fixture

Per D15 / Gate 15. The test can't just check `outputImage.getMetadata().isEmpty()` because that's testing the absence of what isn't there. The test must:

1. Load a fixture JPEG with KNOWN GPS, camera make, software tags
2. Verify (before processing) that those tags are present (sanity check on the fixture)
3. Run the processing pipeline
4. Read the output's metadata
5. Assert NONE of those tags are present in output

If CC writes a test that just checks for empty metadata on an arbitrary image, the test passes vacuously. The fixture-based test is the only meaningful verification.

### W7 — Don't accept uploads on pre-authenticated endpoints

The upload endpoint requires authentication. If CC adds the upload endpoint to a public-routes list (e.g., for some misguided 'allow anonymous uploads' interpretation), reject in /code-review.

Reasoning: anonymous uploads are an abuse vector (storage cost amplification by drive-by attackers).

### W8 — Don't store the user-supplied filename

The original filename can carry PII (e.g., `IMG_2024-01-15_at_home_with_family.jpg`). Don't preserve it.

The storage key is the only identifier 4.6b uses. The filename in the multipart upload is read for extension-based validation (HEIC detection) and then discarded.

Do NOT add a `original_filename` column on the posts table.

### W9 — Alt text required for accessibility, not just nice-to-have

Per D7. The submit-blocked-without-alt-text behavior must be foolproof. CC sometimes ships this with:
- A warning message but still-clickable submit (UX trap)
- Auto-fill of 'Image' as default alt text (defeats the purpose)
- Skip-validation toggle for power users (no — every user matters)

The ONLY acceptable behavior: submit is `disabled` (HTML attribute) until alt-text has ≥1 non-whitespace character. Backend validates as well.

### W10 — Don't proxy image reads through the backend

Upload goes through the backend (D1). READ does NOT.

The rendered image URLs (in `PostDto.image.fullUrl` etc.) point directly to R2's public URL (or CDN). The browser fetches bytes from R2 directly. The backend is not a read-time proxy.

Reasoning: read-time proxying adds backend load proportional to feed traffic. R2's egress is free; let R2 serve the bytes.

**Implication:** the R2 bucket needs public read on the `posts/{postId}/` prefix. Pending uploads at `posts/pending/...` should NOT be public. The ACL setup is part of the bucket configuration.

Wait — actually: R2's default is bucket-private; to allow public reads, either:
(a) Make the bucket public (everything is public)
(b) Configure a custom domain with public access via R2's 'r2.dev' subdomain or a Cloudflare Worker
(c) Generate presigned-GET URLs at PostDto serialization time (TTL-bounded, e.g., 1 hour)

**Decision: option (c) presigned-GET URLs.** Reasoning:
- Doesn't require bucket public-access configuration
- Pending uploads stay private by default
- TTL-bound URLs are safer (link sharing has natural expiry)
- 1.10e's `generatePresignedUrl()` method exists for exactly this

The URLs in PostDto are presigned, with TTL = `STORAGE_MAX_PRESIGN_HOURS` (default 1 hour). When the frontend renders the card, the URL works for an hour. After that, a refresh re-fetches the post and gets fresh URLs.

Caveat: feed responses with presigned URLs can't be HTTP-cached for long (URLs expire). Cache headers should reflect this (max-age ≤ 1 hour).

**Plan verifies:** 1.10e's `generatePresignedUrl()` signature and TTL handling. The runbook § 7 mentions `STORAGE_MAX_PRESIGN_HOURS=1` env var — reuse it.

### W11 — Don't confuse upload ID with post ID

The two-step flow has two identifiers:
- `uploadId` — server-generated UUID, returned by upload endpoint, used by client to claim during post creation
- `postId` — server-generated UUID, returned by post creation, becomes the permanent storage key prefix

The upload ID is ephemeral (lifetime: upload → cleanup TTL). The post ID is permanent.

If CC writes code that uses uploadId as the storage key for claimed posts, that's a bug. The MOVE operation re-keys from `posts/pending/{userId}/{uploadId}` to `posts/{postId}`.

### W12 — Don't allow cross-user claim

When post creation references an `image_upload_id`, the backend MUST verify the pending upload belongs to the requesting user. Otherwise:
- Bob uploads an image, gets uploadId X back
- Bob tells Alice the uploadId
- Alice creates a post claiming uploadId X
- Alice's post now displays Bob's image

The verification: read pending storage metadata or a `pending_uploads` tracking table; assert `pending.userId == requestingUser.userId`. Reject with 403 if not.

**Implementation note:** the storage key path includes userId (`posts/pending/{userId}/{uploadId}`). The backend can compare the path's userId segment to the requesting user. Simpler than a separate tracking table.

### W13 — Don't claim the same upload twice

Idempotency: if Alice creates two posts both referencing the same uploadId, only the first should succeed. The second should 400 with `IMAGE_CLAIM_ALREADY_USED` (new error code) OR succeed but reference the same image (which is now under `posts/{firstPostId}/`, not `posts/{secondPostId}/`).

**Decision: reject the second claim.** Each upload → one post. If Alice wants the same image on two posts, she uploads twice.

This is enforced by the MOVE operation: after the first claim, the pending key no longer exists. The second claim's lookup fails with 404 (which maps to `IMAGE_CLAIM_FAILED`).

### W14 — Don't break post creation when image upload fails mid-claim

The `@Transactional` boundary on createPost must cover both the post-row write AND the storage move. If the move fails (e.g., R2 transient outage), the entire transaction rolls back — no orphan post-without-image, no half-state.

If CC implements the move outside the transaction (e.g., 'create post first, then move image, log warning if move fails'), that's a bug. Test surface: mock the storage adapter to throw on move; assert the post is NOT created.

### W15 — Don't EXIF-leak via the WebP path

WebP files have their own metadata chunks (XMP, EXIF, color profile). The PII stripping pipeline must handle WebP inputs. If CC tests only with JPEG fixtures, WebP could leak.

Test surface: PII stripping fixture for WebP input. Same assertion as JPEG fixture.

### W16 — Don't add new auth conditionals to the upload endpoint

Upload requires authentication. It does NOT require:
- Specific role (no admin-only or trust-level gating)
- Email verification (4.6b doesn't require verified email; future spec might)
- 2FA
- Specific account age (no 'must be N days old before uploading')

If CC adds any of these, reject. Anti-abuse is handled by the rate limit; further gating is a separate spec.

### W17 — Don't run the cleanup cron on every request

The cleanup is a `@Scheduled` job, runs daily. It does NOT trigger on each upload or on each post creation.

If CC implements cleanup as 'on every upload, also check for stale pending uploads', that's wasteful and adds latency to every upload. Centralize the cleanup in the scheduled task.

### W18 — Don't break the lightbox on mobile orientation change

Mobile users may rotate the device while the lightbox is open. The lightbox should:
- Recompute layout on `resize` event
- Maintain image aspect ratio
- Stay opened (don't close on rotation)

The `<dialog>` element handles this naturally; CSS `max-width: 90vw; max-height: 90vh` adapts to the new viewport. If CC implements the lightbox with hardcoded pixel dimensions, that breaks on rotation.

### W19 — Don't auto-orient based on EXIF

Some EXIF tags carry orientation hints (e.g., 'rotate 90 degrees'). After PII stripping, these tags are gone. The image processing pipeline should APPLY the orientation BEFORE stripping (so the pixel data reflects the upright orientation), then strip the tag.

If CC strips first and applies later, sideways photos result. Order matters: read-orientation → rotate-pixels → strip-metadata → encode.

### W20 — Don't allow the alt-text input to accept HTML

The alt-text is plain text. Sanitize on the backend like other text content. The frontend renders it as `<img alt={text}>` which is HTML-attribute-context (no script execution risk), but defense-in-depth: sanitize anyway.

### W21 — Don't make the `<PostImage>` component aware of postType

Like `<ScriptureChip>` (4.5), `<PostImage>` is decoupled from postType. It renders whenever `prayer.image` is non-null, regardless of post type. The conditional 'only testimonies and questions can have images' is enforced at composer time and at backend create-time, not at render time.

Reasoning: future post types might gain image support without modifying `<PostImage>`.

### W22 — Don't introduce per-image-type chrome on the card

Images render the same regardless of post type. No special border for testimony images vs question images. The card chrome (rose / cyan / amber / violet) wraps the image; the image itself is neutral.

If CC adds tinted overlays or per-type framing to the image, that's scope creep.

### W23 — Don't break the existing testimony or question composer flows

Testimony and question composers shipped in 4.3 and 4.4 without image support. Users may have existing drafts in their browser state (e.g., localStorage) that don't include image fields. Adding image support must not break those drafts.

The `composerCopyByType.testimony.showImageUpload = true` change just renders a new affordance. It doesn't require existing code paths to change. Verify in test that submitting a testimony WITHOUT an image still works (no regression).

### W24 — Don't store CDN URLs in the DB

The `image_url` column stores the LOGICAL key (e.g., `posts/{postId}`). The DB row is provider-agnostic.

If CC writes the absolute CDN URL to the DB (e.g., `https://abc123.r2.cloudflarestorage.com/posts/.../full.jpg`), that's a portability disaster. Provider rotation (R2 → S3) would require updating every row.

Absolute URLs are constructed at serialization time (in PostMapper) using the configured CDN base URL.

### W25 — Don't generate presigned URLs in a tight loop

Feed queries return up to 50 posts per page. If each post has an image with 3 renditions, that's 150 presigned URL generations per request. The S3Presigner is fast but not free.

**Optimization (do this in 4.6b):**
- Cache the presigner instance (shouldn't be recreated per call — verify in 1.10e's S3StorageAdapter)
- Generate URLs in batch if the AWS SDK supports it (it doesn't, but the loop should be tight)
- Consider response-level caching with TTL slightly less than presign TTL (e.g., 50-minute cache for 1-hour URLs)

The brief leaves caching to the planner's discretion if performance issues surface in /verify-with-playwright. Default: no caching, just fast loop generation.

### W26 — Don't include image bytes in the PostDto serialization

PostDto includes URLs, NOT image bytes. The frontend fetches bytes via the URLs (browser → R2 directly).

If CC includes a base64-encoded `imageDataUri` field, that's a regression. Image bytes should never appear in API JSON.

### W27 — Don't allow uploads on prayer_request, discussion, encouragement composers

Per D11. The `showImageUpload` flag is `false` (or omitted) for these three types. The `<ImageUpload>` component conditional render handles it.

Backend defense-in-depth: PostService.createPost validates that `image_upload_id` is only allowed when `postType IN (TESTIMONY, QUESTION)`. If CC allows it for other types, reject.

```java
if (request.imageUploadId() != null && 
    postType != PostType.TESTIMONY && 
    postType != PostType.QUESTION) {
    throw new ImageNotAllowedForPostTypeException(postType.wireValue());
}
```

### W28 — Don't treat alt-text whitespace as valid input

Alt-text 'Required for accessibility'. A user typing only spaces (`'    '`) is not providing meaningful description. Backend `@NotBlank` covers this (Spring's NotBlank rejects whitespace-only strings). Verify the frontend's submit-disabled check uses `.trim().length > 0`, not `.length > 0`.

### W29 — Don't break existing storage tests

1.10e shipped storage tests. 4.6b's new tests should NOT modify or remove existing 1.10e tests. The contract test `AbstractObjectStorageContractTest` defines the adapter interface guarantees — new methods or behavior changes require updating the contract test, but 4.6b doesn't add or change adapter methods.

### W30 — Don't generate the lightbox image inline

The lightbox shows the FULL rendition (1920 long-edge). It does NOT generate the image client-side from a smaller rendition. Browser-side image upscaling is blurry; full rendition is stored for exactly this purpose.

```typescript
// Correct
<img src={prayer.image.full} alt={prayer.image.altText} />

// Incorrect
<img src={prayer.image.medium} alt={...} style={{ width: '1920px' }} />  // upscaled and blurry
```

### W31 — Don't add lightbox to non-image media (videos, GIFs)

Lightbox is image-only in 4.6b. If user-uploaded GIFs become a thing in the future (which they don't in 4.6b), the lightbox might need different controls (play/pause). Don't pre-build for it.

### W32 — Don't auto-apply EXIF rotation on the frontend

The backend already applies orientation before stripping (W19). The frontend just renders the bytes — no client-side rotation.

If CC adds CSS `transform: rotate(90deg)` to handle 'sideways' images, that's wrong. The backend handles it.

<!-- CHUNK_BOUNDARY_7 -->

---

## 9. Test specifications

Target: ~70 tests across frontend + backend. Master plan AC didn't specify a test count for 4.6b; the surface justifies a substantial budget.

### Backend tests

**`backend/src/test/java/com/worshiproom/upload/UploadServiceTest.java`** (NEW — ~20 tests):

Pure-unit tests with mocked storage adapter:

- `upload_jpeg_under_5mb_under_4000px_succeeds_returns_uploadId`
- `upload_png_succeeds`
- `upload_webp_succeeds`
- `upload_heic_throws_InvalidImageFormatException`
- `upload_gif_throws_InvalidImageFormatException`
- `upload_pdf_throws_InvalidImageFormatException` (polyglot test)
- `upload_over_5mb_throws_ImageTooLargeException`
- `upload_over_4000px_throws_ImageDimensionsTooLargeException`
- `upload_corrupt_jpeg_throws_InvalidImageFormatException` (decode fails)
- `upload_strips_exif_gps_metadata` (uses pii-laden.jpg fixture)
- `upload_strips_exif_camera_metadata`
- `upload_strips_iptc_metadata`
- `upload_strips_xmp_metadata`
- `upload_applies_orientation_before_stripping` (sideways photo becomes upright)
- `upload_generates_three_renditions` (verify all three keys exist after upload)
- `upload_full_rendition_is_max_1920_long_edge`
- `upload_medium_rendition_is_max_960_long_edge`
- `upload_thumb_rendition_is_max_320_long_edge`
- `upload_renditions_are_jpeg_q85` (verify format and quality)
- `upload_logs_no_pii` (verify log statements don't include alt text or bytes)

**`backend/src/test/java/com/worshiproom/upload/UploadControllerIntegrationTest.java`** (NEW — ~12 tests):

Full endpoint integration with MinIO Testcontainer:

- `POST_uploads_post_image_authenticated_succeeds_returns_uploadId_and_urls`
- `POST_uploads_post_image_unauthenticated_returns_401`
- `POST_uploads_post_image_with_idempotency_key_returns_cached_response`
- `POST_uploads_post_image_over_rate_limit_returns_429`
- `POST_uploads_post_image_with_non_image_returns_400_INVALID_IMAGE_FORMAT`
- `POST_uploads_post_image_with_oversized_file_returns_400_IMAGE_TOO_LARGE`
- `POST_uploads_post_image_with_oversized_dimensions_returns_400`
- `pending_upload_lives_at_correct_storage_key`
- `presigned_GET_url_works_for_uploaded_image` (smoke-test the URL via HTTP)
- `presigned_GET_url_expires_after_TTL` (skip if TTL test would slow suite; mark @Tag('slow'))
- `multiple_uploads_by_same_user_succeed_until_rate_limit`
- `upload_size_500MB_rejected_at_spring_layer_before_service` (defense in depth)

**`backend/src/test/java/com/worshiproom/post/PostServiceTest.java`** (UPDATE — add ~8 tests):

- `createPost_with_imageUploadId_claims_pending_upload_and_moves_to_postId`
- `createPost_with_imageUploadId_belonging_to_other_user_throws_403`
- `createPost_with_already_claimed_imageUploadId_throws_400_IMAGE_CLAIM_FAILED`
- `createPost_with_imageUploadId_but_no_alt_text_throws_400_INVALID_ALT_TEXT`
- `createPost_with_imageUploadId_on_prayer_request_throws_400_IMAGE_NOT_ALLOWED_FOR_POST_TYPE`
- `createPost_with_imageUploadId_on_discussion_throws_400`
- `createPost_rolls_back_when_storage_move_fails` (mock adapter throws on move)
- `createPost_without_imageUploadId_succeeds_with_image_null` (no regression)

**`backend/src/test/java/com/worshiproom/upload/PendingUploadCleanupTest.java`** (NEW — ~5 tests):

Scheduled cleanup task:

- `cleanup_deletes_pending_uploads_older_than_TTL`
- `cleanup_does_not_delete_recent_pending_uploads`
- `cleanup_does_not_touch_claimed_posts_directory`
- `cleanup_idempotent_on_already_deleted_keys`
- `cleanup_continues_on_individual_delete_failure` (transient failure on one key doesn't abort the whole sweep)

**`backend/src/test/java/com/worshiproom/post/PostMapperTest.java`** (UPDATE — add 3 tests):

- `toDto_with_image_url_set_includes_image_dto_with_three_presigned_urls`
- `toDto_without_image_url_includes_image_null`
- `toDto_uses_configured_CDN_base_url`

### Frontend tests

**`frontend/src/components/prayer-wall/__tests__/ImageUpload.test.tsx`** (NEW — ~10 tests):

- Renders 'Add a photo' button when not yet uploaded
- File picker has correct accept attribute (image/jpeg, image/png, image/webp)
- Selecting a JPEG triggers upload state
- Selecting a HEIC shows error and does NOT upload
- Selecting a 6MB file shows size error and does NOT upload
- Drag-over shows the dotted outline UI
- Drop triggers upload state
- Upload progress percentage updates as upload proceeds
- Upload success shows preview + alt-text input + Remove button
- Click Remove clears preview and alt text

**`frontend/src/components/prayer-wall/__tests__/PostImage.test.tsx`** (NEW — ~5 tests):

- Renders `<img>` with medium URL when image is set
- Renders nothing when image is null
- Alt text from prop is the `<img alt>` value
- First 5 instances on a page get `loading='eager'` (test via instance index)
- Subsequent instances get `loading='lazy'`

**`frontend/src/components/prayer-wall/__tests__/ImageLightbox.test.tsx`** (NEW — ~7 tests):

- Renders `role='dialog'` with `aria-modal='true'`
- Shows full rendition URL
- Shows alt text as caption
- Escape key closes
- Click on backdrop closes
- Click on image does NOT close
- Focus trap cycles between close button and image

**`frontend/src/components/prayer-wall/__tests__/InlineComposer.test.tsx`** (UPDATE — add 4 tests):

- ImageUpload renders for testimony composer
- ImageUpload renders for question composer
- ImageUpload does NOT render for prayer_request, discussion, encouragement composers
- Submit button disabled when image present but alt text empty
- Submit succeeds when image absent (no regression)
- Submit succeeds when image present and alt text non-empty

**`frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx`** (UPDATE — add 3 tests):

- Renders `<PostImage>` when prayer.image is set
- Does NOT render `<PostImage>` when prayer.image is null
- Image position is between content and InteractionBar

**`frontend/src/services/__tests__/prayer-wall-api.test.ts`** (UPDATE — add 3 tests):

- `prayerWallApi.uploadImage(file)` POSTs to /api/v1/uploads/post-image
- Returns parsed UploadResponse with uploadId
- Propagates 4xx errors with appropriate error codes

### Total test budget

- UploadServiceTest.java: ~20 new
- UploadControllerIntegrationTest.java: ~12 new
- PostServiceTest.java: ~8 added
- PendingUploadCleanupTest.java: ~5 new
- PostMapperTest.java: 3 added
- ImageUpload.test.tsx: ~10 new
- PostImage.test.tsx: ~5 new
- ImageLightbox.test.tsx: ~7 new
- InlineComposer.test.tsx: 4 added
- PrayerCard.test.tsx: 3 added
- prayer-wall-api.test.ts: 3 added

**Total: ~80 tests.**

---

## 10. Files to Create / Modify / NOT to Modify / Delete

### Files to Create

**Backend (new `upload/` package):**

- `backend/src/main/java/com/worshiproom/upload/UploadController.java` — REST endpoint
- `backend/src/main/java/com/worshiproom/upload/UploadService.java` — Orchestration
- `backend/src/main/java/com/worshiproom/upload/ImageProcessingService.java` — Resize, EXIF strip, JPEG re-encode pipeline
- `backend/src/main/java/com/worshiproom/upload/UploadRateLimitService.java` — 10/hour per user
- `backend/src/main/java/com/worshiproom/upload/PendingUploadCleanupTask.java` — `@Scheduled` daily cleanup
- `backend/src/main/java/com/worshiproom/upload/dto/UploadResponse.java` — Returns uploadId + 3 URLs
- `backend/src/main/java/com/worshiproom/upload/InvalidImageFormatException.java`
- `backend/src/main/java/com/worshiproom/upload/ImageTooLargeException.java`
- `backend/src/main/java/com/worshiproom/upload/ImageDimensionsTooLargeException.java`
- `backend/src/main/java/com/worshiproom/post/ImageNotAllowedForPostTypeException.java` (in post package since it's a post-creation concern)
- `backend/src/main/java/com/worshiproom/post/InvalidAltTextException.java`
- `backend/src/main/java/com/worshiproom/post/ImageClaimFailedException.java`
- `backend/src/main/java/com/worshiproom/upload/UploadExceptionHandler.java` — maps the upload-specific exceptions to HTTP responses
- `backend/src/main/java/com/worshiproom/post/dto/PostImageDto.java` — nested image DTO record
- `backend/src/main/resources/db/changelog/2026-05-XX-001-add-posts-image-columns.xml` — NEW Liquibase changeset
- `backend/src/test/java/com/worshiproom/upload/UploadServiceTest.java`
- `backend/src/test/java/com/worshiproom/upload/UploadControllerIntegrationTest.java`
- `backend/src/test/java/com/worshiproom/upload/PendingUploadCleanupTest.java`
- `backend/src/test/resources/fixtures/pii-laden.jpg` — PII fixture for D15 / Gate 15 verification
- `backend/src/test/resources/fixtures/oversized.jpg` — 6MB+ image for size rejection test
- `backend/src/test/resources/fixtures/large-dimensions.jpg` — 5000×5000 image for dimension rejection test
- `backend/src/test/resources/fixtures/heic-sample.heic` — HEIC for rejection test
- `backend/src/test/resources/fixtures/sideways.jpg` — EXIF orientation test
- `backend/src/test/resources/fixtures/pii-laden.webp` — WebP-format PII test

**Frontend:**

- `frontend/src/components/prayer-wall/ImageUpload.tsx` — Composer affordance
- `frontend/src/components/prayer-wall/PostImage.tsx` — Card display
- `frontend/src/components/prayer-wall/ImageLightbox.tsx` — Full-screen viewer
- `frontend/src/components/prayer-wall/__tests__/ImageUpload.test.tsx`
- `frontend/src/components/prayer-wall/__tests__/PostImage.test.tsx`
- `frontend/src/components/prayer-wall/__tests__/ImageLightbox.test.tsx`

### Files to Modify

**Backend:**

- `backend/src/main/java/com/worshiproom/post/Post.java` — Add `imageUrl` and `imageAltText` columns
- `backend/src/main/java/com/worshiproom/post/PostMapper.java` — Build `PostImageDto` with presigned URLs when imageUrl is set
- `backend/src/main/java/com/worshiproom/post/dto/PostDto.java` — Add nullable `image: PostImageDto` field
- `backend/src/main/java/com/worshiproom/post/dto/CreatePostRequest.java` — Add `imageUploadId` and `imageAltText` optional fields
- `backend/src/main/java/com/worshiproom/post/PostService.java` — In createPost, handle imageUploadId: verify ownership, MOVE pending→claimed, write imageUrl/imageAltText to post
- `backend/src/main/java/com/worshiproom/post/PostExceptionHandler.java` — Add handlers for ImageNotAllowedForPostTypeException, InvalidAltTextException, ImageClaimFailedException
- `backend/src/main/resources/openapi.yaml` — Add upload endpoint, PostImage schema, image field on PostDto, new error codes
- `backend/src/main/resources/application.properties` — Set `spring.servlet.multipart.max-file-size=10MB`, `spring.servlet.multipart.max-request-size=10MB`
- `backend/pom.xml` — Add image processing dependencies (metadata-extractor, imgscalr, twelvemonkeys-webp)
- `backend/docs/runbook-storage.md` — Add new section documenting POST_IMAGE_* env vars introduced by 4.6b; note that `posts/pending/` and `posts/{postId}/` keys are 4.6b's storage convention
- `backend/src/test/java/com/worshiproom/post/PostServiceTest.java` — Add 8 tests for image-claim flow
- `backend/src/test/java/com/worshiproom/post/PostMapperTest.java` — Add 3 tests for image mapping

**Frontend:**

- `frontend/src/types/prayer-wall.ts` — Add `image?: PostImage` to PrayerRequest interface; add PostImage interface (full/medium/thumb/altText)
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — Add `showImageUpload?` and `imageUploadHelperText?` to ComposerCopy; conditionally render ImageUpload component for testimony and question; thread imageUploadId + imageAltText into the submit payload
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — Mount `<PostImage>` between content body and InteractionBar when prayer.image is set; pass index for lazy/eager loading
- `frontend/src/services/prayer-wall-api.ts` — Add `uploadImage(file: File): Promise<UploadResponse>` method
- `frontend/src/components/prayer-wall/__tests__/InlineComposer.test.tsx` — Add 4 tests
- `frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx` — Add 3 tests
- `frontend/src/services/__tests__/prayer-wall-api.test.ts` — Add 3 tests
- `frontend/src/mocks/prayer-wall-mock-data.ts` — Add image fixtures for testimony and question (with and without)
- `_plans/post-1.10-followups.md` — If any of the R20 follow-ups should be filed (multi-image, HEIC support, lightbox a11y deeper audit)

**Operational:**

- `_forums_master_plan/spec-tracker.md` — flip 4.6b from ⬜ to ✅ AFTER successful merge

### Files NOT to Modify

**Storage (per MPD-1):**

- `backend/src/main/java/com/worshiproom/storage/ObjectStorageAdapter.java`
- `backend/src/main/java/com/worshiproom/storage/S3StorageAdapter.java`
- `backend/src/main/java/com/worshiproom/storage/LocalFilesystemStorageAdapter.java`
- `backend/src/main/java/com/worshiproom/storage/StorageExceptionHandler.java`
- Any other class in `com.worshiproom.storage` package

**Existing post-related concerns:**

- `backend/src/main/java/com/worshiproom/post/PostType.java` (no enum changes)
- `backend/src/main/java/com/worshiproom/post/PostController.java` (the existing POST /posts handler stays; image flow is via separate /uploads/post-image endpoint)
- `backend/src/main/java/com/worshiproom/post/PostSpecifications.java` (no new spec for image filtering)
- `frontend/src/components/prayer-wall/AnsweredBadge.tsx`, `ResolvedBadge.tsx`, `ScriptureChip.tsx`, `QotdBadge.tsx`, `CategoryBadge.tsx` (none need image awareness)
- `frontend/src/components/prayer-wall/InteractionBar.tsx` (image presence doesn't change reaction/comment buttons)
- `frontend/src/components/prayer-wall/CommentItem.tsx`, `CommentsSection.tsx` (comments don't get image upload in 4.6b)
- `frontend/src/components/prayer-wall/QotdComposer.tsx` (QOTD-specific composer; 4.6b doesn't add image upload there)

### Files to Delete

(none)

<!-- CHUNK_BOUNDARY_8 -->

---

## 11. Acceptance criteria

**Functional behavior — composer affordance:**

- [ ] Testimony composer renders 'Add a photo' button next to textarea
- [ ] Question composer renders 'Add a photo' button next to textarea
- [ ] prayer_request, discussion, encouragement composers do NOT render the affordance (entirely absent from DOM)
- [ ] Tapping 'Add a photo' opens a file picker accepting JPEG, PNG, WebP
- [ ] Drag-and-drop onto the composer triggers upload state with 'Drop image here' indicator
- [ ] Upload progress shows percentage during transfer
- [ ] Upload success shows preview with 'Remove' button + alt-text input
- [ ] Alt-text input has correct label, placeholder, helper text, max=500
- [ ] Submit button is disabled while alt-text is empty (whitespace-only is treated as empty per W28)
- [ ] Removing the image clears the preview AND alt text
- [ ] Submit succeeds without an image (no regression)
- [ ] Submit succeeds with image + alt-text

**Functional behavior — client-side validation:**

- [ ] HEIC/HEIF files rejected with helpful error: 'HEIC images aren't supported yet. Open the Photos app, share the image, and choose JPEG.'
- [ ] Files >5MB rejected with size error: 'Image is larger than 5 MB. Try a smaller version.'
- [ ] Non-image files rejected with format error

**Functional behavior — backend processing:**

- [ ] POST /api/v1/uploads/post-image accepts multipart/form-data
- [ ] Endpoint requires authentication (returns 401 without JWT)
- [ ] Endpoint validates MIME type via decode (not just header)
- [ ] Endpoint validates dimensions ≤4000×4000 (returns 400 with IMAGE_DIMENSIONS_TOO_LARGE)
- [ ] Endpoint validates size ≤5MB (returns 400 with IMAGE_TOO_LARGE)
- [ ] Endpoint generates 3 renditions: full (≤1920 long-edge), medium (≤1960 long-edge), thumb (≤320 long-edge)
- [ ] All renditions are JPEG Q=85 regardless of input format
- [ ] All renditions stripped of EXIF, IPTC, XMP metadata
- [ ] EXIF orientation applied to pixel data BEFORE stripping (W19)
- [ ] Pending uploads stored at `posts/pending/{userId}/{uploadId}/{rendition}.jpg`
- [ ] Endpoint returns `{ uploadId, fullUrl, mediumUrl, thumbUrl }` in JSON response
- [ ] Endpoint enforces rate limit (10/hour per user, returns 429 over)
- [ ] Endpoint accepts `Idempotency-Key` header (returns cached response on retry)

**Functional behavior — post creation with image:**

- [ ] CreatePostRequest accepts optional `imageUploadId` and `imageAltText` fields
- [ ] Post creation with imageUploadId moves pending→claimed in storage
- [ ] Final image_url stored as logical key `posts/{postId}` (not absolute URL)
- [ ] Post creation with imageUploadId belonging to another user returns 403
- [ ] Post creation with already-claimed imageUploadId returns 400 IMAGE_CLAIM_FAILED
- [ ] Post creation with imageUploadId but no imageAltText returns 400 INVALID_ALT_TEXT
- [ ] Post creation with imageUploadId on prayer_request, discussion, encouragement returns 400 IMAGE_NOT_ALLOWED_FOR_POST_TYPE
- [ ] Post creation rolls back if storage move fails (transactional)
- [ ] Post creation without imageUploadId succeeds normally (no regression)

**Functional behavior — card rendering:**

- [ ] PrayerCard renders `<PostImage>` between content body and InteractionBar when image is set
- [ ] PostImage renders nothing when prayer.image is null
- [ ] First 5 images on feed get loading='eager'; rest get loading='lazy'
- [ ] Image shows medium rendition by default
- [ ] Alt text from prayer.image.altText is the `<img alt>` value
- [ ] Image has rounded corners matching FrostedCard aesthetic
- [ ] Image is full-width with maintained aspect ratio on narrow viewports

**Functional behavior — lightbox:**

- [ ] Tapping the image opens lightbox
- [ ] Lightbox uses full rendition (1920 long-edge)
- [ ] role='dialog' aria-modal='true' aria-labelledby pointing to alt text
- [ ] Focus trap cycles between close button and image
- [ ] Escape closes
- [ ] Click on backdrop (outside image) closes
- [ ] Click on image does NOT close
- [ ] Close button visible top-right, 44x44 minimum, keyboard-focusable
- [ ] Background dark overlay with backdrop-blur
- [ ] Image max 90vw / 90vh, maintained aspect ratio
- [ ] Alt text rendered as caption below image
- [ ] Lightbox responsive to mobile orientation change

**Backend infrastructure:**

- [ ] `posts.image_url` and `posts.image_alt_text` columns added via Liquibase changeset
- [ ] Both columns nullable
- [ ] PostMapper builds PostImageDto with presigned URLs when image_url is set
- [ ] PostDto includes optional image: PostImageDto field
- [ ] OpenAPI schema documents upload endpoint, PostImage type, error codes
- [ ] Spring multipart config raised to 10MB (max-file-size + max-request-size)
- [ ] pom.xml has image processing dependencies
- [ ] Pending cleanup task runs daily, deletes uploads >24h old
- [ ] No new files in `com.worshiproom.storage` package
- [ ] UploadController, UploadService, ImageProcessingService all in new `com.worshiproom.upload` package

**PII stripping verification:**

- [ ] Backend test fixture `pii-laden.jpg` has known GPS, camera, software, XMP tags
- [ ] Test verifies (pre-processing) the fixture has those tags
- [ ] Test runs the full pipeline and verifies the OUTPUT has NONE of those tags
- [ ] Same test for WebP input (pii-laden.webp)
- [ ] Sideways test fixture verifies orientation applied before strip (image is upright in output)

**Tests:**

- [ ] ~80 new tests pass
- [ ] Existing tests continue to pass (no regressions on other post types or core post creation)
- [ ] Test count by file matches Section 9 budget
- [ ] PII fixture tests are not vacuous (assert specific absences after fixture sanity check)

**Brand voice:**

- [ ] All new copy strings pass the pastor's wife test
- [ ] No exclamation, no urgency, no comparison, no jargon, no streak/shame, no false scarcity
- [ ] Alt-text label honest about WHY ('Required for accessibility — screen readers will read this aloud')
- [ ] HEIC error actionable ('Open the Photos app, share the image, and choose JPEG')
- [ ] Helper text non-pressuring ('Add a photo if it tells the story')

**Visual verification (gated on /verify-with-playwright):**

- [ ] All 12 scenarios in Section 3 pass
- [ ] No regression on existing post type rendering
- [ ] Mixed feed renders all five chrome variants correctly
- [ ] Submit-disabled-without-alt-text behavior verified
- [ ] Lightbox verified on multiple viewport sizes

**Operational:**

- [ ] `_plans/post-1.10-followups.md` updated with relevant follow-ups (multi-image, HEIC support, lightbox a11y)
- [ ] `backend/docs/runbook-storage.md` updated with POST_IMAGE_* env vars and 4.6b's storage key conventions
- [ ] `_forums_master_plan/spec-tracker.md` 4.6b row flipped from ⬜ to ✅ as the final step
- [ ] Eric has set the 5 STORAGE_* env vars in Railway PRIOR to the merge that triggers production deploy (W2; Section 17 reproduces the steps)

---

## 12. Out of scope

Explicit deferrals — do NOT include any of these in 4.6b:

- **Multi-image upload (2+ images per post)** — master plan body says ONE image; multi-image is a future enhancement (filed as follow-up if appetite)
- **HEIC server-side conversion** — 4.6b rejects HEIC; future spec might convert
- **Image cropping / editing UI** — user uploads as-is; the composer doesn't expose crop, rotate, filter, or any editing
- **GIF support** — only JPEG, PNG, WebP
- **Video uploads** — image-only
- **Image compression preview** — server resizes server-side; user doesn't see the resize result before submitting
- **Per-image privacy controls** — image visibility follows post visibility (existing visibility predicate)
- **Comment-attached images** — 4.6b is post images only; comments stay text-only
- **Reaction-attached images** — N/A; reactions are simple toggles
- **Image tagging or @-mentioning in image** — out
- **EXIF metadata READ-and-display** (e.g., 'taken with iPhone 15 Pro') — we strip EXIF entirely
- **Image search** — Phase 11 search infrastructure may eventually index alt text; 4.6b doesn't expose search
- **Image-based content moderation** (auto-detect NSFW, etc.) — future safety spec; 4.6b relies on existing reporting/flagging
- **Watermarking** — no automatic watermark added; testimony share cards (6.7) may add watermark separately
- **Custom CDN domain** (e.g., `images.worshiproom.com`) — future polish; 4.6b uses presigned URLs from R2's default domain
- **Image lightbox zoom controls** — native pinch-to-zoom on mobile; no custom zoom UI in 4.6b
- **Image lightbox swipe between images** — N/A (one image per post in 4.6b)
- **Image upload from URL** (paste a URL, server fetches the image) — only file uploads supported
- **Image upload from clipboard** (Cmd+V to paste) — future enhancement
- **Direct browser → R2 presigned PUT** — D1 explicitly chose proxied; revisiting is a Phase 6+ optimization
- **Background image processing** (async) — 4.6b processes synchronously during upload
- **Multiple image renditions for different DPI** — the 3 renditions are dimension-based; 4.6b doesn't generate per-DPR (1x, 2x, 3x) variants
- **CORS configuration on R2** — not needed since uploads are proxied (D1) and reads use presigned URLs (W10)
- **Image upload analytics** (e.g., 'X% of testimonies have images') — future analytics spec
- **Image deletion API for users** — deletion happens via post deletion (existing soft-delete flow); separate 'remove image, keep post' is out of scope
- **Image replacement on existing posts** (edit post and swap image) — PATCH /posts doesn't accept image changes in 4.6b; future spec

---

## 13. Brand voice quick reference (pastor's wife test)

Image upload is a calm, practical affordance. The voice should feel like 'sure, add a photo if you want' — not pushy, not minimalist-cold.

**Anti-patterns to flag during /code-review:**

- 'Make your testimony pop with a photo!' (cheerleader voice)
- 'Photos increase engagement by X%' (analytics-driven manipulation)
- 'Add a photo to be heard' (false-scarcity / pressure)
- 'Why don't you have a photo yet?' (guilt)
- '📸 Snap or upload a photo!' (emoji + multiple options framing)
- 'Optional photo' (technically correct, vibes wrong — makes it feel like a missed opportunity)
- 'Compatible image formats: JPEG, PNG, WEBP' (jargon dump)
- 'Click here to upload' (instruction-as-decoration)
- 'Image uploaded successfully!' (exclamation; 'Image uploaded' is enough)
- 'Required field' on the alt text without explanation (rule-as-rule, not rule-with-reason)

**Good copy in 4.6b:**

- 'Add a photo' — simple, direct, action-oriented
- 'Add a photo if it tells the story' — testimony helper text; gentle, conditional
- 'A photo can help others understand your question' — question helper text; useful framing
- 'Drop image here' — standard drag-drop UX; calm
- 'Describe this image for screen readers' — alt text label; honest about purpose
- 'A short description of what's in the photo' — placeholder; concrete
- 'Required for accessibility — screen readers will read this aloud' — helper; gives the reason
- 'HEIC images aren't supported yet. Open the Photos app, share the image, and choose JPEG.' — actionable error
- 'Image is larger than 5 MB. Try a smaller version.' — informative, gentle
- 'You've uploaded a lot of images recently. Try again in a bit.' — rate-limit message; warm not punitive
- 'Remove' on the image preview — single-word verb, no decoration

The alt-text helper 'Required for accessibility — screen readers will read this aloud' is load-bearing. It explains the WHY in eight words. Without that explanation, users who don't know what alt text is feel they're being made to fill out a form for no reason.

The HEIC error is unusually long because the user needs concrete steps. Short error ('Format not supported') would leave the user stuck. The two-sentence form gives the path forward.

<!-- CHUNK_BOUNDARY_9 -->

---

## 14. Tier rationale

Run at **xHigh**. Justifications:

**Why not Standard:**

- The PII stripping correctness is privacy-critical. EXIF GPS leaks home addresses. Standard tier sometimes ships incomplete metadata strippers (camera but not GPS, or vice versa). Test fixture verification (W6) is the only way to catch the gap, and Standard sometimes ships vacuous tests.
- The two-step upload + claim flow has subtle failure modes (W11, W12, W13, W14). Standard tier ships happy-path code that breaks under the orphan/double-claim/cross-user hazards.
- The dimension validation BEFORE byte transfer (Gate 14, D6) needs careful ordering. Standard tier sometimes uploads first, validates after — wastes bandwidth.
- The presigned-URL choice for reads (W10) requires understanding 1.10e's adapter semantics. Standard tier sometimes makes the bucket public-read or proxies reads through the backend, both wrong.
- Alt-text accessibility (D7, W9) demands a foolproof submit-disabled-without-alt-text behavior. Standard tier ships warnings + clickable submits.
- Per-type composer integration extends the established pattern (4.3-4.6) but introduces conditional component rendering that must not break existing draft state (W23).

**Why not MAX:**

- 1.10e shipped the storage abstraction. 4.6b consumes via DI — zero R2-specific code.
- Image processing libraries are well-known. No novel algorithms.
- The composer integration follows 4.3-4.6's pattern.
- The `<PostImage>` and `<ImageLightbox>` are render-only components.
- No new auth conditionals.
- The brief covers all 32 watch-fors and 20 decisions explicitly.

**Override moments — when to bump to MAX:**

- During /plan or /execute, if CC proposes creating a new `S3StorageAdapter.java` (MPD-1 violation, W3)
- If CC writes the EXIF strip test as `assertThat(metadata).isEmpty()` without a fixture sanity check (W6 vacuous test)
- If CC implements the storage move OUTSIDE the createPost @Transactional boundary (W14 atomicity violation)
- If CC stores absolute CDN URLs in the DB image_url column (W24 portability violation)
- If CC implements read-through proxying instead of presigned URLs (W10 architecture violation)
- If CC adds `org.springframework.web.multipart.MultipartFile` validation that bypasses the decode step (W5 trust-the-header violation)

---

## 15. Recommended planner instruction

Paste this as the body of `/spec-forums spec-4-6b`:

```
/spec-forums spec-4-6b

Write a spec for Phase 4.6b: Image Upload for Testimonies & Questions. Read /Users/Eric/worship-room/_plans/forums/spec-4-6b-brief.md as the source of truth. Treat the brief as binding. Where the master plan body and the brief diverge, the brief wins.

Tier: xHigh.

Branch: stay on `forums-wave-continued`. Do not run any git mutations. Eric handles git manually.

Prerequisites:
- 4.3 (Testimony) must be ✅
- 4.4 (Question) must be ✅
- 4.6 (Encouragement) must be ✅ (the per-type composer infrastructure is fully realized after 4.6 ships)
- 1.10e (Object Storage Adapter Foundation) must be ✅ — verify ObjectStorageAdapter.java exists at backend/src/main/java/com/worshiproom/storage/
- Eric must have set the 5 STORAGE_* env vars in Railway (Section 17 reproduces the steps)

If any prerequisite check fails, STOP. Don't proceed without all prereqs shipped.

Recon checklist (re-verify on disk before starting; the brief's recon was on date 2026-05-08):

1. `backend/src/main/java/com/worshiproom/storage/ObjectStorageAdapter.java` exists — read full interface to capture all 6 methods and their exact signatures
2. Confirm storage profile wiring (dev/test/prod adapters per runbook § 2)
3. `backend/src/main/java/com/worshiproom/post/Post.java` does NOT have image_url or image_alt_text columns yet
4. `backend/src/main/java/com/worshiproom/upload/` package does NOT exist yet
5. `frontend/src/components/prayer-wall/InlineComposer.tsx` has the per-type composerCopyByType map post-4.6 with the established pattern
6. `frontend/src/components/prayer-wall/PrayerCard.tsx` has the per-type chrome / icon switches
7. `<LoadingSkeleton>` and `<RetryBanner>` components exist — verify paths
8. `PostsRateLimitService` exists — verify whether it can be parameterized OR if 4.6b needs a separate `UploadRateLimitService`
9. `backend/src/main/resources/openapi.yaml` exists — confirm path
10. `backend/src/main/resources/application.properties` — read existing multipart config
11. `backend/pom.xml` — check for image processing libs (likely none yet)
12. `_plans/post-1.10-followups.md` — read current state for 4.6b's filings
13. `backend/docs/runbook-storage.md` — read § 7 to confirm dev-storage URL convention and presigned URL TTL handling

Spec output structure:

- Title and metadata (size L, risk Medium, prerequisites 4.3/4.4/4.6/1.10e, branch forums-wave-continued)
- Goal — Add image upload to testimonies and questions; backend `upload/` package consumes 1.10e's ObjectStorageAdapter; PII stripping pipeline; three-rendition storage; lightbox UX; alt-text required; rate limit; orphan cleanup
- Approach — Two-step upload (POST /uploads/post-image returns uploadId; POST /posts with imageUploadId moves pending→claimed); proxied uploads (D1); JPEG-only output regardless of input format; presigned-GET URLs for reads (W10)
- Files to create / modify / NOT to modify (per brief Section 10)
- Acceptance criteria (per brief Section 11)
- Test specifications (per brief Section 9 — ~80 tests)
- Out of scope (per brief Section 12)
- Out-of-band notes for the executor:
  - 1.10e ALREADY SHIPPED the storage adapter (MPD-1) — do NOT create S3StorageAdapter.java in upload/
  - PII stripping is BUILT IN 4.6b (MPD-2) — 6.7 will reuse, not the other way around
  - All three renditions stored as JPEG Q=85 regardless of input format
  - PostDto.image is a nested object with three rendition URLs + altText, OR null if no image
  - DB stores logical key only (W24); absolute CDN URLs constructed at serialization time
  - Two-step upload flow with MOVE-on-claim (D14); orphan cleanup via @Scheduled task
  - ID-not-URL on the create-post payload to prevent cross-user claim (W12)
  - Rate limit 10/hour per user via UploadRateLimitService (D12)
  - Alt text REQUIRED with submit-disabled enforcement (D7, W9, W28)
  - HEIC rejected with helpful copy (D5)
  - Decode-based MIME validation, not header-based (W5, Gate 14)
  - Test fixture verification non-vacuous for PII strip (W6, Gate 15)
  - EXIF orientation applied BEFORE stripping (W19)
  - All 32 watch-fors must be addressed

Critical reminders:

- Use single quotes throughout TypeScript and shell.
- Test convention: `__tests__/` colocated with source files.
- Tracker is source of truth. Eric flips ⬜→✅ after merge.
- Eric handles all git operations manually.
- New backend package `upload/`. Two new columns on `posts`. New Liquibase changeset.
- Frontend extends ComposerCopy with two new optional fields.
- 4.6b CONSUMES 1.10e's ObjectStorageAdapter; do NOT recreate.

After writing the spec, run /plan-forums spec-4-6b with the same tier (xHigh).
```

---

## 16. Verification handoff

After /code-review passes, run:

```
/verify-with-playwright spec-4-6b
```

The verifier exercises Section 3's 12 visual scenarios. Verifier writes to `_plans/forums/spec-4-6b-verify-report.md`.

If verification flags any of:
- Image bytes appearing in API JSON responses (W26)
- EXIF metadata present in any rendition (W6, Gate 15)
- Absolute CDN URLs in the DB (W24)
- Bucket public-read configured (W10)
- Submit button enabled while alt-text is empty (W9, D7)
- HEIC accepted by the upload endpoint (D5)
- Image affordance rendered on prayer_request, discussion, or encouragement composer (D11, W27)
- Cross-user claim succeeded (W12)

Abort and bump to MAX. Those are the canonical override moments.

For PII verification specifically, the verifier should:
1. Confirm the test fixture `pii-laden.jpg` actually contains GPS, camera, software tags BEFORE processing
2. Confirm the OUTPUT (after pipeline) contains NONE of those tags
3. Repeat for `pii-laden.webp`

If either step is skipped or vacuous, treat as a hard fail.

---

## 17. Operational handoff (R2 + Railway setup)

**This section reproduces verbatim what Eric needs to do externally before merging 4.6b. It belongs inside the spec so that future-Eric reading the file later doesn't need to dig through chat history or the original tracker note.**

The S3StorageAdapter (1.10e) has a fail-fast check that rejects production boot if any of the five `STORAGE_*` env vars is missing. Without these set in Railway, 4.6b's merge triggers a deploy that immediately fails. To prevent that wasted deploy attempt, set the env vars BEFORE merging 4.6b.

**Total wall-clock time: ~15 minutes** (10 minutes Cloudflare + 3 minutes Railway + 2 minutes verification).

### Step 1: Cloudflare R2 (one-time, ~10 minutes)

1. **Sign in to Cloudflare.** Free tier is sufficient: 10GB storage, zero egress fees, plenty for the early months of Worship Room.

2. **Enable R2** from the dashboard:
   - Left navigation → R2 Object Storage → 'Get started'
   - Agree to terms
   - Cloudflare may prompt for a payment method even on the free tier; this is for overage protection, not an immediate charge.

3. **Create the bucket:**
   - R2 → 'Create bucket'
   - Name: `worshiproom-prod`
   - Location: Automatic (Cloudflare picks the nearest region)
   - Click 'Create bucket'
   - Optional: also create `worshiproom-dev` if you want a separate dev bucket. The runbook says it's optional; the dev profile uses local-filesystem by default.

4. **Create an API token** scoped tightly:
   - R2 → 'Manage R2 API Tokens' → 'Create API token'
   - Token name: `worshiproom-backend-prod` (or similar)
   - Permissions: **Object Read & Write** (NOT Admin — least privilege)
   - Specify bucket: select **only** `worshiproom-prod` (NOT account-wide). Critical for limiting blast radius if the token leaks.
   - TTL: leave default (no expiry). The runbook mandates quarterly rotation per § 6.
   - Click 'Create API Token'

5. **Capture three values from the resulting page** (the secret displays once):
   - Access Key ID
   - Secret Access Key
   - Endpoint URL labeled 'S3 API' — format: `https://<account-id>.r2.cloudflarestorage.com`. Copy the entire URL including the `https://` prefix.

   Save these to a password manager titled something like 'Worship Room R2 prod token, created YYYY-MM-DD, rotates YYYY-MM-DD+90' so quarterly rotation is on the calendar.

### Step 2: Railway env vars (~3 minutes)

Go to Railway → your project → Backend service → Variables tab. Add these five (the runbook's exact names; the fail-fast check expects these literal keys):

| Variable | Value |
|---|---|
| `STORAGE_BUCKET` | `worshiproom-prod` |
| `STORAGE_REGION` | `auto` |
| `STORAGE_ACCESS_KEY` | (the Access Key ID from Step 1.5) |
| `STORAGE_SECRET_KEY` | (the Secret Access Key from Step 1.5) |
| `STORAGE_ENDPOINT_URL` | `https://<your-account-id>.r2.cloudflarestorage.com` |

Optional sixth: `STORAGE_MAX_PRESIGN_HOURS=1`. Leave this unset; the default is 1 hour. The runbook says only override if a specific consumer needs longer (4.6b doesn't).

### Step 3: Verification (~2 minutes)

After saving the variables, click into each one in Railway and confirm the saved value matches what was pasted. Railway sometimes truncates trailing whitespace and sometimes doesn't show the full value back for secrets. The endpoint URL is the most likely to have a copy-paste issue (extra space before the protocol, or missing the `.r2.cloudflarestorage.com` suffix).

**Don't redeploy yet.** The vars sit dormant until you push code that wires through to S3StorageAdapter (which is what 4.6b does). When you eventually merge 4.6b and Railway redeploys, the fail-fast check passes immediately because the vars are already there.

### What you do NOT need to do

- **Don't redeploy Railway.** The fail-fast check only runs on backend boot; the existing prod build doesn't need these vars yet (1.10e's adapter wires them but no consumer calls into the adapter until 4.6b ships).
- **Don't pre-create any keys/objects in the bucket.** The bucket stays empty until 4.6b's first upload.
- **Don't configure CORS on the bucket.** 4.6b proxies uploads through the backend (D1), so the browser never talks directly to R2. No CORS needed. (If 4.6b had chosen direct-browser-to-R2 presigned PUT, CORS would matter.)
- **Don't set up a custom domain on R2 yet.** PostImage URLs are presigned via R2's default `r2.cloudflarestorage.com` domain; custom domain is a polish item for later.
- **Don't make the bucket public-read.** Per W10 / D17 of this brief, reads are via presigned-GET URLs. Public-read defeats the per-URL TTL safety.

### Rollback (if something goes wrong post-merge)

Per the runbook § 4 step 5:

1. Revert Railway env var changes to previous values (or delete them).
2. Or redeploy the previous build via Railway Dashboard → service → Deployments → previous → Redeploy.
3. Since no schema migration is involved on the storage side, rollback is purely a Railway operation. (4.6b's Liquibase changeset adds `image_url` and `image_alt_text` columns; these are nullable and additive, so Liquibase rollback is also safe but unnecessary if env vars are simply reverted.)

### When to rotate the API token

Quarterly minimum, OR immediately on suspected compromise. The runbook § 6 walks through the worked example: ~5 minutes wall-clock per rotation. Calendar reminder for quarterly rotation is the right hygiene move.

---

## Prerequisites confirmed (as of 2026-05-08 brief authorship)

- ✅ 4.1, 4.2, 4.3, 4.4 shipped per spec-tracker
- ✅ 1.10e shipped per recon (ObjectStorageAdapter.java exists at the expected path)
- ⬜ 4.5 — needs to ship before 4.6
- ⬜ 4.6 — needs to ship before 4.6b (per-type composer infra completes after 4.6)
- ⬜ Eric's Railway env vars — set per Section 17 BEFORE the 4.6b merge
- The runbook at `backend/docs/runbook-storage.md` is accurate (read for this brief on 2026-05-08)
- The PostCommentService comment-rejection injection point (used by 4.6) is unrelated to 4.6b's surface; no conflict
- The PostSpecifications.notExpired() factory (added by 4.6) is unrelated to 4.6b's surface; no conflict
- 1.10c (Database backup) shares the storage adapter with 4.6b; if 1.10c ships first and uses a different storage key convention, 4.6b adapts during recon (R9)

**Brief authored:** 2026-05-08, on Eric's personal laptop. Companion to Spec 4.3, 4.4, 4.5, 4.6 briefs. Largest spec in Phase 4 by surface area: new backend package, schema migration, image processing pipeline, three-rendition storage, lightbox UX, per-type composer integration, R2 storage integration via 1.10e's adapter, alt-text accessibility enforcement, rate limiting, orphan cleanup. The Operational handoff (Section 17) is the first 'this spec touches infrastructure outside the codebase' brief in the Forums Wave; future infrastructure-touching specs should follow the same pattern of inlining the operator steps verbatim.

**End of brief.**
