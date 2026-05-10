package com.worshiproom.post;

import com.worshiproom.activity.ActivityService;
import com.worshiproom.activity.ActivityType;
import com.worshiproom.activity.dto.ActivityRequest;
import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.post.dto.CreatePostRequest;
import com.worshiproom.post.dto.CreatePostResponse;
import com.worshiproom.post.dto.PostDto;
import com.worshiproom.post.dto.PostListMeta;
import com.worshiproom.post.dto.PostListResponse;
import com.worshiproom.post.dto.UpdatePostRequest;
import com.worshiproom.post.comment.CommentNotForThisPostException;
import com.worshiproom.post.comment.PostComment;
import com.worshiproom.post.comment.PostCommentNotFoundException;
import com.worshiproom.post.comment.PostCommentRepository;
import com.worshiproom.safety.ContentType;
import com.worshiproom.safety.CrisisDetectedEvent;
import com.worshiproom.safety.CrisisResources;
import com.worshiproom.safety.PostCrisisDetector;
import com.worshiproom.upload.UploadService;
import com.worshiproom.user.UserRepository;
import jakarta.persistence.EntityManager;
import org.owasp.html.PolicyFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Read + write orchestration for the Spec 3.3 read endpoints and Spec 3.5 write
 * endpoints. Composes {@link PostSpecifications} building blocks for reads;
 * implements full create/update/delete flows for writes.
 *
 * <p>Mute filter is applied to feed and author-posts reads but NOT to
 * single-post {@link #getById(UUID, UUID)} (Spec 3.3 Divergence 1 — direct
 * ID lookups bypass discovery filters).
 *
 * <p>Class-level {@code @Transactional(readOnly = true)} is the default; write
 * methods explicitly override with {@code @Transactional}.
 */
@Service
@Transactional(readOnly = true)
public class PostService {

    private static final Logger log = LoggerFactory.getLogger(PostService.class);

    private final PostRepository postRepository;
    private final PostMapper postMapper;
    private final UserResolverService userResolverService;
    private final ActivityService activityService;
    private final UserRepository userRepository;
    private final QotdQuestionRepository qotdQuestionRepository;
    private final PostsRateLimitService rateLimitService;
    private final PostsIdempotencyService idempotencyService;
    private final ApplicationEventPublisher eventPublisher;
    private final PostsRateLimitConfig config;
    private final PolicyFactory htmlSanitizerPolicy;
    private final EntityManager entityManager;
    private final PostCommentRepository commentRepository;
    private final ResolveRateLimitService resolveRateLimitService;
    private final UploadService uploadService;

    public PostService(PostRepository postRepository,
                       PostMapper postMapper,
                       UserResolverService userResolverService,
                       ActivityService activityService,
                       UserRepository userRepository,
                       QotdQuestionRepository qotdQuestionRepository,
                       PostsRateLimitService rateLimitService,
                       PostsIdempotencyService idempotencyService,
                       ApplicationEventPublisher eventPublisher,
                       PostsRateLimitConfig config,
                       PolicyFactory htmlSanitizerPolicy,
                       EntityManager entityManager,
                       PostCommentRepository commentRepository,
                       ResolveRateLimitService resolveRateLimitService,
                       UploadService uploadService) {
        this.postRepository = postRepository;
        this.postMapper = postMapper;
        this.userResolverService = userResolverService;
        this.activityService = activityService;
        this.userRepository = userRepository;
        this.qotdQuestionRepository = qotdQuestionRepository;
        this.rateLimitService = rateLimitService;
        this.idempotencyService = idempotencyService;
        this.eventPublisher = eventPublisher;
        this.config = config;
        this.htmlSanitizerPolicy = htmlSanitizerPolicy;
        this.entityManager = entityManager;
        this.commentRepository = commentRepository;
        this.resolveRateLimitService = resolveRateLimitService;
        this.uploadService = uploadService;
    }

