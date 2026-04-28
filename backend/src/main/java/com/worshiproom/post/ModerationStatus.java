package com.worshiproom.post;

public enum ModerationStatus {
    APPROVED("approved"),
    FLAGGED("flagged"),
    HIDDEN("hidden"),
    REMOVED("removed");

    private final String value;

    ModerationStatus(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static ModerationStatus fromValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("ModerationStatus value must not be null");
        }
        for (ModerationStatus s : values()) {
            if (s.value.equals(value)) {
                return s;
            }
        }
        throw new IllegalArgumentException("Unknown ModerationStatus value: " + value);
    }
}
