package com.worshiproom.safety;

import io.sentry.Sentry;
import io.sentry.SentryLevel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Handles side-effects when a post trips the crisis keyword detector.
 *
 * <p>Current implementation:
 * <ol>
 *   <li>Application log at INFO level with structured fields (no content).</li>
 *   <li>Sentry message at WARNING level tagged {@code event_type=crisis_keyword_match},
 *       {@code post_id=<UUID>}, {@code user_id=<UUID>}. No content tag.</li>
 * </ol>
 *
 * <p>Email alert deferred to Phase 15.x SMTP cutover (per Divergence 2).
 *
 * <p>Invoked from {@link CrisisDetectedEventListener} which fires AFTER_COMMIT —
 * alerts only happen for posts that successfully persisted.
 */
@Service
public class CrisisAlertService {

    private static final Logger log = LoggerFactory.getLogger(CrisisAlertService.class);

    public void alert(UUID postId, UUID authorId) {
        // Application log — INFO level, audit trail. No content (only IDs).
        log.info("crisisKeywordMatch postId={} userId={}", postId, authorId);

        // Sentry alert — WARNING level, IDs only. Sentry's send-default-pii=false
        // ensures request bodies/headers are never auto-attached.
        Sentry.captureMessage(
                "Crisis keyword match on prayer wall post",
                scope -> {
                    scope.setLevel(SentryLevel.WARNING);
                    scope.setTag("event_type", "crisis_keyword_match");
                    scope.setTag("post_id", postId.toString());
                    scope.setTag("user_id", authorId.toString());
                    // NO content tag — content stays in Postgres only (per
                    // 07-logging-monitoring.md PII boundary).
                }
        );

        // Future (Phase 15.x): emailService.sendCrisisAlert(postId, authorId);
        // Tracked in _plans/post-1.10-followups.md per Divergence 2.
    }
}
