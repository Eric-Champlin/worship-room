package com.worshiproom.presence;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Spec 6.11b — prunes stale members from the Live Presence sorted set on a
 * 5-minute cadence ({@code ZREMRANGEBYSCORE presence:prayer_wall 0 (now - 3600)}).
 * Mirrors {@link com.worshiproom.verse.VerseSurfacingLogCleanupJob} shape.
 *
 * <p>Picks up Spring's {@code @EnableScheduling} from
 * {@link com.worshiproom.upload.SchedulingConfig} — no additional wiring required.
 *
 * <p>Failures are logged at WARN and swallowed — cleanup is best-effort, never
 * propagated. The next scheduled tick will retry.
 */
@Component
public class PresenceCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(PresenceCleanupJob.class);

    private final PresenceService service;

    public PresenceCleanupJob(PresenceService service) {
        this.service = service;
    }

    @Scheduled(cron = "0 */5 * * * ?", zone = "UTC")
    public void cleanup() {
        try {
            long removed = service.cleanup();
            if (removed > 0) {
                log.info("presenceCleanupPruned removed={}", removed);
            }
        } catch (Exception e) {
            log.warn("presenceCleanupFailed cause={}", e.getClass().getSimpleName());
        }
    }
}
