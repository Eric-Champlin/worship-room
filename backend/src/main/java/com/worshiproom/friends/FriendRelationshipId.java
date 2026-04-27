package com.worshiproom.friends;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class FriendRelationshipId implements Serializable {

    private UUID userId;
    private UUID friendUserId;

    public FriendRelationshipId() {}

    public FriendRelationshipId(UUID userId, UUID friendUserId) {
        this.userId = userId;
        this.friendUserId = friendUserId;
    }

    public UUID getUserId() { return userId; }
    public UUID getFriendUserId() { return friendUserId; }

    public void setUserId(UUID userId) { this.userId = userId; }
    public void setFriendUserId(UUID friendUserId) { this.friendUserId = friendUserId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof FriendRelationshipId other)) return false;
        return Objects.equals(userId, other.userId) && Objects.equals(friendUserId, other.friendUserId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, friendUserId);
    }

    @Override
    public String toString() {
        return "FriendRelationshipId{userId=" + userId + ", friendUserId=" + friendUserId + "}";
    }
}
