package com.worshiproom.auth.session;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Forums Wave Spec 1.5g — public-facing shape for {@code GET /api/v1/sessions}.
 *
 * <p>NEVER exposes {@code jti} (W7) — the {@code sessionId} is the public
 * key for the revoke endpoint. Returning {@code jti} would leak the
 * server-side blocklist key.
 *
 * <p>{@code isCurrent} is computed server-side by comparing the row's
 * {@code jti} against the requesting principal's {@code jti} (W30).
 */
public record SessionResponse(
    UUID sessionId,
    String deviceLabel,
    String ipCity,
    OffsetDateTime lastSeenAt,
    OffsetDateTime createdAt,
    boolean isCurrent
) {
    public static SessionResponse fromEntity(ActiveSession session, UUID currentJti) {
        return new SessionResponse(
            session.getSessionId(),
            session.getDeviceLabel(),
            session.getIpCity(),
            session.getLastSeenAt(),
            session.getCreatedAt(),
            session.getJti().equals(currentJti)
        );
    }
}
