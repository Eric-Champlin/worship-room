package com.worshiproom.user;

public final class DisplayNameResolver {

    private DisplayNameResolver() {}

    public static String resolve(String firstName, String lastName,
                                 String customDisplayName, DisplayNamePreference preference) {
        DisplayNamePreference effective = preference != null ? preference : DisplayNamePreference.FIRST_ONLY;
        return switch (effective) {
            case FIRST_ONLY -> firstName;
            case FIRST_LAST_INITIAL -> firstName + " " + lastName.charAt(0) + ".";
            case FIRST_LAST -> firstName + " " + lastName;
            case CUSTOM -> (customDisplayName != null && !customDisplayName.isBlank())
                    ? customDisplayName
                    : firstName;
        };
    }

    public static String resolve(User user) {
        return resolve(user.getFirstName(), user.getLastName(),
                       user.getCustomDisplayName(), user.getDisplayNamePreference());
    }
}
