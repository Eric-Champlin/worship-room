package com.worshiproom.post.comment;

import com.worshiproom.activity.ActivityService;
import com.worshiproom.activity.ActivityType;
import com.worshiproom.activity.dto.ActivityRequest;
import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.post.EmptyPatchBodyException;
import com.worshiproom.post.ModerationStatus;
import com.worshiproom.post.Post;
import com.worshiproom.post.PostNotFoundException;
import com.worshiproom.post.PostRepository;
import com.worshiproom.post.PostSpecifications;
import com.worshiproom.post.PostType;
import com.worshiproom.post.comment.dto.CommentDto;
import com.worshiproom.post.comment.dto.CommentListResponse;
import com.worshiproom.post.comment.dto.CreateCommentRequest;
import com.worshiproom.post.comment.dto.CreateCommentResponse;
import com.worshiproom.post.comment.dto.UpdateCommentRequest;
import com.worshiproom.post.dto.AuthorDto;
import com.worshiproom.post.dto.PostListMeta;
import com.worshiproom.safety.CommentCrisisDetector;
import com.worshiproom.safety.ContentType;
import com.worshiproom.safety.CrisisDetectedEvent;
import com.worshiproom.safety.CrisisResources;
import com.worshiproom.user.DisplayNameResolver;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import jakarta.annotation.Nullable;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Read + write orchestration for prayer-wall comments.
 *
 * <p>Read path (Spec 3.4): {@link #listForPost} — pre-checks parent post visibility
 * and batch-loads replies to avoid N+1.
 *
 * <p>Write paths (Spec 3.6): {@link #createComment}, {@link #updateComment},
 * {@link #deleteComment}. Class-level {@code @Transactional(readOnly = true)} is
 * the default; write methods explicitly override with {@code @Transactional}.
 */
@Service
@Transactional(readOnly = true)
public class PostCommentService {

    private static final Logger log = LoggerFactory.getLogger(PostCommentService.class);

    private static final Set<ModerationStatus> VISIBLE_STATUSES =
            Set.of(ModerationStatus.APPROVED, ModerationStatus.FLAGGED);

    private static final int CONTENT_MAX_LENGTH = 5000;
    private static final String INTERCESSION_SOURCE_FEATURE = "prayer-wall-comment";

    private final PostRepository postRepository;
    private final PostCommentRepository commentRepository;
    private final PostCommentMapper commentMapper;
    private final CommentsRateLimitService rateLimitService;
    private final CommentsIdempotencyService idempotencyService;
    private final ApplicationEventPublisher eventPublisher;
    private final ActivityService activityService;
    private final UserRepository userRepository;
    private final PolicyFactory htmlSanitizerPolicy;
    private final CommentsRateLimitConfig config;
    private final EntityManager entityManager;

    public PostCommentService(PostRepository postRepository,
                              PostCommentRepository commentRepository,
                              PostCommentMapper commentMapper,
                              CommentsRateLimitService rateLimitService,
                              CommentsIdempotencyService idempotencyService,
                              ApplicationEventPublisher eventPublisher,
                              ActivityService activityService,
                              UserRepository userRepository,
                              PolicyFactory htmlSanitizerPolicy,
                              CommentsRateLimitConfig config,
                              EntityManager entityManager) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.commentMapper = commentMapper;
        this.rateLimitService = rateLimitService;
        this.idempotencyService = idempotencyService;
        this.eventPublisher = eventPublisher;
        this.activityService = activityService;
        this.userRepository = userRepository;
        this.htmlSanitizerPolicy = htmlSanitizerPolicy;
        this.config = config;
        this.entityManager = entityManager;
    }

    // ─── READ ──────────────────────────────────────────────────────────────────

    public CommentListResponse listForPost(UUID postId, @Nullable UUID viewerId,
                                           int page, int limit, String requestId) {
        Specification<Post> postVisible = PostSpecifications.visibleTo(viewerId)
                .and((root, query, cb) -> cb.equal(root.get("id"), postId));
        if (postRepository.findOne(postVisible).isEmpty()) {
            throw new PostNotFoundException();
        }

        Pageable pageable = PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.ASC, "createdAt"));
        Page<PostComment> topLevelPage = commentRepository
                .findByPostIdAndParentCommentIdIsNullAndIsDeletedFalseAndModerationStatusIn(
                        postId, VISIBLE_STATUSES, pageable);

        List<UUID> parentIds = topLevelPage.getContent().stream()
                .map(PostComment::getId)
                .toList();
        Map<UUID, List<PostComment>> repliesByParent;
        if (parentIds.isEmpty()) {
            repliesByParent = Map.of();
        } else {
            List<PostComment> replies = commentRepository
                    .findByParentCommentIdInAndIsDeletedFalseAndModerationStatusInOrderByCreatedAtAsc(
                            parentIds, VISIBLE_STATUSES);
            repliesByParent = replies.stream()
                    .collect(Collectors.groupingBy(PostComment::getParentCommentId));
        }

        List<CommentDto> dtos = commentMapper.toDtoList(topLevelPage.getContent(), repliesByParent);
        PostListMeta meta = buildMeta(page, limit, topLevelPage.getTotalElements(), requestId);
        return new CommentListResponse(dtos, meta);
    }

    private static PostListMeta buildMeta(int page, int limit, long totalCount, String requestId) {
        int totalPages = totalCount == 0 ? 0 : (int) Math.ceil((double) totalCount / limit);
        boolean hasNext = page < totalPages;
        boolean hasPrev = page > 1 && totalPages > 0;
        return new PostListMeta(page, limit, totalCount, totalPages, hasNext, hasPrev, requestId);
    }

    // ─── CREATE (Spec 3.6) ─────────────────────────────────────────────────────

    @Transactional
    public CreateCommentResponse createComment(
            UUID postId,
            UUID authorId,
            CreateCommentRequest request,
            @Nullable String idempotencyKey,
            String requestId
    ) {
        // 1. Idempotency lookup BEFORE rate limit (replay must not consume tokens).
        int bodyHash = request.hashCode();
        Optional<CreateCommentResponse> cached = idempotencyService.lookup(authorId, idempotencyKey, bodyHash);
        if (cached.isPresent()) {
            return cached.get();
        }

        // 2. Rate limit BEFORE DB work.
        rateLimitService.checkAndConsume(authorId);

        // 3. Parent post existence — live posts only (soft-deleted = 404).
        Post parentPost = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(PostNotFoundException::new);

        // 3a. Per-type comment policy (Spec 4.6 — encouragement disallows comments).
        // Reject BEFORE parent-comment validation so a reply with parentCommentId
        // on an encouragement returns COMMENTS_NOT_ALLOWED, never INVALID_PARENT_COMMENT.
        if (parentPost.getPostType() == PostType.ENCOURAGEMENT) {
            throw new CommentsNotAllowedException();
        }

        // 4. Parent comment validation (if threaded reply).
        if (request.parentCommentId() != null) {
            commentRepository.findByIdAndPostIdAndIsDeletedFalse(request.parentCommentId(), postId)
                    .orElseThrow(InvalidParentCommentException::new);
            // The query enforces parent.postId == url.postId AND parent.isDeleted == false.
        }

        // 5. Sanitize content. OWASP strips all HTML; trim() removes whitespace.
        String sanitizedContent = htmlSanitizerPolicy.sanitize(request.content()).trim();
        if (sanitizedContent.isEmpty()) {
            throw new EmptyCommentContentException();
        }
        if (sanitizedContent.length() > CONTENT_MAX_LENGTH) {
            throw new CommentContentTooLongException();
        }

        // 6. Crisis detect on sanitized content.
        boolean crisisFlag = CommentCrisisDetector.detectsCrisis(sanitizedContent);

        // 7. Build entity, save, flush, refresh (L1-cache trap for DB-DEFAULT timestamps).
        PostComment comment = new PostComment();
        comment.setId(UUID.randomUUID());
        comment.setPostId(postId);
        comment.setUserId(authorId);
        comment.setParentCommentId(request.parentCommentId());
        comment.setContent(sanitizedContent);
        comment.setHelpful(false);
        comment.setDeleted(false);
        comment.setDeletedAt(null);
        comment.setModerationStatus(ModerationStatus.APPROVED);
        comment.setCrisisFlag(crisisFlag);
        // created_at, updated_at populated by DB DEFAULT NOW() (insertable=false on column).
        PostComment saved = commentRepository.save(comment);
        commentRepository.flush();
        // findById alone returns the L1-cached managed entity unchanged. refresh() forces
        // a re-read from the DB so the response includes created_at and updated_at.
        entityManager.refresh(saved);

        // 8. SQL-side counter + last_activity_at increment on parent post (atomic).
        int rowsAffected = postRepository.incrementCommentCountAndBumpLastActivity(postId);
        if (rowsAffected != 1) {
            // TOCTOU: the parent post disappeared between step 3 and step 8. Surface loudly.
            throw new IllegalStateException(
                    "Comment count update affected " + rowsAffected + " rows for postId=" + postId);
        }

        // 9. Activity engine inside same @Transactional.
        activityService.recordActivity(
                authorId,
                new ActivityRequest(ActivityType.INTERCESSION, INTERCESSION_SOURCE_FEATURE, null)
        );

        // 10. Resolve author for response.
        AuthorDto author = resolveAuthor(authorId);

        // 11. Build response.
        CommentDto dto = commentMapper.toDto(saved, author);
        CreateCommentResponse response = crisisFlag
                ? CreateCommentResponse.withCrisisResources(dto, CrisisResources.buildBlock(), requestId)
                : CreateCommentResponse.normal(dto, requestId);

        // 12. Publish crisis event (AFTER_COMMIT — listener fires after this txn commits).
        if (crisisFlag) {
            eventPublisher.publishEvent(
                    new CrisisDetectedEvent(saved.getId(), authorId, ContentType.COMMENT));
        }

        // 13. Idempotency cache store.
        idempotencyService.store(authorId, idempotencyKey, bodyHash, response);

        // 14. Structured log INFO — IDs only, no content.
        log.info("commentCreated commentId={} postId={} userId={} parentCommentId={} crisisFlag={} requestId={}",
                saved.getId(), postId, authorId, request.parentCommentId(), crisisFlag, requestId);

        return response;
    }

    // ─── UPDATE (Spec 3.6) ─────────────────────────────────────────────────────

    @Transactional
    public CommentDto updateComment(
            UUID commentId,
            AuthenticatedUser principal,
            UpdateCommentRequest request,
            String requestId
    ) {
        if (request.isEmpty()) {
            throw new EmptyPatchBodyException();
        }

        // 1. Lookup live comment (soft-deleted = 404).
        PostComment comment = commentRepository.findByIdAndIsDeletedFalse(commentId)
                .orElseThrow(PostCommentNotFoundException::new);

        // 2. Author or admin gate.
        boolean isAuthor = comment.getUserId().equals(principal.userId());
        if (!isAuthor && !principal.isAdmin()) {
            throw new CommentForbiddenException();
        }

        // 3. Edit-window check (5 min from creation).
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        boolean withinWindow = !now.isAfter(
                comment.getCreatedAt().plusMinutes(config.getEditWindowMinutes()));
        if (!withinWindow) {
            throw new CommentEditWindowExpiredException();
        }

        // 4. Sanitize new content.
        String sanitizedContent = htmlSanitizerPolicy.sanitize(request.content()).trim();
        if (sanitizedContent.isEmpty()) {
            throw new EmptyCommentContentException();
        }
        if (sanitizedContent.length() > CONTENT_MAX_LENGTH) {
            throw new CommentContentTooLongException();
        }

        // 5. Crisis re-detection. If newly detected, set flag and publish event.
        //    Crisis flag is NEVER cleared by author edit (moderator-only clear).
        boolean fireCrisisEvent = false;
        if (CommentCrisisDetector.detectsCrisis(sanitizedContent)) {
            if (!comment.isCrisisFlag()) {
                comment.setCrisisFlag(true);
            }
            fireCrisisEvent = true;
        }

        // 6. Apply mutation.
        comment.setContent(sanitizedContent);
        comment.setUpdatedAt(now);
        PostComment saved = commentRepository.save(comment);

        // 7. NO last_activity_at bump on PATCH (Watch-For #15).
        // 8. NO activity recording on edit (mirrors PostService).

        // 9. AFTER_COMMIT crisis event if needed.
        if (fireCrisisEvent) {
            eventPublisher.publishEvent(
                    new CrisisDetectedEvent(saved.getId(), saved.getUserId(), ContentType.COMMENT));
        }

        // 10. Resolve author + map.
        AuthorDto author = resolveAuthor(saved.getUserId());

        log.info("commentUpdated commentId={} userId={} editorId={} crisisFlag={} requestId={}",
                saved.getId(), saved.getUserId(), principal.userId(), saved.isCrisisFlag(), requestId);

        return commentMapper.toDto(saved, author);
    }

    // ─── DELETE (Spec 3.6) ─────────────────────────────────────────────────────

    @Transactional
    public void deleteComment(UUID commentId, AuthenticatedUser principal, String requestId) {
        // 1. Idempotency: if already soft-deleted, ownership check + 204.
        Optional<PostComment> already = commentRepository.findByIdAndIsDeletedTrue(commentId);
        if (already.isPresent()) {
            PostComment deletedComment = already.get();
            if (!deletedComment.getUserId().equals(principal.userId()) && !principal.isAdmin()) {
                throw new CommentForbiddenException();  // Spec D8 — 403, not 404.
            }
            log.info("commentDeleteIdempotent commentId={} userId={} requestId={}",
                    commentId, principal.userId(), requestId);
            return;
        }

        // 2. Live lookup.
        PostComment comment = commentRepository.findByIdAndIsDeletedFalse(commentId)
                .orElseThrow(PostCommentNotFoundException::new);

        // 3. Ownership gate.
        if (!comment.getUserId().equals(principal.userId()) && !principal.isAdmin()) {
            throw new CommentForbiddenException();
        }

        // 4. Apply soft-delete. Content stays. user_id stays. Replies stay (no cascade).
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        comment.setDeleted(true);
        comment.setDeletedAt(now);
        comment.setUpdatedAt(now);
        commentRepository.save(comment);

        // 5. SQL-side counter decrement with > 0 guard (Spec D9).
        // We deliberately do NOT assert rowsAffected==1 here — under any race, the
        // > 0 guard correctly produces 0 rows affected and we treat that as
        // "counter already at floor, no-op". Any negative drift would be a bug.
        postRepository.decrementCommentCount(comment.getPostId());

        // 6. NO last_activity_at bump on DELETE (Watch-For #15).
        // 7. NO cascade to replies (Watch-For #22).
        // 8. NO activity reversal (no negative-activity rows).

        log.info("commentDeleted commentId={} postId={} userId={} deletedBy={} requestId={}",
                commentId, comment.getPostId(), comment.getUserId(), principal.userId(), requestId);
    }

    // ─── helpers ───────────────────────────────────────────────────────────────

    private AuthorDto resolveAuthor(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException(
                        "Comment references missing user " + userId));
        return new AuthorDto(user.getId(), DisplayNameResolver.resolve(user), user.getAvatarUrl());
    }
}
