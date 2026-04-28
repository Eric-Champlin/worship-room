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
import com.worshiproom.safety.ContentType;
import com.worshiproom.safety.CrisisDetectedEvent;
import com.worshiproom.safety.CrisisResources;
import com.worshiproom.safety.PostCrisisDetector;
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
import java.util.UUID;

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
                       EntityManager entityManager) {
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
                .and(PostSpecifications.byQotdId(qotdId));
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
                .and(PostSpecifications.byAuthor(authorId.get()));
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

        // Step 5: HTML sanitization.
        String sanitizedContent = htmlSanitizerPolicy.sanitize(request.content()).trim();
        if (sanitizedContent.isEmpty()) {
            throw new EmptyContentException();
        }
        if (sanitizedContent.length() > 2000) {
            // After sanitization, the post-strip content may still be over 2000 if
            // the user pasted hand-crafted HTML that survived the policy (unlikely
            // but possible). Re-validate.
            throw new ContentTooLongException();
        }
        String sanitizedScriptureText = scriptureTextPresent
                ? htmlSanitizerPolicy.sanitize(request.scriptureText()).trim()
                : null;

        // Step 6: crisis detection.
        boolean crisisFlag = PostCrisisDetector.detectsCrisis(sanitizedContent);

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

        boolean nonExemptEditRequested =
                wantsContentEdit || wantsCategoryEdit || wantsQotdEdit
                || wantsChallengeEdit || wantsScriptureEdit;

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

        // Step 7: sanitize free-text fields if present.
        String sanitizedContent = wantsContentEdit
                ? htmlSanitizerPolicy.sanitize(request.content()).trim()
                : null;
        if (wantsContentEdit) {
            if (sanitizedContent.isEmpty()) throw new EmptyContentException();
            if (sanitizedContent.length() > 2000) throw new ContentTooLongException();
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

    private static Sort sortFor(SortKey key) {
        return switch (key) {
            case BUMPED -> Sort.by(Sort.Direction.DESC, "lastActivityAt");
            case RECENT -> Sort.by(Sort.Direction.DESC, "createdAt");
            case ANSWERED -> Sort.by(Sort.Direction.DESC, "answeredAt");
        };
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
