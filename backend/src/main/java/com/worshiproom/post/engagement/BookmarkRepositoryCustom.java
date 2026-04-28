package com.worshiproom.post.engagement;

import com.worshiproom.post.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Custom fragment for bookmark queries that need to JOIN {@link PostBookmark}
 * for sorting by {@code pb.created_at DESC} while still composing
 * {@code PostSpecifications.visibleTo()}/{@code notMutedBy()} via the JPA
 * Criteria API.
 */
public interface BookmarkRepositoryCustom {
    Page<Post> findVisibleBookmarkedPosts(UUID viewerId, Pageable pageable);
}
