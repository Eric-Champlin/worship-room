package com.worshiproom.safety;

import java.util.UUID;

/**
 * Event published by PostService when a post tripping the crisis detector is
 * about to be persisted. Consumed by CrisisDetectedEventListener via
 * {@code @TransactionalEventListener(phase = AFTER_COMMIT)} so alerts only fire
 * for posts that actually persisted (failed inserts produce no Sentry alert).
 *
 * <p>Payload is IDs only — no content. The post body stays in Postgres and never
 * crosses into Sentry tags.
 */
public record CrisisDetectedEvent(UUID postId, UUID authorId) {}