    public PostListResponse listFeed(
            @Nullable UUID viewerId,
            int page, int limit,
            @Nullable String category,
            @Nullable PostType postType,
            @Nullable String qotdId,
            SortKey sort,
            String requestId
    ) {
        Specification<Post> spec = PostSpecifications.visibleTo(viewerId)
                .and(PostSpecifications.notMutedBy(viewerId))
                .and(PostSpecifications.byCategory(category))
                .and(PostSpecifications.byPostType(postType))
                .and(PostSpecifications.byQotdId(qotdId))
                .and(PostSpecifications.notExpired()); // Spec 4.6 — encouragement 24h feed expiry
        if (sort == SortKey.ANSWERED) {
            spec = spec.and(PostSpecifications.isAnswered());
        }
        Pageable pageable = PageRequest.of(page - 1, limit, sortFor(sort));
        Page<Post> resultPage = postRepository.findAll(spec, pageable);
        List<PostDto> dtos = postMapper.toDtoList(resultPage.getContent());
        return new PostListResponse(dtos, buildMeta(page, limit, resultPage.getTotalElements(), requestId));
    }

    public PostDto getById(UUID postId, @Nullable UUID viewerId) {
        // Mute filter intentionally NOT applied — direct ID lookups bypass discovery filters (Divergence 1)
        Specification<Post> spec = PostSpecifications.visibleTo(viewerId)
                .and((root, query, cb) -> cb.equal(root.get("id"), postId));
        Optional<Post> post = postRepository.findOne(spec);
        Post resolved = post.orElseThrow(PostNotFoundException::new);
        return postMapper.toDto(resolved);
    }

    public PostListResponse listAuthorPosts(
            String username,
            @Nullable UUID viewerId,
            int page, int limit,
            SortKey sort,
            String requestId
    ) {
        Optional<UUID> authorId = userResolverService.resolve(username);
        if (authorId.isEmpty()) {
            // Anti-enumeration: empty array, not 404
            return new PostListResponse(List.of(), buildMeta(page, limit, 0L, requestId));
        }
        Specification<Post> spec = PostSpecifications.visibleTo(viewerId)
                .and(PostSpecifications.notMutedBy(viewerId))
                .and(PostSpecifications.byAuthor(authorId.get()))
                .and(PostSpecifications.notExpired()); // Spec 4.6 — author profile excludes expired encouragements too
        if (sort == SortKey.ANSWERED) {
            spec = spec.and(PostSpecifications.isAnswered());
        }
        Pageable pageable = PageRequest.of(page - 1, limit, sortFor(sort));
        Page<Post> resultPage = postRepository.findAll(spec, pageable);
        List<PostDto> dtos = postMapper.toDtoList(resultPage.getContent());
        return new PostListResponse(dtos, buildMeta(page, limit, resultPage.getTotalElements(), requestId));
    }

