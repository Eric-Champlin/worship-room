package com.worshiproom.quicklift;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/**
 * Background job that prunes abandoned Quick Lift sessions (Spec 6.2) older
 * than the 5-minute TTL. Runs every 15 minutes at minute :00 / :15 / :30 / :45.
 *
 * <p>Picks up Spring's {@code @EnableScheduling} from
 * {@link com.worshiproom.upload.SchedulingConfig} — no additional wiring required.
 *
 * <p>Batched bulk DELETE prevents long table-lock at scale (W13). Each batch
 * deletes up to {@link #BATCH_SIZE} rows; the loop continues until a batch
 * returns fewer than that, then exits.
 */
@Component
public class QuickLiftCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(QuickLiftCleanupJob.class);
    static final int BATCH_SIZE = 1000;
    static final Duration ABANDONED_AFTER = Duration.ofMinutes(5);

    private final QuickLiftSessionRepository sessionRepository;

    public QuickLiftCleanupJob(QuickLiftSessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    @Scheduled(cron = "0 0/15 * * * ?", zone = "UTC")
    @Transactional
    public void cleanup() {
        OffsetDateTime cutoff = OffsetDateTime.now(ZoneOffset.UTC).minus(ABANDONED_AFTER);

        int totalDeleted = 0;
        int deleted;
        do {
            deleted = sessionRepository.deleteAbandonedBatch(cutoff, BATCH_SIZE);
            totalDeleted += deleted;
        } while (deleted >= BATCH_SIZE);

        if (totalDeleted > 0) {
            log.info("quickLiftCleanupPruned count={}", totalDeleted);
        }
    }
}
