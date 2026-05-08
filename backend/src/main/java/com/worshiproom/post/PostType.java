package com.worshiproom.post;

public enum PostType {
    PRAYER_REQUEST("prayer_request"),
    TESTIMONY("testimony"),
    QUESTION("question"),
    DISCUSSION("discussion"),
    ENCOURAGEMENT("encouragement");

    private final String value;

    PostType(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static PostType fromValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("PostType value must not be null");
        }
        for (PostType t : values()) {
            if (t.value.equals(value)) {
                return t;
            }
        }
        throw new IllegalArgumentException("Unknown PostType value: " + value);
    }

    public static boolean isValid(String value) {
        if (value == null) return false;
        for (PostType t : values()) {
            if (t.value.equals(value)) return true;
        }
        return false;
    }
}