    @Transactional
    public CreatePostResponse createPost(
            UUID authorId,
            CreatePostRequest request,
            String idempotencyKey,
            String requestId
    ) {
        // Step 1 (auth): handled upstream by JwtAuthenticationFilter.
        // Step 2 (email-verify gate): DROPPED per recon; followup tracked.

        // Idempotency lookup BEFORE rate limit check — a replay should never re-consume tokens.
        int bodyHash = request.hashCode();
        Optional<CreatePostResponse> cached = idempotencyService.lookup(authorId, idempotencyKey, bodyHash);
        if (cached.isPresent()) {
            return cached.get();
        }

        // Step 3: rate limit check (BEFORE crisis detection AND BEFORE DB insert).
        rateLimitService.checkAndConsume(authorId);

        // Step 4: cross-field validation.
        String postTypeRaw = request.postType();
        PostType postType = PostType.fromValue(postTypeRaw);  // safe — JSR-303 already validated regex
        String category = request.category();
        if ((postType == PostType.PRAYER_REQUEST || postType == PostType.DISCUSSION) && category == null) {
            throw new MissingCategoryException(postTypeRaw);
        }
        if (request.qotdId() != null && !qotdQuestionRepository.existsById(request.qotdId())) {
            throw new InvalidQotdIdException(request.qotdId());
        }
        boolean scriptureRefPresent = request.scriptureReference() != null;
        boolean scriptureTextPresent = request.scriptureText() != null;
        if (scriptureRefPresent != scriptureTextPresent) {
            throw new InvalidScripturePairException();
        }
        // Spec 4.6 — Per-type anonymous policy. Encouragement is the messenger's
        // signed gift; anonymous would defeat the purpose. Throws (not silent
        // coerce) so a buggy client gets a loud 400.
        if (postType == PostType.ENCOURAGEMENT && Boolean.TRUE.equals(request.isAnonymous())) {
            throw new AnonymousNotAllowedException(postType.value());
        }

        // Spec 4.7b — help_tags cross-type rejection + normalization. Runs in the
        // cross-field validation block so a buggy client gets a 400 BEFORE we
        // burn time on sanitization or crisis detection.
        String helpTagsRaw = "";  // default empty
        Set<String> requestedHelpTags = request.helpTags();
        if (requestedHelpTags != null && !requestedHelpTags.isEmpty()) {
            if (postType != PostType.PRAYER_REQUEST) {
                throw new HelpTagsNotAllowedForPostTypeException(postTypeRaw);
            }
            helpTagsRaw = normalizeHelpTags(requestedHelpTags);
        }

        // Step 5: HTML sanitization.
        String sanitizedContent = htmlSanitizerPolicy.sanitize(request.content()).trim();
        if (sanitizedContent.isEmpty()) {
            throw new EmptyContentException();
        }
        int maxLength = maxContentLengthFor(postType);
        if (sanitizedContent.length() > maxLength) {
            // After sanitization, the post-strip content may still be over the
            // per-type ceiling if the user pasted hand-crafted HTML that survived
            // the policy (unlikely but possible). Re-validate.
            throw new ContentTooLongException(maxLength);
        }
        String sanitizedScriptureText = scriptureTextPresent
                ? htmlSanitizerPolicy.sanitize(request.scriptureText()).trim()
                : null;

        // Step 5.5: image-claim cross-field validation (Spec 4.6b).
        // Image is optional; when set, post type must be testimony or question, and
        // alt text must be non-blank after sanitization. The claim itself (MOVE
        // pending → claimed) happens after the post is saved (Step 7.5) so the
        // claimed key can use the new postId.
        String imageUploadIdRaw = request.imageUploadId();
        UUID imageUploadId = null;
        String sanitizedAltText = null;
        if (imageUploadIdRaw != null) {
            if (postType != PostType.TESTIMONY && postType != PostType.QUESTION) {
                throw new ImageNotAllowedForPostTypeException(postTypeRaw);
            }
            String imageAltTextRaw = request.imageAltText();
            if (imageAltTextRaw == null) {
                throw new InvalidAltTextException();
            }
            sanitizedAltText = htmlSanitizerPolicy.sanitize(imageAltTextRaw).trim();
            if (sanitizedAltText.isEmpty()) {
                throw new InvalidAltTextException();
            }
            imageUploadId = UUID.fromString(imageUploadIdRaw); // safe — JSR-303 already validated lowercase UUID regex
        }

        // Step 6: crisis detection — runs over content + alt text concatenated so
        // crisis-language carried in alt text is caught (Spec 4.6b gate 6). Single
        // detector call; single AFTER_COMMIT event.
        String detectionInput = sanitizedAltText != null
                ? sanitizedContent + " " + sanitizedAltText
                : sanitizedContent;
        boolean crisisFlag = PostCrisisDetector.detectsCrisis(detectionInput);

        // Step 7: build entity and save.
        Post post = new Post();
        post.setId(UUID.randomUUID());
        post.setUserId(authorId);
        post.setPostType(postType);
        post.setContent(sanitizedContent);
        post.setCategory(category);
        post.setAnonymous(Boolean.TRUE.equals(request.isAnonymous()));
        post.setVisibility(request.visibility() != null
                ? PostVisibility.fromValue(request.visibility())
                : PostVisibility.PUBLIC);
        post.setChallengeId(request.challengeId());
        post.setQotdId(request.qotdId());
        post.setScriptureReference(request.scriptureReference());
        post.setScriptureText(sanitizedScriptureText);
        post.setAnswered(false);
        post.setAnsweredText(null);
        post.setAnsweredAt(null);
        post.setModerationStatus(ModerationStatus.APPROVED);
        post.setCrisisFlag(crisisFlag);
        post.setDeleted(false);
        post.setDeletedAt(null);
        post.setPrayingCount(0);
        post.setCandleCount(0);
        post.setCommentCount(0);
        post.setBookmarkCount(0);
        post.setReportCount(0);
        // Spec 4.6b — image_url is populated AFTER the post is saved (Step 7.5)
        // because the claimed storage key uses the server-generated postId.
        // image_alt_text can be set immediately — it's not derived from postId.
        post.setImageUrl(null);
        post.setImageAltText(sanitizedAltText);
        // Spec 4.7b — normalized comma-separated help_tags ("" when none).
        post.setHelpTagsRaw(helpTagsRaw);
        // created_at, updated_at, last_activity_at populate from DB DEFAULT NOW()
        // (entity columns have insertable=false; the DB-side DEFAULT fires).

        Post saved = postRepository.save(post);
        postRepository.flush();  // flush so DB defaults populate before mapper reads them.

        // Refresh the managed entity in place to read back DB-assigned defaults
        // (created_at, updated_at, last_activity_at have insertable=false, so the
        // INSERT skips them and the DB DEFAULT NOW() supplies values; without
        // refresh the in-memory entity has nulls for those columns and the
        // create-response would omit them via Jackson's non_null inclusion).
        // findById would not work here — it returns the L1-cached managed
        // entity unchanged.
        entityManager.refresh(saved);

        // Step 8: activity engine.
        activityService.recordActivity(
                authorId,
                new ActivityRequest(ActivityType.PRAYER_WALL, "prayer-wall-post", null)
        );

        // Step 8.5: image-claim (Spec 4.6b D14). MOVE pending → posts/{postId}/.
        // Runs inside the @Transactional boundary — if claim fails, the post insert
        // rolls back and no orphan post row is committed. Placed AFTER activity
        // recording so any activity-engine failure rolls the transaction back
        // BEFORE the storage MOVE executes — minimising orphan-by-rollback at
        // posts/{postId}/ since the cleanup task only sweeps posts/pending/.
        // Storage operations themselves are NOT transactional, so a rare-case
        // orphan can still occur if a step AFTER this one (idempotency cache
        // write, response assembly) throws and rolls the transaction back.
        if (imageUploadId != null) {
            String claimedBase = uploadService.claimUpload(authorId, imageUploadId, saved.getId());
            saved.setImageUrl(claimedBase);
            postRepository.save(saved);
        }

        // Step 9: response assembly.
        PostDto dto = postMapper.toDto(saved);
        CreatePostResponse response = crisisFlag
                ? CreatePostResponse.withCrisisResources(dto, CrisisResources.buildBlock(), requestId)
                : CreatePostResponse.normal(dto, requestId);

        // Step 6 (continued, AFTER_COMMIT): publish crisis event AFTER save+flush so
        // the listener has a real persisted row by the time it fires AFTER_COMMIT.
        if (crisisFlag) {
            eventPublisher.publishEvent(new CrisisDetectedEvent(saved.getId(), authorId, ContentType.POST));
        }

        // Step 10: store idempotency cache entry.
        idempotencyService.store(authorId, idempotencyKey, bodyHash, response);

        // Logging — IDs only, no content (per 07-logging-monitoring.md).
        log.info("postCreated postId={} userId={} postType={} crisisFlag={} requestId={}",
                saved.getId(), authorId, postTypeRaw, crisisFlag, requestId);

        return response;
    }

