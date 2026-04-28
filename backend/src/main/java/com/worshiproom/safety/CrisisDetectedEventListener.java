package com.worshiproom.safety;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Duration;
import java.util.UUID;

/**
 * Listens for {@link CrisisDetectedEvent} on AFTER_COMMIT — the alert fires only
 * for posts that successfully persisted to the database. If the transaction
 * rolls back (constraint violation, etc.), no alert is dispatched.
 *
 * <p><b>Dedup window:</b> 1 hour, bounded Caffeine cache (max 10_000 entries) per
 * the BOUNDED EXTERNAL-INPUT CACHES rule. Catches the cross-path scenario where
 * a post is created (alert), then the same post is edited and re-detects crisis
 * — only the first event fires the alert.
 *
 * <p>Wrapping {@code crisisAlertService.alert(...)} in try/catch is intentional:
 * Sentry network failures must not break the transaction commit (which has
 * already happened) or surface to the user. Logged at WARN.
 */
@Component
public class CrisisDetectedEventListener {

    private static final Logger log = LoggerFactory.getLogger(CrisisDetectedEventListener.class);

    private final CrisisAlertService crisisAlertService;
    private final Cache<UUID, Boolean> alertedPostsCache;

    public CrisisDetectedEventListener(CrisisAlertService crisisAlertService) {
        this.crisisAlertService = crisisAlertService;
        this.alertedPostsCache = Caffeine.newBuilder()
                .maximumSize(10_000)
                .expireAfterWrite(Duration.ofHours(1))
                .build();
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleCrisisDetected(CrisisDetectedEvent event) {
        if (alertedPostsCache.getIfPresent(event.postId()) != null) {
            log.debug("Crisis alert dedup hit postId={}", event.postId());
            return;
        }
        alertedPostsCache.put(event.postId(), Boolean.TRUE);
        try {
            crisisAlertService.alert(event.postId(), event.authorId());
        } catch (Exception e) {
            log.warn("crisisAlertFailed postId={} userId={}", event.postId(), event.authorId(), e);
        }
    }
}
