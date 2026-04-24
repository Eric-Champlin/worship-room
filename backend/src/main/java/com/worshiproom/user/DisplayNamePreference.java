package com.worshiproom.user;

public enum DisplayNamePreference {
    FIRST_ONLY,
    FIRST_LAST_INITIAL,
    FIRST_LAST,
    CUSTOM;

    public String dbValue() {
        return name().toLowerCase(java.util.Locale.ROOT);
    }

    public static DisplayNamePreference fromDbValue(String value) {
        if (value == null) return FIRST_ONLY;
        return DisplayNamePreference.valueOf(value.toUpperCase(java.util.Locale.ROOT));
    }
}
