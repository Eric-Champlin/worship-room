package com.worshiproom.post.comment;

import com.worshiproom.post.ModerationStatus;
import com.worshiproom.post.Post;
import com.worshiproom.post.PostNotFoundException;
import com.worshiproom.post.PostRepository;
import com.worshiproom.post.PostSpecifications;
import com.worshiproom.post.comment.dto.CommentDto;
import com.worshiproom.post.comment.dto.CommentListResponse;
import com.worshiproom.post.dto.PostListMeta;
import jakarta.annotation.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Read-only orchestration for {@code GET /api/v1/posts/{id}/comments}.
 *
 * <p>Pre-checks parent post visibility (Spec 3.4 Watch-For #10) and
 * batch-loads replies to avoid N+1 (Spec 3.4 Watch-For #8). Mute filter
 * is NOT applied to comment threads — comments are not discovery-scoped
 * (consistent with {@code PostService.getById} per Spec 3.3 Divergence 1).
 */
@Service
@Transactional(readOnly = true)
public class PostCommentService {

    private static final Set<ModerationStatus> VISIBLE_STATUSES =
            Set.of(ModerationStatus.APPROVED, ModerationStatus.FLAGGED);

    private final PostRepository postRepository;
    private final PostCommentRepository commentRepository;
    private final PostCommentMapper commentMapper;

    public PostCommentService(PostRepository postRepository,
                              PostCommentRepository commentRepository,
                              PostCommentMapper commentMapper) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.commentMapper = commentMapper;
    }

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
}
