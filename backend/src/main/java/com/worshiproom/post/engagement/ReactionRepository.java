package com.worshiproom.post.engagement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReactionRepository extends JpaRepository<PostReaction, PostReactionId> {

    // Returns rows for the viewer's reactions of one type — ReactionsResponse
    // builder always queries 'praying' (Spec 3.4 Divergence 3 — candle excluded).
    List<PostReaction> findByUserIdAndReactionType(UUID userId, String reactionType);
}
