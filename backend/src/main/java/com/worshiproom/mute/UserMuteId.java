package com.worshiproom.mute;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class UserMuteId implements Serializable {

    private UUID muterId;
    private UUID mutedId;

    public UserMuteId() {}

    public UserMuteId(UUID muterId, UUID mutedId) {
        this.muterId = muterId;
        this.mutedId = mutedId;
    }

    public UUID getMuterId() { return muterId; }
    public UUID getMutedId() { return mutedId; }

    public void setMuterId(UUID muterId) { this.muterId = muterId; }
    public void setMutedId(UUID mutedId) { this.mutedId = mutedId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserMuteId other)) return false;
        return Objects.equals(muterId, other.muterId) && Objects.equals(mutedId, other.mutedId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(muterId, mutedId);
    }

    @Override
    public String toString() {
        return "UserMuteId{muterId=" + muterId + ", mutedId=" + mutedId + "}";
    }
}
