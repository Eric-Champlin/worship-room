package com.worshiproom.friends;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "friend_requests")
public class FriendRequest {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "from_user_id", nullable = false, updatable = false)
    private UUID fromUserId;

    @Column(name = "to_user_id", nullable = false, updatable = false)
    private UUID toUserId;

    @Convert(converter = FriendRequestStatusConverter.class)
    @Column(name = "status", nullable = false, length = 20)
    private FriendRequestStatus status;

    @Size(max = 280)
    @Column(name = "message", length = 280)
    private String message;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "responded_at")
    private OffsetDateTime respondedAt;

    protected FriendRequest() {}

    public FriendRequest(UUID fromUserId, UUID toUserId, String message) {
        this.id = UUID.randomUUID();
        this.fromUserId = fromUserId;
        this.toUserId = toUserId;
        this.status = FriendRequestStatus.PENDING;
        this.message = message;
    }

    public UUID getId() { return id; }
    public UUID getFromUserId() { return fromUserId; }
    public UUID getToUserId() { return toUserId; }
    public FriendRequestStatus getStatus() { return status; }
    public String getMessage() { return message; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getRespondedAt() { return respondedAt; }

    public void setStatus(FriendRequestStatus status) { this.status = status; }
    public void setRespondedAt(OffsetDateTime respondedAt) { this.respondedAt = respondedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof FriendRequest other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }

    @Override
    public String toString() {
        return "FriendRequest{id=" + id
             + ", fromUserId=" + fromUserId
             + ", toUserId=" + toUserId
             + ", status=" + status
             + ", createdAt=" + createdAt
             + ", respondedAt=" + respondedAt + "}";
    }
}
