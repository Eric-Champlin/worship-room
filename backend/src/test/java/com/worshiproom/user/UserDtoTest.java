package com.worshiproom.user;

import com.worshiproom.user.dto.UserResponse;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit-level checks of the UserResponse.from(User) factory mapping for the
 * Spec 1.10f termsVersion + privacyVersion fields.
 */
class UserDtoTest {

    @Test
    void includesLegalVersionsWhenPopulated() {
        User user = buildUser();
        user.setTermsVersion("2026-04-29");
        user.setPrivacyVersion("2026-04-29");

        UserResponse dto = UserResponse.from(user);

        assertThat(dto.termsVersion()).isEqualTo("2026-04-29");
        assertThat(dto.privacyVersion()).isEqualTo("2026-04-29");
    }

    @Test
    void legalVersionsNullWhenAbsent() {
        User user = buildUser();
        // Don't set termsVersion/privacyVersion — they remain null.

        UserResponse dto = UserResponse.from(user);

        assertThat(dto.termsVersion()).isNull();
        assertThat(dto.privacyVersion()).isNull();
    }

    private static User buildUser() {
        User u = new User("alice@example.com", "$2a$10$hash", "Alice", "Smith", "UTC");
        u.setDisplayNamePreference(DisplayNamePreference.FIRST_ONLY);
        try {
            Field idField = User.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(u, UUID.randomUUID());
            Field joinedField = User.class.getDeclaredField("joinedAt");
            joinedField.setAccessible(true);
            joinedField.set(u, OffsetDateTime.now(ZoneOffset.UTC));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return u;
    }
}