    @Transactional
    public PostDto updatePost(
            UUID postId,
            AuthenticatedUser principal,
            UpdatePostRequest request,
            String requestId
    ) {
        if (request.isEmpty()) {
            throw new EmptyPatchBodyException();
        }

        // Step 2: post existence (live posts only — soft-deleted return 404).
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(PostNotFoundException::new);

        // Step 3: ownership.
        boolean isAuthor = post.getUserId().equals(principal.userId());
        if (!isAuthor && !principal.isAdmin()) {
            throw new PostForbiddenException();
        }

        // Step 4: identify exempt vs non-exempt edits.
        boolean wantsContentEdit = request.content() != null;
        boolean wantsCategoryEdit = request.category() != null;
        boolean wantsVisibilityEdit = request.visibility() != null;
        boolean wantsQotdEdit = request.qotdId() != null;
        boolean wantsChallengeEdit = request.challengeId() != null;
        boolean wantsScriptureEdit = request.scriptureReference() != null || request.scriptureText() != null;
        boolean wantsAnsweredEdit = request.isAnswered() != null;
        boolean wantsAnsweredTextEdit = request.answeredText() != null;
        // Spec 4.7b — help_tags is window-gated (5-min edit window). null = no
        // change; [] = clear; non-empty = set (cross-type rejection applies).
        boolean wantsHelpTagsEdit = request.helpTags() != null;

        boolean nonExemptEditRequested =
                wantsContentEdit || wantsCategoryEdit || wantsQotdEdit
                || wantsChallengeEdit || wantsScriptureEdit
                || wantsHelpTagsEdit;

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        boolean withinWindow = !now.isAfter(
                post.getCreatedAt().plusMinutes(config.getEditWindowMinutes()));

        // Step 4 (continued): non-exempt edit gate.
        if (nonExemptEditRequested && !withinWindow) {
            throw new EditWindowExpiredException();
        }

        // Step 5: visibility direction gate (per Divergence 4).
        if (wantsVisibilityEdit) {
            PostVisibility newVis = PostVisibility.fromValue(request.visibility());
            PostVisibility oldVis = post.getVisibility();
            boolean isUpgrade = isVisibilityUpgrade(oldVis, newVis);
            if (isUpgrade && !withinWindow) {
                throw new EditWindowExpiredException();
            }
        }

        // Step 6: cross-field validation (qotdId existence; scripture pair).
        if (wantsQotdEdit && !qotdQuestionRepository.existsById(request.qotdId())) {
            throw new InvalidQotdIdException(request.qotdId());
        }
        // For scripture pair on PATCH: if BOTH ref and text in body, both must be set.
        // If ONE is in the body but the other is already set on the post, allow (the
        // user is editing the half-pair — the post stays consistent).
        if (request.scriptureReference() != null && request.scriptureText() == null
                && post.getScriptureText() == null) {
            throw new InvalidScripturePairException();
        }
        if (request.scriptureText() != null && request.scriptureReference() == null
                && post.getScriptureReference() == null) {
            throw new InvalidScripturePairException();
        }

        // Spec 4.7b — help_tags cross-type rejection (after window check, before
        // normalization). Unlike createPost, the postType comes from the existing
        // post (immutable), not the request. Normalization throws on unknown
        // values via HelpTag.fromWireValue → InvalidHelpTagException.
        //
        // Symmetry with createPost: the cross-type check fires only on a
        // non-empty input. An explicit empty Set on a non-prayer_request post
        // is a no-op (the stored value is already "") rather than a 400 — this
        // matches the create-path semantics and the api-error-codes.md contract
        // ("Non-empty helpTags submitted on a non-prayer_request post").
        String newHelpTagsRaw = null;
        if (wantsHelpTagsEdit) {
            Set<String> requestedHelpTags = request.helpTags();
            if (!requestedHelpTags.isEmpty() && post.getPostType() != PostType.PRAYER_REQUEST) {
                throw new HelpTagsNotAllowedForPostTypeException(post.getPostType().value());
            }
            newHelpTagsRaw = normalizeHelpTags(requestedHelpTags);
        }

        // Step 7: sanitize free-text fields if present.
        String sanitizedContent = wantsContentEdit
                ? htmlSanitizerPolicy.sanitize(request.content()).trim()
                : null;
        if (wantsContentEdit) {
            if (sanitizedContent.isEmpty()) throw new EmptyContentException();
            int maxLength = maxContentLengthFor(post.getPostType());
            if (sanitizedContent.length() > maxLength) throw new ContentTooLongException(maxLength);
        }
        String sanitizedAnsweredText = wantsAnsweredTextEdit
                ? htmlSanitizerPolicy.sanitize(request.answeredText()).trim()
                : null;
        String sanitizedScriptureText = request.scriptureText() != null
                ? htmlSanitizerPolicy.sanitize(request.scriptureText()).trim()
                : null;

        // Step 8: crisis re-detection on content change.
        boolean newCrisisFlag = post.isCrisisFlag();
        boolean fireCrisisEvent = false;
        if (wantsContentEdit) {
            boolean detected = PostCrisisDetector.detectsCrisis(sanitizedContent);
            if (detected) {
                // Set flag if not already set; if already set, NO change but listener
                // dedups via the 1h cache so a second event is harmless.
                if (!post.isCrisisFlag()) {
                    newCrisisFlag = true;
                }
                fireCrisisEvent = true;
            }
            // NOTE: crisisFlag NEVER cleared by author edit — once flagged, stays flagged
            // for moderator review (per spec body).
        }

        // Step 9: apply mutations.
        if (wantsContentEdit) post.setContent(sanitizedContent);
        if (wantsCategoryEdit) post.setCategory(request.category());
        if (wantsVisibilityEdit) post.setVisibility(PostVisibility.fromValue(request.visibility()));
        if (wantsChallengeEdit) post.setChallengeId(request.challengeId());
        if (wantsQotdEdit) post.setQotdId(request.qotdId());
        if (request.scriptureReference() != null) post.setScriptureReference(request.scriptureReference());
        if (request.scriptureText() != null) post.setScriptureText(sanitizedScriptureText);
        if (wantsHelpTagsEdit) post.setHelpTagsRaw(newHelpTagsRaw);
        if (newCrisisFlag != post.isCrisisFlag()) post.setCrisisFlag(newCrisisFlag);

        // Special case: is_answered transitions.
        if (wantsAnsweredEdit) {
            boolean wasAnswered = post.isAnswered();
            boolean willBeAnswered = request.isAnswered();
            post.setAnswered(willBeAnswered);
            if (willBeAnswered && !wasAnswered) {
                // false → true
                post.setAnsweredAt(now);
                post.setAnsweredText(sanitizedAnsweredText);  // null if not provided
            } else if (!willBeAnswered && wasAnswered) {
                // true → false
                post.setAnsweredAt(null);
                post.setAnsweredText(null);
            } else if (willBeAnswered && wantsAnsweredTextEdit) {
                // true → true with text update (rare but valid)
                post.setAnsweredText(sanitizedAnsweredText);
            }
        } else if (wantsAnsweredTextEdit && post.isAnswered()) {
            // answeredText edit alone without isAnswered toggle — allowed for already-answered posts.
            post.setAnsweredText(sanitizedAnsweredText);
        }

        // Always bump updated_at on a successful PATCH.
        post.setUpdatedAt(now);

        // Step 10: save.
        Post saved = postRepository.save(post);

        // AFTER_COMMIT crisis event if needed.
        if (fireCrisisEvent) {
            eventPublisher.publishEvent(new CrisisDetectedEvent(saved.getId(), saved.getUserId(), ContentType.POST));
        }

        // Step 11: NO activity recording on edit.

        log.info("postUpdated postId={} userId={} editorId={} crisisFlag={} requestId={}",
                saved.getId(), saved.getUserId(), principal.userId(), saved.isCrisisFlag(), requestId);

        return postMapper.toDto(saved);
    }

