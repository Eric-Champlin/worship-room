package com.worshiproom.safety;

import io.sentry.Sentry;
import io.sentry.SentryLevel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Handles side-effects when a post or comment trips the crisis keyword detector.
 *
 * <p>Current implementation:
 * <ol>
 *   <li>Application log at INFO level with structured fields (no content).</li>
 *   <li>Sentry message at WARNING level tagged {@code event_type=crisis_keyword_match},
 *       {@code content_type=<post|comment>}, {@code content_id=<UUID>},
 *       {@code user_id=<UUID>}. No content body tag.</li>
 * </ol>
 *
 * <p>Email alert deferred to Phase 15.x SMTP cutover (per Divergence 2). When wired,
 * the email template MUST distinguish post vs comment in the subject line — the
 * {@link ContentType} discriminator carries the necessary info.
 *
 * <p>Invoked from {@link CrisisDetectedEventListener} which fires AFTER_COMMIT —
 * alerts only happen for content that successfully persisted.
 */
@Service
public class CrisisAlertService {

    private static final Logger log = LoggerFactory.getLogger(CrisisAlertService.class);

    public void alert(UUID contentId, UUID authorId, ContentType type) {
        // Application log — INFO level, audit trail. No content body (only IDs).
        log.info("crisisKeywordMatch contentId={} userId={} contentType={}", contentId, authorId, type);

        // Sentry alert — WARNING level, IDs only. Sentry's send-default-pii=false
        // ensures request bodies/headers are never auto-attached.
        Sentry.captureMessage(
                "Crisis keyword match on prayer wall content",
                scope -> {
                    scope.setLevel(SentryLevel.WARNING);
                    scope.setTag("event_type", "crisis_keyword_match");
                    scope.setTag("content_type", type.name().toLowerCase());
                    scope.setTag("content_id", contentId.toString());
                    scope.setTag("user_id", authorId.toString());
                    // NO content-body tag — content stays in Postgres only (per
                    // 07-logging-monitoring.md PII boundary).
                }
        );

        // Future (Phase 15.x): emailService.sendCrisisAlert(contentId, authorId, type);
        // Tracked in _plans/post-1.10-followups.md per Divergence 2.
    }
}
