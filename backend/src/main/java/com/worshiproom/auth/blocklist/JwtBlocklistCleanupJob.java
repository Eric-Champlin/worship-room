package com.worshiproom.auth.blocklist;

import com.worshiproom.auth.session.ActiveSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

/**
 * Forums Wave Spec 1.5g — hourly cleanup of {@code jwt_blocklist} entries
 * whose JWTs have already expired naturally, plus orphan {@code active_sessions}
 * rows whose {@code jti} is still in an active blocklist entry (the session
 * row should have been deleted on revoke; orphans indicate a transaction edge
 * case).
 *
 * <p>Picks up Spring's {@code @EnableScheduling} from
 * {@link com.worshiproom.upload.SchedulingConfig}. Runs at the top of every
 * hour in UTC. Cleanup throws are re-raised so Spring's scheduler logs them —
 * silent failure of cleanup is a slow-burn issue we want to surface.
 *
 * <p>Logs ROW COUNTS only — never logs jti or userId values to avoid PII /
 * security key leaking through info logs.
 */
@Component
public class JwtBlocklistCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(JwtBlocklistCleanupJob.class);

    private final JwtBlocklistRepository blocklistRepository;
    private final ActiveSessionRepository sessionRepository;

    public JwtBlocklistCleanupJob(JwtBlocklistRepository blocklistRepository,
                                  ActiveSessionRepository sessionRepository) {
        this.blocklistRepository = blocklistRepository;
        this.sessionRepository = sessionRepository;
    }

    @Scheduled(cron = "0 0 * * * ?", zone = "UTC")
    @Transactional
    public void cleanup() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        int expired = blocklistRepository.deleteExpired(now);
        log.info("jwtBlocklistCleanupExpired count={}", expired);

        // Orphan sweep: active_sessions rows whose jti is still in jwt_blocklist
        // (i.e., the token is revoked but the session row wasn't deleted).
        List<UUID> activeJtis = blocklistRepository.findActiveJtis(now);
        if (!activeJtis.isEmpty()) {
            int orphans = sessionRepository.deleteByJtiIn(activeJtis);
            if (orphans > 0) {
                log.info("activeSessionsOrphanCleanup count={}", orphans);
            }
        }
    }
}