    @Transactional
    public void deletePost(UUID postId, AuthenticatedUser principal, String requestId) {
        // Idempotency: if already soft-deleted, short-circuit to success (no error).
        Optional<Post> already = postRepository.findByIdAndIsDeletedTrue(postId);
        if (already.isPresent()) {
            // Confirm it's the user's post or an admin (still apply ownership gate
            // even on idempotent path — a non-author should not get 204 to confirm
            // existence).
            Post deletedPost = already.get();
            if (!deletedPost.getUserId().equals(principal.userId()) && !principal.isAdmin()) {
                throw new PostForbiddenException();
            }
            log.info("postDeleteIdempotent postId={} userId={} requestId={}",
                    postId, principal.userId(), requestId);
            return;
        }

        // Live post lookup.
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(PostNotFoundException::new);

        // Ownership gate.
        if (!post.getUserId().equals(principal.userId()) && !principal.isAdmin()) {
            throw new PostForbiddenException();
        }

        // Apply soft-delete. Content stays. user_id stays.
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        post.setDeleted(true);
        post.setDeletedAt(now);
        post.setUpdatedAt(now);

        postRepository.save(post);

        // NO activity reversal. NO comment cascade (cascade is for hard-delete; soft-delete preserves comments).

        log.info("postDeleted postId={} userId={} deletedBy={} requestId={}",
                postId, post.getUserId(), principal.userId(), requestId);
    }

