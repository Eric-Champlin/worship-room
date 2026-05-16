package com.worshiproom.presence;

import com.worshiproom.presence.dto.PresenceResponse;
import com.worshiproom.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DataAccessException;
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

    /**
     * Bump the score for an authenticated user (idempotent — multiple tabs same user).
     *
     * <p><b>Redis-degraded behavior:</b> swallows {@link DataAccessException} (Redis
     * unreachable, connection refused, timeout, etc.) and logs at WARN. The bump is
     * a status signal, never a blocker — losing one bump shrinks the visible count
     * briefly until the next reader bumps. The caller is also protected by
     * {@link PresenceTrackingInterceptor}'s own try/catch, so this layer is
     * defense-in-depth.
     */
    public void bumpUser(UUID userId) {
        if (userId == null) return;
        String member = USER_PREFIX + userId;
        try {
            redis.opsForZSet().add(props.getSortedSetKey(), member, nowSeconds());
        } catch (DataAccessException e) {
            log.warn("presenceRedisDegraded op=bumpUser cause={} message={}",
                e.getClass().getSimpleName(), e.getMessage());
        }
    }

    /**
     * Bump the score for an anonymous visitor identified by the cookie session id.
     * Same Redis-degraded behavior as {@link #bumpUser(UUID)}.
     */
    public void bumpAnon(String sessionId) {
        if (sessionId == null || sessionId.isEmpty()) return;
        String member = ANON_PREFIX + sessionId;
        try {
            redis.opsForZSet().add(props.getSortedSetKey(), member, nowSeconds());
        } catch (DataAccessException e) {
            log.warn("presenceRedisDegraded op=bumpAnon cause={} message={}",
                e.getClass().getSimpleName(), e.getMessage());
        }
    }

    /**
     * Returns the count of "present" members (score newer than {@code ttlSeconds})
     * minus any authenticated users whose {@code presence_opted_out} is true.
     *
     * <p>Cached for 30s via Spring {@link Cacheable} under the {@code prayer-wall-presence}
     * cache name. Single global entry — Spring's cache concurrency control serializes
     * concurrent recomputations on the cache key, which is fine for a 30s TTL.
     *
     * <p><b>Redis-degraded behavior:</b> if the ZSET read throws {@link DataAccessException}
     * (Redis unreachable / connection refused / timeout), returns {@code PresenceResponse(0)}
     * and logs once at WARN. The count is hidden when zero (W11 / W21 — hidden at N=0),
     * so the indicator silently disappears rather than failing the request. The 30s
     * cache layer means a single warn fires roughly per cache miss, not per request.
     */
    @Cacheable(value = "prayer-wall-presence")
    public PresenceResponse getCount() {
        double now = nowSeconds();
        double cutoff = now - props.getTtlSeconds();
        Set<String> members;
        try {
            members = redis.opsForZSet()
                .rangeByScore(props.getSortedSetKey(), cutoff, Double.POSITIVE_INFINITY);
        } catch (DataAccessException e) {
            log.warn("presenceRedisDegraded op=getCount cause={} message={}",
                e.getClass().getSimpleName(), e.getMessage());
            return new PresenceResponse(0);
        }
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
     * <p><b>Redis-degraded behavior:</b> swallows {@link DataAccessException} and
     * returns 0. The cleanup job logs WARN and retries on its next scheduled run;
     * skipping a cleanup cycle is safe because {@link #getCount()} already filters
     * stale members by score.
     *
     * @return number of members removed (0 when Redis unreachable)
     */
    public long cleanup() {
        double cutoff = nowSeconds() - props.getTtlSeconds();
        try {
            Long removed = redis.opsForZSet()
                .removeRangeByScore(props.getSortedSetKey(), 0, cutoff);
            return removed != null ? removed : 0L;
        } catch (DataAccessException e) {
            log.warn("presenceRedisDegraded op=cleanup cause={} message={}",
                e.getClass().getSimpleName(), e.getMessage());
            return 0L;
        }
    }

    private double nowSeconds() {
        return Instant.now().getEpochSecond();
    }
}
