package com.worshiproom.safety;

import java.util.UUID;

/**
 * Event published when a post or comment trips the crisis detector. Consumed by
 * {@link CrisisDetectedEventListener} via
 * {@code @TransactionalEventListener(phase = AFTER_COMMIT)} so alerts only fire
 * for content that actually persisted (failed inserts produce no Sentry alert).
 *
 * <p>Payload is IDs only — no content. The body stays in Postgres and never
 * crosses into Sentry tags.
 */
public record CrisisDetectedEvent(UUID contentId, UUID authorId, ContentType type) {}
