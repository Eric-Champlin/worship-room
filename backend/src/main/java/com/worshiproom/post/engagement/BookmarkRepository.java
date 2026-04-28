package com.worshiproom.post.engagement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BookmarkRepository
        extends JpaRepository<PostBookmark, PostBookmarkId>, BookmarkRepositoryCustom {

    // Used by ReactionsResponse builder — flat list of postIds bookmarked by viewer.
    List<PostBookmark> findByUserId(UUID userId);
}
