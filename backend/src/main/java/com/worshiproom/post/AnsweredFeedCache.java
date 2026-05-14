package com.worshiproom.post;

import jakarta.annotation.Nullable;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

/**
 * Spec 6.6b — Redis cache layer for the Answered Wall feed.
 *
 * <p>Architecture: <b>viewer-agnostic cache key BELOW per-viewer enrichment</b>
 * (ED-5 Option (b) per Eric's plan-time sign-off 2026-05-14). The cache stores
 * ONLY the public-visibility Answered Wall feed rows; per-viewer enrichment
 * ({@code intercessorSummary} + per-viewer reaction state) is computed
 * per-request on top of the cached rows by {@link PostService#listFeed}.
 *
 * <p><b>Visibility scope</b> (b-simple): cached layer uses
 * {@link PostSpecifications#visibleTo(java.util.UUID) visibleTo(null)}, which
 * yields only PUBLIC answered posts. Friends-only and private answered posts
 * do not appear on the Answered Wall cached path. Trade-off acknowledged:
 * Answered Wall is a community celebration surface; intended-public is the
 * default for testimonies on the wall. A future spec can add per-viewer
 * augmentation (merge cached public posts with viewer-personalized
 * friends-visible / private-own additions) if the trade-off proves wrong.
 *
 * <p><b>Mute filter</b>: skipped on the Answered Wall feed. Mutes are a
 * scroll-feed UX concern (main feed); on a small celebration surface a viewer
 * encountering an answered prayer by someone they've muted is the rare case,
 * and the alternative (in-memory mute filtering on cached pages) causes
 * pagination wobble (page 1 might show 18 instead of 20 if 2 are muted).
 * Documented intentional drift from the main feed's mute behavior.
 *
 * <p><b>Cache key</b>: {@code Objects.hash(category, postType, qotdId, page, limit)}.
 * The cache method takes all four filter dimensions even though
 * {@code postType} and {@code qotdId} are not used by the Answered Wall today
 * — including them in the key future-proofs against a callsite passing them
 * and prevents accidental cross-filter cache hits.
 *
 * <p><b>TTL</b>: 2 min via {@code spring.cache.redis.time-to-live.answered-feed=2m}.
 * Eviction on {@code isAnswered} transitions and answered_text edits via
 * {@code @CacheEvict(value = "answered-feed", allEntries = true)} on
 * {@link PostService#updatePost}.
 *
 * <p><b>Why a separate Spring bean</b> (not a private method on PostService):
 * Spring's {@code @Cacheable} works via AOP proxy. Self-invocation
 * ({@code this.method()}) bypasses the proxy and the cache. Putting the
 * cached method on a separate bean and injecting it ensures the call goes
 * through the proxy.
 *
 * <p><b>Why a {@link CachedAnsweredFeed} wrapper record</b>: Spring's default
 * Jackson-based Redis serializer can't reconstruct {@code PageImpl} without
 * explicit type info. A simple record with a {@code List<Post>} and a
 * {@code long} total serializes cleanly. (Post itself is a POJO-style
 * {@code @Entity} with no lazy associations — only {@code @Column} fields
 * with primitive/value types — so it serializes cleanly too.)
 */
@Service
@Transactional(readOnly = true)
public class AnsweredFeedCache {

    private final PostRepository postRepository;

    public AnsweredFeedCache(PostRepository postRepository) {
        this.postRepository = postRepository;
    }

    /**
     * Load the public-visibility Answered Wall feed page from the cache (or
     * the DB if absent). The cache key intentionally excludes the viewer —
     * see class JavaDoc.
     *
     * <p>The {@code @Cacheable} key SpEL must reference parameter names; the
     * compiler must be invoked with {@code -parameters} (Spring Boot's
     * default Maven config does this). If a future Maven config change
     * strips parameter names, the key falls back to positional indices and
     * the cache hits/misses become unpredictable — covered by
     * {@code AnsweredFeedCacheTest} which asserts a second identical call
     * returns the same instance.
     */
    @Cacheable(value = "answered-feed",
               key = "T(java.util.Objects).hash(#category, #postType, #qotdId, #page, #limit)")
    public CachedAnsweredFeed loadAnsweredFeedPublic(
            @Nullable String category,
            @Nullable PostType postType,
            @Nullable String qotdId,
            int page,
            int limit) {
        // Viewer-agnostic spec: visibleTo(null) yields PUBLIC posts only —
        // the cache layer must NOT include viewer-specific predicates
        // (visibleTo with a real viewerId, notMutedBy) because the cache
        // value is shared across all viewers.
        Specification<Post> spec = PostSpecifications.visibleTo(null)
                .and(PostSpecifications.isAnswered())
                .and(PostSpecifications.authorActive())
                .and(PostSpecifications.byCategory(category))
                .and(PostSpecifications.byPostType(postType))
                .and(PostSpecifications.byQotdId(qotdId))
                .and(PostSpecifications.notExpired());

        Pageable pageable = PageRequest.of(
                page - 1, limit, Sort.by(Sort.Direction.DESC, "answeredAt"));
        Page<Post> result = postRepository.findAll(spec, pageable);
        return new CachedAnsweredFeed(result.getContent(), result.getTotalElements());
    }

    /**
     * Cache value wrapper. List of Post entities (POJO-style — no lazy
     * associations) plus total element count for pagination metadata.
     *
     * <p>Constructed only inside {@link #loadAnsweredFeedPublic} from a Spring
     * {@code Page<Post>} result; the canonical record constructor validates
     * {@code posts} non-null and is the single instantiation surface.
     */
    public record CachedAnsweredFeed(List<Post> posts, long totalElements) {
        public CachedAnsweredFeed {
            Objects.requireNonNull(posts, "posts");
        }
    }
}
