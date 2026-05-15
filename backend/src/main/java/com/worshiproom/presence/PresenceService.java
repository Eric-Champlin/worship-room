package com.worshiproom.presence;

import com.worshiproom.presence.dto.PresenceResponse;
import com.worshiproom.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Spec 6.11b — Live Presence service.
 *
 * <p>Backed by a single Redis sorted set (ZSET) at {@code presence:prayer_wall}.
 * Members are score-tagged with {@code epochSeconds} on every read of the
 * Prayer Wall feed (via {@link PresenceTrackingInterceptor}). Members older
 * than {@code ttlSeconds} (60 minutes by default) are stale and excluded from
 * the count; the {@link PresenceCleanupJob} prunes them every 5 minutes.
 *
 * <p>Member format (per spec W23):
 * <ul>
 *   <li>{@code user:{uuid}} — authenticated users (subject to opt-out filter)</li>
 *   <li>{@code anon:{sessionUuid}} — anonymous visitors keyed by their cookie session id</li>
 * </ul>
 *
 * <p>{@link #getCount()} is {@link Cacheable} for 30s under the
 * {@code prayer-wall-presence} cache name. Single global cache entry serves
 * all callers. No per-user caching; no eviction on opt-out toggle (the brief
 * accepts ≤30s convergence per W17).
 */
@Service
public class PresenceService {

    private static final Logger log = LoggerFactory.getLogger(PresenceService.class);
    private static final String USER_PREFIX = "user:";
    private static final String ANON_PREFIX = "anon:";

    private final RedisTemplate<String, String> redis;
    private final PresenceProperties props;
    private final UserRepository userRepository;

    public PresenceService(RedisTemplate<String, String> redisTemplate,
                           PresenceProperties props,
                           UserRepository userRepository) {
        this.redis = redisTemplate;
        this.props = props;
        this.userRepository = userRepository;
    }

    /** Bump the score for an authenticated user (idempotent — multiple tabs same user). */
    public void bumpUser(UUID userId) {
        if (userId == null) return;
        String member = USER_PREFIX + userId;
        redis.opsForZSet().add(props.getSortedSetKey(), member, nowSeconds());
    }

    /** Bump the score for an anonymous visitor identified by the cookie session id. */
    public void bumpAnon(String sessionId) {
        if (sessionId == null || sessionId.isEmpty()) return;
        String member = ANON_PREFIX + sessionId;
        redis.opsForZSet().add(props.getSortedSetKey(), member, nowSeconds());
    }

    /**
     * Returns the count of "present" members (score newer than {@code ttlSeconds})
     * minus any authenticated users whose {@code presence_opted_out} is true.
     *
     * <p>Cached for 30s via Spring {@link Cacheable} under the {@code prayer-wall-presence}
     * cache name. Single global entry — Spring's cache concurrency control serializes
     * concurrent recomputations on the cache key, which is fine for a 30s TTL.
     */
    @Cacheable(value = "prayer-wall-presence")
    public PresenceResponse getCount() {
        double now = nowSeconds();
        double cutoff = now - props.getTtlSeconds();
        Set<String> members = redis.opsForZSet()
            .rangeByScore(props.getSortedSetKey(), cutoff, Double.POSITIVE_INFINITY);
        if (members == null || members.isEmpty()) {
            return new PresenceResponse(0);
        }

        Set<UUID> userIds = new HashSet<>();
        int anonCount = 0;
        for (String member : members) {
            if (member.startsWith(USER_PREFIX)) {
                try {
                    userIds.add(UUID.fromString(member.substring(USER_PREFIX.length())));
                } catch (IllegalArgumentException e) {
                    // Malformed member — skip silently; cleanup job ages it out.
                    log.warn("Skipping malformed presence member: {}", member);
                }
            } else if (member.startsWith(ANON_PREFIX)) {
                anonCount++;
            }
            // Unknown prefix → skip (defensive — should never happen).
        }

        int authCount = userIds.size();
        if (!userIds.isEmpty()) {
            Set<UUID> optedOut = userRepository.findIdsByPresenceOptedOutTrue(userIds);
            authCount -= optedOut.size();
        }

        return new PresenceResponse(Math.max(0, authCount + anonCount));
    }

    /**
     * Removes members with score older than {@code ttlSeconds}. Called by
     * {@link PresenceCleanupJob} on a 5-minute cadence.
     *
     * @return number of members removed
     */
    public long cleanup() {
        double cutoff = nowSeconds() - props.getTtlSeconds();
        Long removed = redis.opsForZSet()
            .removeRangeByScore(props.getSortedSetKey(), 0, cutoff);
        return removed != null ? removed : 0L;
    }

    private double nowSeconds() {
        return Instant.now().getEpochSecond();
    }
}
