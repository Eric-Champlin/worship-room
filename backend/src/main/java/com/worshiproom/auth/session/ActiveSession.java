package com.worshiproom.auth.session;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Forums Wave Spec 1.5g — one row per live JWT session.
 *
 * <p>Surfaces to the user via {@code /settings/sessions} ("Where you're signed in").
 * The {@code jti} column joins with {@code jwt_blocklist} and the JWT's own
 * {@code jti} claim. {@code device_label} comes from {@link DeviceLabelParser};
 * {@code ip_city} comes from {@link GeoIpResolver}. Both may be {@code null}
 * when parsers degrade.
 */
@Entity
@Table(name = "active_sessions")
public class ActiveSession {

    @Id
    @Column(name = "session_id", nullable = false, updatable = false,
            columnDefinition = "uuid")
    private UUID sessionId;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "jti", nullable = false, updatable = false, unique = true)
    private UUID jti;

    @Column(name = "device_label", length = 200)
    private String deviceLabel;

    @Column(name = "ip_city", length = 100)
    private String ipCity;

    @Column(name = "last_seen_at", nullable = false,
            insertable = false, updatable = true) // DB default NOW() on insert
    private OffsetDateTime lastSeenAt;

    @Column(name = "created_at", nullable = false, updatable = false,
            insertable = false) // DB default NOW() on insert
    private OffsetDateTime createdAt;

    protected ActiveSession() {}

    public ActiveSession(UUID userId, UUID jti, String deviceLabel, String ipCity) {
        this.userId = userId;
        this.jti = jti;
        this.deviceLabel = deviceLabel;
        this.ipCity = ipCity;
    }

    @PrePersist
    void prePersist() {
        if (this.sessionId == null) {
            this.sessionId = UUID.randomUUID();
        }
    }

    public UUID getSessionId() { return sessionId; }
    public UUID getUserId() { return userId; }
    public UUID getJti() { return jti; }
    public String getDeviceLabel() { return deviceLabel; }
    public String getIpCity() { return ipCity; }
    public OffsetDateTime getLastSeenAt() { return lastSeenAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ActiveSession other)) return false;
        return Objects.equals(sessionId, other.sessionId);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(sessionId);
    }
}
