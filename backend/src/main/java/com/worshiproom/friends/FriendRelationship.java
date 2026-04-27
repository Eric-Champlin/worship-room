package com.worshiproom.friends;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "friend_relationships")
@IdClass(FriendRelationshipId.class)
public class FriendRelationship {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Id
    @Column(name = "friend_user_id", nullable = false, updatable = false)
    private UUID friendUserId;

    @Convert(converter = FriendRelationshipStatusConverter.class)
    @Column(name = "status", nullable = false, length = 20)
    private FriendRelationshipStatus status;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected FriendRelationship() {}

    public FriendRelationship(UUID userId, UUID friendUserId, FriendRelationshipStatus status) {
        this.userId = userId;
        this.friendUserId = friendUserId;
        this.status = status;
    }

    public UUID getUserId() { return userId; }
    public UUID getFriendUserId() { return friendUserId; }
    public FriendRelationshipStatus getStatus() { return status; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    public void setStatus(FriendRelationshipStatus status) { this.status = status; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof FriendRelationship other)) return false;
        return Objects.equals(userId, other.userId) && Objects.equals(friendUserId, other.friendUserId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, friendUserId);
    }

    @Override
    public String toString() {
        return "FriendRelationship{userId=" + userId
             + ", friendUserId=" + friendUserId
             + ", status=" + status
             + ", createdAt=" + createdAt + "}";
    }
}
