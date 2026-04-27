package com.worshiproom.friends;

public enum FriendRequestStatus {
    PENDING("pending"),
    ACCEPTED("accepted"),
    DECLINED("declined"),
    CANCELLED("cancelled");

    private final String value;

    FriendRequestStatus(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static FriendRequestStatus fromValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("FriendRequestStatus value must not be null");
        }
        for (FriendRequestStatus s : values()) {
            if (s.value.equals(value)) {
                return s;
            }
        }
        throw new IllegalArgumentException("Unknown FriendRequestStatus value: " + value);
    }
}
