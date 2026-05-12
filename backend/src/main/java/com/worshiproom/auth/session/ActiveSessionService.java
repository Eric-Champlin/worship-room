package com.worshiproom.auth.session;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.auth.JwtConfig;
import com.worshiproom.auth.blocklist.JwtBlocklistService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Forums Wave Spec 1.5g — manages rows in {@code active_sessions}.
 *
 * <p>Three responsibilities:
 * <ol>
 *   <li>Record a new row on login ({@link #recordSession})</li>
 *   <li>Touch {@code last_seen_at} on every authenticated request, SQL-throttled
 *       to once-per-60s ({@link #touchSession})</li>
 *   <li>Revoke sessions via the {@code /api/v1/sessions/*} endpoints — single,
 *       all-others, or all-including-current</li>
 * </ol>
 *
 * <p>{@code last_seen_at} throttling per Decision 6 is enforced at the SQL
 * layer; no per-process state, no drift.
 */
@Service
public class ActiveSessionService {

    private static final Logger log = LoggerFactory.getLogger(ActiveSessionService.class);
    private static final Duration TOUCH_THROTTLE = Duration.ofSeconds(60);

    private final ActiveSessionRepository sessionRepository;
    private final JwtBlocklistService jwtBlocklistService;
    private final JwtConfig jwtConfig;
    private final DeviceLabelParser deviceLabelParser;
    private final GeoIpResolver geoIpResolver;
    private final Clock clock;

    @PersistenceContext
    private EntityManager entityManager;

    public ActiveSessionService(ActiveSessionRepository sessionRepository,
                                JwtBlocklistService jwtBlocklistService,
                                JwtConfig jwtConfig,
                                DeviceLabelParser deviceLabelParser,
                                GeoIpResolver geoIpResolver,
                                Clock clock) {
        this.sessionRepository = sessionRepository;
        this.jwtBlocklistService = jwtBlocklistService;
        this.jwtConfig = jwtConfig;
        this.deviceLabelParser = deviceLabelParser;
        this.geoIpResolver = geoIpResolver;
        this.clock = clock;
    }

    /**
     * Record a fresh session at login. Caller derives {@code userAgent} from
     * the request header; {@code ipAddress} from {@code IpResolver}. Both
     * parsers degrade to null/Unknown without throwing.
     *
     * <p>{@code entityManager.refresh(saved)} pulls back DB-default timestamps
     * ({@code created_at}, {@code last_seen_at}) so the in-memory entity is
     * fully populated for any caller that reads them immediately. Defensive
     * pre-emption of the L1-cache trap.
     */
    @Transactional
    public ActiveSession recordSession(UUID userId, UUID jti, String userAgent, String ipAddress) {
        String deviceLabel = deviceLabelParser.parse(userAgent);
        String ipCity = geoIpResolver.lookupCity(ipAddress);
        ActiveSession session = new ActiveSession(userId, jti, deviceLabel, ipCity);
        ActiveSession saved = sessionRepository.saveAndFlush(session);
        entityManager.refresh(saved);
        log.info("activeSessionRecorded userId={} jti={} deviceLabel={} ipCityPresent={}",
            userId, jti, deviceLabel, ipCity != null);
        return saved;
    }

    /**
     * SQL-throttled {@code last_seen_at} bump. Returns true if a row was actually
     * updated this call, false if within the throttle window or no row matched.
     */
    @Transactional
    public boolean touchSession(UUID jti) {
        OffsetDateTime now = OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
        OffsetDateTime throttleBoundary = now.minus(TOUCH_THROTTLE);
        int updated = sessionRepository.touchLastSeen(jti, now, throttleBoundary);
        return updated > 0;
    }

    /**
     * List the user's active sessions ordered most-recent-first. The
     * {@code isCurrent} flag is derived by comparing each row's {@code jti}
     * against the requesting principal's (W30).
     */
    @Transactional(readOnly = true)
    public List<SessionResponse> listSessionsForUser(UUID userId, UUID currentJti) {
        return sessionRepository.findAllByUserIdOrderByLastSeenAtDesc(userId).stream()
            .map(session -> SessionResponse.fromEntity(session, currentJti))
            .collect(Collectors.toList());
    }

    /**
     * Revoke a single session by its public {@code sessionId}. The caller must
     * own the session — cross-user revoke returns 403 (NEVER 404; W7/W9: don't
     * leak the existence of sessions belonging to other users).
     */
    @Transactional
    public void revokeSession(UUID sessionId, AuthenticatedUser principal) {
        ActiveSession session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new AccessDeniedException("Session not found or not yours."));
        if (!session.getUserId().equals(principal.userId())) {
            // Same response shape as the not-found branch — don't leak existence.
            log.info("revokeSessionCrossUser sessionId={} requesterId={}", sessionId, principal.userId());
            throw new AccessDeniedException("Session not found or not yours.");
        }
        blocklistSession(session);
        sessionRepository.deleteByJti(session.getJti());
        log.info("revokeSessionSucceeded sessionId={} userId={}", sessionId, principal.userId());
    }

    /**
     * Revoke every session for the principal's user EXCEPT the current one.
     * The current request's token continues working; other devices' tokens
     * fail their next request.
     */
    @Transactional
    public void revokeAllOthers(AuthenticatedUser principal) {
        List<ActiveSession> sessions = sessionRepository
            .findAllByUserIdOrderByLastSeenAtDesc(principal.userId());
        int blocklisted = 0;
        for (ActiveSession session : sessions) {
            if (session.getJti().equals(principal.jti())) {
                continue;
            }
            blocklistSession(session);
            blocklisted++;
        }
        int deletedRows = sessionRepository.deleteAllByUserIdExceptJti(
            principal.userId(), principal.jti());
        log.info("revokeAllOthersSucceeded userId={} blocklisted={} deletedRows={}",
            principal.userId(), blocklisted, deletedRows);
    }

    /**
     * Revoke every session for the user INCLUDING the current one.
     * Implementation strategy: bump {@code users.session_generation} via
     * {@link JwtBlocklistService#invalidateAllForUser} — that single counter
     * bump invalidates all outstanding tokens O(1) regardless of count.
     * Then delete the {@code active_sessions} rows so {@code GET /api/v1/sessions}
     * returns empty afterwards.
     */
    @Transactional
    public void revokeAll(UUID userId) {
        jwtBlocklistService.invalidateAllForUser(userId);
        sessionRepository.deleteAllByUserId(userId);
        log.info("revokeAllSucceeded userId={}", userId);
    }

    /**
     * Delete the row for a specific {@code jti} without blocklisting (used by
     * {@code AuthService.logout} — blocklisting is performed separately so the
     * blocklist call sites can be audited independently of session deletion).
     */
    @Transactional
    public void removeByJti(UUID jti) {
        sessionRepository.deleteByJti(jti);
    }

    private void blocklistSession(ActiveSession session) {
        // expires_at on the active_sessions row isn't stored — we don't keep
        // the JWT's exp claim there. Use the worst case: the JWT's full
        // configured lifetime from now. The blocklist TTL clamp inside
        // JwtBlocklistService handles already-expired edge cases.
        Duration maxTtl = Duration.ofSeconds(jwtConfig.getExpirationSeconds());
        OffsetDateTime expiresAt = OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC)
            .plus(maxTtl);
        jwtBlocklistService.revoke(session.getJti(), session.getUserId(), expiresAt, maxTtl);
    }
}
