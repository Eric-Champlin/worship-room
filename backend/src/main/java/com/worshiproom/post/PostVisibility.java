package com.worshiproom.post;

public enum PostVisibility {
    PUBLIC("public"),
    FRIENDS("friends"),
    PRIVATE("private");

    private final String value;

    PostVisibility(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static PostVisibility fromValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("PostVisibility value must not be null");
        }
        for (PostVisibility v : values()) {
            if (v.value.equals(value)) {
                return v;
            }
        }
        throw new IllegalArgumentException("Unknown PostVisibility value: " + value);
    }
}
