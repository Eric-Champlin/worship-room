package com.worshiproom.post.engagement;

import com.worshiproom.post.Post;
import com.worshiproom.post.PostNotFoundException;
import com.worshiproom.post.PostRepository;
import com.worshiproom.post.PostSpecifications;
import com.worshiproom.post.engagement.dto.BookmarkResponse;
import jakarta.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Spec 3.7 — bookmark write paths on {@code /api/v1/posts/{id}/bookmark}.
 *
 * <p>POST is idempotent. Returns {@code created=true} (201) if a row was
 * actually inserted, {@code created=false} (200) if the row already existed.
 *
 * <p>DELETE is idempotent. Caller doesn't see whether a row existed —
 * 204 either way.
 *
 * <p>Bookmarks NEVER fire activity events (Spec 3.7 D3, Watch-For #13).
 * NO {@code last_activity_at} bump (R9).
 */
@Service
@Transactional(readOnly = true)
public class BookmarkWriteService {

    private static final Logger log = LoggerFactory.getLogger(BookmarkWriteService.class);

    private final PostRepository postRepository;
    private final BookmarkRepository bookmarkRepository;
    private final BookmarksRateLimitService rateLimitService;

    public BookmarkWriteService(PostRepository postRepository,
                                BookmarkRepository bookmarkRepository,
                                BookmarksRateLimitService rateLimitService) {
        this.postRepository = postRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.rateLimitService = rateLimitService;
    }

    /**
     * Add a bookmark. Returns {@code (response, true)} if newly inserted,
     * {@code (response, false)} if already bookmarked. Controller maps
     * {@code created} to HTTP status 201 vs 200.
     */
    public record AddResult(BookmarkResponse response, boolean created) {}

    @Transactional
    public AddResult add(UUID postId, UUID userId, String requestId) {
        rateLimitService.checkAndConsume(userId);

        loadVisiblePost(postId, userId);

        boolean exists = bookmarkRepository.existsByPostIdAndUserId(postId, userId);
        boolean created;
        if (exists) {
            created = false;
        } else {
            bookmarkRepository.save(new PostBookmark(postId, userId));
            postRepository.incrementBookmarkCount(postId);
            created = true;
        }

        Post refreshed = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalStateException(
                        "Post disappeared mid-transaction postId=" + postId));

        log.info("bookmarkAdded postId={} userId={} created={} requestId={}",
                postId, userId, created, requestId);

        return new AddResult(
                new BookmarkResponse(true, refreshed.getBookmarkCount()),
                created
        );
    }

    @Transactional
    public void remove(UUID postId, UUID userId, String requestId) {
        rateLimitService.checkAndConsume(userId);

        loadVisiblePost(postId, userId);

        int deleted = bookmarkRepository.deleteByPostIdAndUserId(postId, userId);
        if (deleted == 1) {
            postRepository.decrementBookmarkCount(postId);
        }

        log.info("bookmarkRemoved postId={} userId={} deleted={} requestId={}",
                postId, userId, deleted, requestId);
    }

    private Post loadVisiblePost(UUID postId, @Nullable UUID viewerId) {
        Specification<Post> spec = PostSpecifications.visibleTo(viewerId)
                .and((root, query, cb) -> cb.equal(root.get("id"), postId));
        return postRepository.findOne(spec)
                .orElseThrow(PostNotFoundException::new);
    }
}
