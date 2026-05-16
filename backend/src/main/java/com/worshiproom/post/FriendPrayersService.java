package com.worshiproom.post;

import com.worshiproom.post.dto.PostDto;
import com.worshiproom.post.dto.PostListMeta;
import com.worshiproom.post.dto.PostListResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Spec 7.4 — Daily Hub Pray tab friend surfacing.
 *
 * <p>Returns up to 3 most-recent posts from the viewer's active friends
 * created in the last 24 hours that the viewer has NOT completed a Quick
 * Lift session for. Composes the canonical visibility + mute predicates with
 * three Spec 7.4-specific predicates (see {@link PostSpecifications}).
 *
 * <p>Crisis-flagged posts are INCLUDED in the result — the frontend
 * FriendPrayersCard suppresses the prayingCount display and the Quick Lift
 * button per the standard crisis-suppression UI inheritance (Spec 6.4
 * pattern). Per {@code .claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md}, no LLM
 * is invoked anywhere in this code path — the surface is pure-read + Quick
 * Lift trigger.
 *
 * <p>Read-only; {@link Transactional#readOnly()} matches the canonical
 * read service pattern (no write boundary beyond the default fetch).
 */
@Service
@Transactional(readOnly = true)
public class FriendPrayersService {

    private static final Logger log = LoggerFactory.getLogger(FriendPrayersService.class);
    private static final int MAX_POSTS = 3;

    private final PostRepository postRepository;
    private final PostMapper postMapper;

    public FriendPrayersService(PostRepository postRepository, PostMapper postMapper) {
        this.postRepository = postRepository;
        this.postMapper = postMapper;
    }

    public PostListResponse listFriendPrayersToday(UUID viewerId, String requestId) {
        Specification<Post> spec = PostSpecifications.visibleTo(viewerId)
                .and(PostSpecifications.notMutedBy(viewerId))
                .and(PostSpecifications.byActiveFriendsOf(viewerId))
                .and(PostSpecifications.createdInLast24h())
                .and(PostSpecifications.notCompletedQuickLiftBy(viewerId));

        Pageable pageable = PageRequest.of(0, MAX_POSTS,
                Sort.by(Sort.Direction.DESC, "createdAt"));
        List<Post> posts = postRepository.findAll(spec, pageable).getContent();
        List<PostDto> dtos = postMapper.toDtoList(posts);

        log.info("friendPrayersToday viewerId={} returnedCount={} requestId={}",
                viewerId, dtos.size(), requestId);

        return new PostListResponse(dtos, buildMeta(dtos.size(), requestId));
    }

    private static PostListMeta buildMeta(int count, String requestId) {
        // Fixed pagination shape: page=1, limit=3, totalCount=actual returned
        // count, totalPages=1, no next/prev. The endpoint is not paginated —
        // it always returns the top 3 most-recent eligible posts.
        return new PostListMeta(1, MAX_POSTS, count, 1, false, false, requestId);
    }
}
