package com.worshiproom.friends;

public enum FriendRelationshipStatus {
    ACTIVE("active"),
    BLOCKED("blocked");

    private final String value;

    FriendRelationshipStatus(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static FriendRelationshipStatus fromValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("FriendRelationshipStatus value must not be null");
        }
        for (FriendRelationshipStatus s : values()) {
            if (s.value.equals(value)) {
                return s;
            }
        }
        throw new IllegalArgumentException("Unknown FriendRelationshipStatus value: " + value);
    }
}
