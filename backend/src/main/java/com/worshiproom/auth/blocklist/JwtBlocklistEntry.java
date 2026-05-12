package com.worshiproom.auth.blocklist;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Durable JWT revocation record (Forums Wave Spec 1.5g, MPD-2).
 *
 * <p>The Postgres half of the dual-write pair with Redis. Postgres is the
 * source of truth; Redis is the fast path on the filter's read side. The
 * cleanup job sweeps rows where {@code expiresAt < NOW()} hourly.
 */
@Entity
@Table(name = "jwt_blocklist")
public class JwtBlocklistEntry {

    @Id
    @Column(name = "jti", nullable = false, updatable = false)
    private UUID jti;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "revoked_at", nullable = false)
    private OffsetDateTime revokedAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    protected JwtBlocklistEntry() {}

    public JwtBlocklistEntry(UUID jti, UUID userId, OffsetDateTime revokedAt, OffsetDateTime expiresAt) {
        this.jti = jti;
        this.userId = userId;
        this.revokedAt = revokedAt;
        this.expiresAt = expiresAt;
    }

    public UUID getJti() { return jti; }
    public UUID getUserId() { return userId; }
    public OffsetDateTime getRevokedAt() { return revokedAt; }
    public OffsetDateTime getExpiresAt() { return expiresAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof JwtBlocklistEntry other)) return false;
        return Objects.equals(jti, other.jti);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(jti);
    }
}
