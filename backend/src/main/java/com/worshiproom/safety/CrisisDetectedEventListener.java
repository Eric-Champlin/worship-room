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
 * for content that successfully persisted to the database. If the transaction
 * rolls back (constraint violation, etc.), no alert is dispatched.
 *
 * <p><b>Dedup window:</b> 1 hour, bounded Caffeine cache (max 10_000 entries) per
 * the BOUNDED EXTERNAL-INPUT CACHES rule. Dedup key is the {@code contentId} alone —
 * UUIDs are globally unique, so the same UUID can never appear as both post and
 * comment, and {@link ContentType} is correctly NOT part of the cache key. A user
 * who hits crisis on both a post AND a comment within 1 hour will (correctly) get
 * two alerts since their content IDs differ.
 *
 * <p>Wrapping {@code crisisAlertService.alert(...)} in try/catch is intentional:
 * Sentry network failures must not break the transaction commit (which has
 * already happened) or surface to the user. Logged at WARN.
 */
@Component
public class CrisisDetectedEventListener {

    private static final Logger log = LoggerFactory.getLogger(CrisisDetectedEventListener.class);

    private final CrisisAlertService crisisAlertService;
    private final Cache<UUID, Boolean> alertedContentCache;

    public CrisisDetectedEventListener(CrisisAlertService crisisAlertService) {
        this.crisisAlertService = crisisAlertService;
        this.alertedContentCache = Caffeine.newBuilder()
                .maximumSize(10_000)
                .expireAfterWrite(Duration.ofHours(1))
                .build();
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleCrisisDetected(CrisisDetectedEvent event) {
        if (alertedContentCache.getIfPresent(event.contentId()) != null) {
            log.debug("Crisis alert dedup hit contentId={}", event.contentId());
            return;
        }
        alertedContentCache.put(event.contentId(), Boolean.TRUE);
        try {
            crisisAlertService.alert(event.contentId(), event.authorId(), event.type());
        } catch (Exception e) {
            log.warn("crisisAlertFailed contentId={} userId={}", event.contentId(), event.authorId(), e);
        }
    }
}
