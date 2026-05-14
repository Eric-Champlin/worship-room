package com.worshiproom.verse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/**
 * Background job that prunes {@code verse_surfacing_log} rows older than the
 * 30-day retention horizon (Spec 6.8 §"Retention"). Runs once daily at 03:30 UTC.
 *
 * <p>Picks up Spring's {@code @EnableScheduling} from
 * {@link com.worshiproom.upload.SchedulingConfig} — no additional wiring required.
 *
 * <p>Single bulk DELETE (not batched like {@link com.worshiproom.quicklift.QuickLiftCleanupJob}):
 * the table is much smaller — one row per user per surfacing, gated by 24h cooldown,
 * so the daily delta is bounded at ~1 row/user/day for actively-engaged users. A bulk
 * DELETE-where comfortably covers it.
 */
@Component
public class VerseSurfacingLogCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(VerseSurfacingLogCleanupJob.class);
    static final Duration RETENTION = Duration.ofDays(30);

    private final VerseSurfacingLogRepository repository;

    public VerseSurfacingLogCleanupJob(VerseSurfacingLogRepository repository) {
        this.repository = repository;
    }

    @Scheduled(cron = "0 30 3 * * ?", zone = "UTC")
    @Transactional
    public void cleanup() {
        OffsetDateTime cutoff = OffsetDateTime.now(ZoneOffset.UTC).minus(RETENTION);
        int deleted = repository.deleteOlderThan(cutoff);
        if (deleted > 0) {
            log.info("verseSurfacingLogPruned count={}", deleted);
        }
    }
}
