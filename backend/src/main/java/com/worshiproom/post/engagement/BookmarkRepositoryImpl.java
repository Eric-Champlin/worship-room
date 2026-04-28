package com.worshiproom.post.engagement;

import com.worshiproom.post.Post;
import com.worshiproom.post.PostSpecifications;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

/**
 * Custom fragment so the bookmarks read can JOIN {@link PostBookmark} for
 * the required {@code ORDER BY pb.created_at DESC} while still composing
 * {@link PostSpecifications#visibleTo}/{@link PostSpecifications#notMutedBy}
 * literally via the Criteria API.
 *
 * <p>Spec 3.4 Divergence 4 (visibility) + Watch-For #3 (mute filter) + #7
 * (sort by bookmark creation, not post creation).
 */
public class BookmarkRepositoryImpl implements BookmarkRepositoryCustom {

    private final EntityManager em;

    public BookmarkRepositoryImpl(EntityManager em) {
        this.em = em;
    }

    @Override
    public Page<Post> findVisibleBookmarkedPosts(UUID viewerId, Pageable pageable) {
        CriteriaBuilder cb = em.getCriteriaBuilder();

        // Data query
        CriteriaQuery<Post> dataQ = cb.createQuery(Post.class);
        Root<Post> postRoot = dataQ.from(Post.class);
        Root<PostBookmark> bookmarkRoot = dataQ.from(PostBookmark.class);
        Predicate joinOnPostId = cb.equal(bookmarkRoot.get("postId"), postRoot.get("id"));
        Predicate viewerOwnsBookmark = cb.equal(bookmarkRoot.get("userId"), viewerId);
        Predicate visibility = PostSpecifications.visibleTo(viewerId).toPredicate(postRoot, dataQ, cb);
        Predicate notMuted = PostSpecifications.notMutedBy(viewerId).toPredicate(postRoot, dataQ, cb);
        dataQ.select(postRoot)
                .where(cb.and(joinOnPostId, viewerOwnsBookmark, visibility, notMuted))
                .orderBy(cb.desc(bookmarkRoot.get("createdAt")));

        List<Post> content = em.createQuery(dataQ)
                .setFirstResult((int) pageable.getOffset())
                .setMaxResults(pageable.getPageSize())
                .getResultList();

        // Count query — uses COUNT(DISTINCT post.id) defensively against future
        // schema drift even though the composite PK on post_bookmarks ensures
        // each viewer-bookmarked post produces at most one joined row today.
        CriteriaQuery<Long> countQ = cb.createQuery(Long.class);
        Root<Post> countPostRoot = countQ.from(Post.class);
        Root<PostBookmark> countBookmarkRoot = countQ.from(PostBookmark.class);
        Predicate cJoin = cb.equal(countBookmarkRoot.get("postId"), countPostRoot.get("id"));
        Predicate cOwn = cb.equal(countBookmarkRoot.get("userId"), viewerId);
        Predicate cVis = PostSpecifications.visibleTo(viewerId).toPredicate(countPostRoot, countQ, cb);
        Predicate cMute = PostSpecifications.notMutedBy(viewerId).toPredicate(countPostRoot, countQ, cb);
        countQ.select(cb.countDistinct(countPostRoot)).where(cb.and(cJoin, cOwn, cVis, cMute));
        long total = em.createQuery(countQ).getSingleResult();

        return new PageImpl<>(content, pageable, total);
    }
}