    /**
     * Spec 4.4 — Mark a comment as the helpful answer to a question post.
     *
     * <p>Author-only (NO admin override per Plan-Time Divergence #1, brief W6).
     * Atomic move: if a different comment was previously helpful, that comment's
     * {@code is_helpful} clears in the same transaction as the new comment's
     * {@code is_helpful} sets. Idempotent — re-marking the same already-helpful
     * comment is a no-op (no DB write, no {@code updated_at} bump).
     *
     * <p>Throws — {@link PostNotFoundException} for missing/soft-deleted post,
     * {@link PostNotAQuestionException} for non-question post, {@link PostForbiddenException}
     * when caller is not the author, {@link PostCommentNotFoundException} for
     * missing/soft-deleted comment, {@link CommentNotForThisPostException} when
     * the comment exists but belongs to a different post, {@link PostsRateLimitException}
     * on rate-limit exhaustion (30/hour per user).
     */
    @Transactional
    public PostDto resolveQuestion(UUID postId, UUID commentId, UUID currentUserId, String requestId) {
        // Step 1: rate-limit (per-user, 30/hour). Throws PostsRateLimitException → 429.
        resolveRateLimitService.checkAndConsume(currentUserId);

        // Step 2: load post (live only — soft-deleted → 404).
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(PostNotFoundException::new);

        // Step 3: post type gate.
        if (post.getPostType() != PostType.QUESTION) {
            throw new PostNotAQuestionException();
        }

        // Step 4: ownership gate (strict author-only — NO admin override per Plan-Time Divergence #1).
        if (!post.getUserId().equals(currentUserId)) {
            throw new PostForbiddenException();
        }

        // Step 5: load + validate comment (must belong to this post AND not be soft-deleted).
        PostComment newComment = commentRepository
                .findByIdAndPostIdAndIsDeletedFalse(commentId, postId)
                .orElseGet(() -> {
                    // Distinguish "wrong post" from "doesn't exist" for cleaner error responses.
                    if (commentRepository.findByIdAndIsDeletedFalse(commentId).isPresent()) {
                        throw new CommentNotForThisPostException();
                    }
                    throw new PostCommentNotFoundException();
                });

        // Step 6: idempotency check (D9). Same comment already helpful → no-op (no DB write,
        // no updated_at bump).
        UUID priorResolvedId = post.getQuestionResolvedCommentId();
        if (newComment.isHelpful() && commentId.equals(priorResolvedId)) {
            log.info("questionResolveIdempotent postId={} userId={} commentId={} requestId={}",
                    postId, currentUserId, commentId, requestId);
            return postMapper.toDto(post);
        }

        // Step 7: atomic move (D10) — within @Transactional, single rollback boundary.
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (priorResolvedId != null && !priorResolvedId.equals(commentId)) {
            commentRepository.findByIdAndIsDeletedFalse(priorResolvedId).ifPresent(old -> {
                old.setHelpful(false);
                old.setUpdatedAt(now);
                commentRepository.save(old);
            });
        }

        newComment.setHelpful(true);
        newComment.setUpdatedAt(now);
        commentRepository.save(newComment);

        post.setQuestionResolvedCommentId(commentId);
        post.setUpdatedAt(now);
        Post saved = postRepository.save(post);

        log.info("questionResolved postId={} userId={} commentId={} priorResolvedId={} requestId={}",
                postId, currentUserId, commentId, priorResolvedId, requestId);

        return postMapper.toDto(saved);
    }

