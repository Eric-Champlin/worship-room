package com.worshiproom.safety;

import com.worshiproom.post.PostRepository;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * Pre-Phase-10 implementation of {@link CrisisFlagGate}. Reads from the existing
 * {@code posts.crisis_flag} column for posts authored by the user in the last 48 hours.
 *
 * <p>Marked {@code @Primary} so this bean wins when no other implementation is registered.
 * When Phase 10 ships (10.5 routing + 10.6 automated flagging), the new implementation will
 * replace this one — exactly one wiring point per Spec 6.8 §0.
 */
@Component
@Primary
public class PrePhase10CrisisFlagGate implements CrisisFlagGate {

    private final PostRepository postRepository;

    public PrePhase10CrisisFlagGate(PostRepository postRepository) {
        this.postRepository = postRepository;
    }

    @Override
    public boolean isUserCrisisFlagged(UUID userId) {
        OffsetDateTime cutoff = OffsetDateTime.now(ZoneOffset.UTC).minusHours(48);
        return postRepository.countCrisisFlaggedPostsByUserSince(userId, cutoff) > 0;
    }
}
