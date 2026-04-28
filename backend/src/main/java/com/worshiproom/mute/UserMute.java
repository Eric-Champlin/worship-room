package com.worshiproom.mute;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "user_mutes")
@IdClass(UserMuteId.class)
public class UserMute {

    @Id
    @Column(name = "muter_id", nullable = false, updatable = false)
    private UUID muterId;

    @Id
    @Column(name = "muted_id", nullable = false, updatable = false)
    private UUID mutedId;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected UserMute() {}

    public UserMute(UUID muterId, UUID mutedId) {
        this.muterId = muterId;
        this.mutedId = mutedId;
    }

    public UUID getMuterId() { return muterId; }
    public UUID getMutedId() { return mutedId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserMute other)) return false;
        return Objects.equals(muterId, other.muterId) && Objects.equals(mutedId, other.mutedId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(muterId, mutedId);
    }

    @Override
    public String toString() {
        return "UserMute{muterId=" + muterId
             + ", mutedId=" + mutedId
             + ", createdAt=" + createdAt + "}";
    }
}