    private static boolean isVisibilityUpgrade(PostVisibility from, PostVisibility to) {
        // Order: private (most restrictive) < friends < public (least restrictive).
        int fromOrder = visibilityOrder(from);
        int toOrder = visibilityOrder(to);
        return toOrder > fromOrder;
    }

    private static int visibilityOrder(PostVisibility v) {
        return switch (v) {
            case PRIVATE -> 0;
            case FRIENDS -> 1;
            case PUBLIC -> 2;
        };
    }

    private static int maxContentLengthFor(PostType postType) {
        return switch (postType) {
            case TESTIMONY -> 5000;
            case ENCOURAGEMENT -> 280;
            case PRAYER_REQUEST, QUESTION, DISCUSSION -> 2000;
        };
    }

    private static Sort sortFor(SortKey key) {
        return switch (key) {
            case BUMPED -> Sort.by(Sort.Direction.DESC, "lastActivityAt");
            case RECENT -> Sort.by(Sort.Direction.DESC, "createdAt");
            case ANSWERED -> Sort.by(Sort.Direction.DESC, "answeredAt");
        };
    }

    /**
     * Spec 4.7b — Validate, dedupe, sort, and serialize a help_tags input.
     *
     * <p>Rules:
     * <ul>
     *   <li>null or empty input → empty string ("").</li>
     *   <li>Each non-blank value parsed via {@link HelpTag#fromWireValue} (throws on unknown).</li>
     *   <li>Whitespace-only entries silently filtered (D4).</li>
     *   <li>Duplicates silently deduped via Set semantics (D4).</li>
     *   <li>Output sorted in canonical order (D3) and joined with comma.</li>
     * </ul>
     */
    private static String normalizeHelpTags(Set<String> input) {
        if (input == null || input.isEmpty()) return "";
        Set<HelpTag> parsed = new TreeSet<>(HelpTag.CANONICAL_ORDER);
        for (String raw : input) {
            if (raw == null) continue;
            String trimmed = raw.trim();
            if (trimmed.isEmpty()) continue;
            parsed.add(HelpTag.fromWireValue(trimmed));  // throws InvalidHelpTagException on unknown
        }
        return parsed.stream()
                .map(HelpTag::wireValue)
                .collect(Collectors.joining(","));
    }

    private static PostListMeta buildMeta(int page, int limit, long totalCount, String requestId) {
        int totalPages = totalCount == 0 ? 0 : (int) Math.ceil((double) totalCount / limit);
        boolean hasNext = page < totalPages;
        boolean hasPrev = page > 1 && totalPages > 0;
        return new PostListMeta(page, limit, totalCount, totalPages, hasNext, hasPrev, requestId);
    }

    public enum SortKey {
        BUMPED, RECENT, ANSWERED;

        public static SortKey parse(String raw, SortKey defaultValue) {
            if (raw == null || raw.isBlank()) {
                return defaultValue;
            }
            return switch (raw.toLowerCase()) {
                case "bumped" -> BUMPED;
                case "recent" -> RECENT;
                case "answered" -> ANSWERED;
                default -> throw new InvalidSortException(raw);
            };
        }
    }
}
