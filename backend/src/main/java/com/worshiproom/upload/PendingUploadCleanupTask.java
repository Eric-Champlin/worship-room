package com.worshiproom.upload;

import com.worshiproom.storage.ObjectStorageAdapter;
import com.worshiproom.storage.StoredObjectSummary;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Daily cleanup of unclaimed pending image uploads (Spec 4.6b).
 *
 * <p>Runs at 03:00 UTC every day. Lists everything under {@code posts/pending/}
 * and deletes any object older than {@code worshiproom.uploads.pending-ttl-hours}
 * (default 24h). Only the {@code posts/pending/} prefix is swept — claimed
 * images at {@code posts/{postId}/} are NEVER cleanup targets.
 *
 * <p>The list call is bounded at 1000 keys per run; for MVP-scale volumes (under
 * 10K orphan pendings expected at any time) one daily pass clears the backlog.
 * If the backlog exceeds 1000 in a day, future runs will catch the rest.
 *
 * <p>Logging discipline: storage keys are safe to log (path identifiers, no PII).
 * Image bytes are never read.
 */
@Component
public class PendingUploadCleanupTask {

    private static final Logger log = LoggerFactory.getLogger(PendingUploadCleanupTask.class);
    private static final String PENDING_PREFIX = "posts/pending/";
    private static final int MAX_LIST_RESULTS = 1000;

    private final ObjectStorageAdapter storage;
    private final UploadProperties config;

    public PendingUploadCleanupTask(ObjectStorageAdapter storage, UploadProperties config) {
        this.storage = storage;
        this.config = config;
    }

    /**
     * Sweep job. Runs every day at 03:00 UTC. The cron expression is in Spring's
     * 6-field format: second minute hour dayOfMonth month dayOfWeek.
     */
    @Scheduled(cron = "0 0 3 * * ?", zone = "UTC")
    public void cleanupExpiredPendingUploads() {
        Instant cutoff = Instant.now().minus(Duration.ofHours(config.getPendingTtlHours()));
        log.info("pendingCleanupStarted cutoff={}", cutoff);

        int deleted = 0;
        int errors = 0;
        int skippedTooNew = 0;

        List<StoredObjectSummary> summaries = storage.list(PENDING_PREFIX, MAX_LIST_RESULTS);
        for (StoredObjectSummary summary : summaries) {
            Instant lastModified = summary.lastModified();
            if (lastModified == null) {
                continue;
            }
            if (!lastModified.isBefore(cutoff)) {
                skippedTooNew++;
                continue;
            }
            try {
                if (storage.delete(summary.key())) {
                    deleted++;
                }
            } catch (RuntimeException e) {
                errors++;
                log.warn("pendingCleanupItemFailed key={} error={}", summary.key(), e.getMessage());
            }
        }

        log.info("pendingCleanupCompleted deleted={} skippedTooNew={} errors={}",
                deleted, skippedTooNew, errors);
    }
}
