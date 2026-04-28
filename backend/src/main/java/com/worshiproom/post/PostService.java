package com.worshiproom.post;

import com.worshiproom.post.dto.PostDto;
import com.worshiproom.post.dto.PostListMeta;
import com.worshiproom.post.dto.PostListResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Read-only orchestration for the three Spec 3.3 endpoints. Composes
 * {@link PostSpecifications} building blocks, drives Spring Data pagination,
 * and invokes {@link PostMapper}.
 *
 * <p>Mute filter is applied to feed and author-posts reads but NOT to
 * single-post {@link #getById(UUID, UUID)} (Spec 3.3 Divergence 1 — direct
 * ID lookups bypass discovery filters).
 */
@Service
@Transactional(readOnly = true)
public class PostService {

    private final PostRepository postRepository;
    private final PostMapper postMapper;
    private final UserResolverService userResolverService;

    public PostService(PostRepository postRepository,
                       PostMapper postMapper,
                       UserResolverService userResolverService) {
        this.postRepository = postRepository;
        this.postMapper = postMapper;
        this.userResolverService = userResolverService;
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
