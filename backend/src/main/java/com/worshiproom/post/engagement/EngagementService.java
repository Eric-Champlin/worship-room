package com.worshiproom.post.engagement;

import com.worshiproom.post.Post;
import com.worshiproom.post.PostMapper;
import com.worshiproom.post.dto.PostDto;
import com.worshiproom.post.dto.PostListMeta;
import com.worshiproom.post.dto.PostListResponse;
import com.worshiproom.post.engagement.dto.PerPostReaction;
import com.worshiproom.post.engagement.dto.ReactionsResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Read-only orchestration for {@code /users/me/reactions} and
 * {@code /users/me/bookmarks}.
 *
 * <p>Reactions map: unions praying-reactions + bookmarks rows for the viewer
 * into a flat {@code Map<postId, PerPostReaction>}. No visibility filtering
 * (Spec 3.4 § Reactions endpoint — reflects viewer's own engagement
 * history; frontend filters via post-list join at render time).
 *
 * <p>Bookmarks listing: delegates to {@link BookmarkRepositoryCustom} which
 * composes {@code PostSpecifications.visibleTo()} +
 * {@code notMutedBy()} + bookmark JOIN sorted by {@code pb.created_at DESC}.
 */
@Service
@Transactional(readOnly = true)
public class EngagementService {

    private static final String PRAYING = "praying";

    private final ReactionRepository reactionRepository;
    private final BookmarkRepository bookmarkRepository;
    private final PostMapper postMapper;

    public EngagementService(ReactionRepository reactionRepository,
                             BookmarkRepository bookmarkRepository,
                             PostMapper postMapper) {
        this.reactionRepository = reactionRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.postMapper = postMapper;
    }

    public ReactionsResponse reactionsFor(UUID viewerId) {
        List<PostReaction> prayings = reactionRepository.findByUserIdAndReactionType(viewerId, PRAYING);
        List<PostBookmark> bookmarks = bookmarkRepository.findByUserId(viewerId);

        Map<UUID, PerPostReactionMutable> accum = new HashMap<>();
        for (PostReaction r : prayings) {
            accum.computeIfAbsent(r.getPostId(), k -> new PerPostReactionMutable()).isPraying = true;
        }
        for (PostBookmark b : bookmarks) {
            accum.computeIfAbsent(b.getPostId(), k -> new PerPostReactionMutable()).isBookmarked = true;
        }

        Map<UUID, PerPostReaction> finalMap = new HashMap<>(accum.size());
        accum.forEach((postId, m) -> finalMap.put(postId, new PerPostReaction(m.isPraying, m.isBookmarked)));
        return new ReactionsResponse(finalMap);
    }

    public PostListResponse listBookmarks(UUID viewerId, int page, int limit, String requestId) {
        Pageable pageable = PageRequest.of(page - 1, limit);
        Page<Post> bookmarkedPage = bookmarkRepository.findVisibleBookmarkedPosts(viewerId, pageable);
        List<PostDto> dtos = postMapper.toDtoList(bookmarkedPage.getContent());
        PostListMeta meta = buildMeta(page, limit, bookmarkedPage.getTotalElements(), requestId);
        return new PostListResponse(dtos, meta);
    }

    private static PostListMeta buildMeta(int page, int limit, long totalCount, String requestId) {
        int totalPages = totalCount == 0 ? 0 : (int) Math.ceil((double) totalCount / limit);
        boolean hasNext = page < totalPages;
        boolean hasPrev = page > 1 && totalPages > 0;
        return new PostListMeta(page, limit, totalCount, totalPages, hasNext, hasPrev, requestId);
    }

    private static final class PerPostReactionMutable {
        boolean isPraying;
        boolean isBookmarked;
    }
}
