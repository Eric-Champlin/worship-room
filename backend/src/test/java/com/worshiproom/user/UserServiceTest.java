package com.worshiproom.user;

import com.worshiproom.support.AbstractDataJpaTest;
import com.worshiproom.user.dto.UpdateUserRequest;
import com.worshiproom.user.dto.UserResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserServiceTest extends AbstractDataJpaTest {

    @Autowired private UserRepository userRepository;
    private UserService userService;
    private User seedUser;

    @BeforeEach
    void setup() {
        userService = new UserService(userRepository);
        seedUser = userRepository.save(
            new User("seed@example.com", "$2a$10$x", "Seed", "User", "America/Chicago"));
    }

    // --- getCurrentUser ---

    @Test
    void getCurrentUser_returnsResponseWithComputedDisplayName() {
        UserResponse resp = userService.getCurrentUser(seedUser.getId());
        assertThat(resp.id()).isEqualTo(seedUser.getId());
        assertThat(resp.email()).isEqualTo("seed@example.com");
        assertThat(resp.displayName()).isEqualTo("Seed"); // FIRST_ONLY default
        assertThat(resp.displayNamePreference()).isEqualTo("first_only");
        assertThat(resp.timezone()).isEqualTo("America/Chicago");
        assertThat(resp.isAdmin()).isFalse();
    }

    @Test
    void getCurrentUser_unknownIdThrowsUserNotFound() {
        UUID unknownId = UUID.randomUUID();
        assertThatThrownBy(() -> userService.getCurrentUser(unknownId))
            .isInstanceOf(UserException.class)
            .hasMessageContaining("Authenticated user not found");
    }

    // --- updateCurrentUser: field updates ---

    @Test
    void updateCurrentUser_updatesFirstNameAndRecomputesDisplayName() {
        UpdateUserRequest req = build().firstName("Robert").done();
        UserResponse resp = userService.updateCurrentUser(seedUser.getId(), req);
        assertThat(resp.firstName()).isEqualTo("Robert");
        assertThat(resp.displayName()).isEqualTo("Robert"); // FIRST_ONLY recomputes from new firstName
    }

    @Test
    void updateCurrentUser_omittedFieldsAreUntouched() {
        UpdateUserRequest req = build().timezone("America/Los_Angeles").done();
        UserResponse resp = userService.updateCurrentUser(seedUser.getId(), req);
        assertThat(resp.firstName()).isEqualTo("Seed"); // unchanged
        assertThat(resp.lastName()).isEqualTo("User"); // unchanged
        assertThat(resp.timezone()).isEqualTo("America/Los_Angeles"); // updated
    }

    @Test
    void updateCurrentUser_explicitNullClearsNullableField() {
        seedUser.setBio("old bio");
        userRepository.saveAndFlush(seedUser);

        UpdateUserRequest req = build().bio(null).done();
        UserResponse resp = userService.updateCurrentUser(seedUser.getId(), req);
        assertThat(resp.bio()).isNull();
    }

    @Test
    void updateCurrentUser_explicitNullOnNonNullableFieldRejected() {
        // firstName is DB-non-null. Explicit null in request → 400.
        UpdateUserRequest req = build().firstName(null).done();
        assertThatThrownBy(() -> userService.updateCurrentUser(seedUser.getId(), req))
            .isInstanceOf(UserException.class)
            .hasMessageContaining("firstName cannot be set to null");
    }

    @Test
    void updateCurrentUser_blankFirstNameRejected() {
        // Defense-in-depth: Bean Validation should have caught this, but service rejects too.
        UpdateUserRequest req = build().firstName("   ").done();
        assertThatThrownBy(() -> userService.updateCurrentUser(seedUser.getId(), req))
            .isInstanceOf(UserException.class)
            .hasMessageContaining("firstName cannot be blank");
    }

    // --- updateCurrentUser: timezone validation ---

    @Test
    void updateCurrentUser_invalidTimezoneRejected() {
        UpdateUserRequest req = build().timezone("Not/AZone").done();
        assertThatThrownBy(() -> userService.updateCurrentUser(seedUser.getId(), req))
            .isInstanceOf(UserException.class)
            .hasMessageContaining("Unknown timezone identifier: 'Not/AZone'");
    }

    @Test
    void updateCurrentUser_validTimezoneAccepted() {
        UpdateUserRequest req = build().timezone("Europe/London").done();
        UserResponse resp = userService.updateCurrentUser(seedUser.getId(), req);
        assertThat(resp.timezone()).isEqualTo("Europe/London");
    }

    // --- updateCurrentUser: displayNamePreference parsing ---

    @Test
    void updateCurrentUser_validPreferenceAcceptedAndRecomputesDisplayName() {
        UpdateUserRequest req = build().displayNamePreference("first_last").done();
        UserResponse resp = userService.updateCurrentUser(seedUser.getId(), req);
        assertThat(resp.displayNamePreference()).isEqualTo("first_last");
        assertThat(resp.displayName()).isEqualTo("Seed User");
    }

    @Test
    void updateCurrentUser_invalidPreferenceRejected() {
        UpdateUserRequest req = build().displayNamePreference("UPPER_CASE").done();
        assertThatThrownBy(() -> userService.updateCurrentUser(seedUser.getId(), req))
            .isInstanceOf(UserException.class)
            .hasMessageContaining("Invalid display name preference: 'UPPER_CASE'");
    }

    // --- updateCurrentUser: custom display-name constraint ---

    @Test
    void updateCurrentUser_customPreferenceRequiresCustomName() {
        // seedUser has customDisplayName=null. Setting preference to 'custom' alone → 400.
        UpdateUserRequest req = build().displayNamePreference("custom").done();
        assertThatThrownBy(() -> userService.updateCurrentUser(seedUser.getId(), req))
            .isInstanceOf(UserException.class)
            .hasMessageContaining("Custom display name required when preference is 'custom'");
    }

    @Test
    void updateCurrentUser_customPreferenceWithCustomNameAccepted() {
        UpdateUserRequest req = build()
            .displayNamePreference("custom")
            .customDisplayName("Pastor Seed")
            .done();
        UserResponse resp = userService.updateCurrentUser(seedUser.getId(), req);
        assertThat(resp.displayNamePreference()).isEqualTo("custom");
        assertThat(resp.customDisplayName()).isEqualTo("Pastor Seed");
        assertThat(resp.displayName()).isEqualTo("Pastor Seed");
    }

    // --- updateCurrentUser: updated_at touch ---

    @Test
    void updateCurrentUser_updatesUpdatedAt() {
        OffsetDateTime before = seedUser.getUpdatedAt();
        // Force a measurable gap so the assertion is robust on fast machines.
        try { Thread.sleep(10); } catch (InterruptedException ignored) {}

        userService.updateCurrentUser(seedUser.getId(), build().bio("new bio").done());
        User reloaded = userRepository.findById(seedUser.getId()).orElseThrow();
        assertThat(reloaded.getUpdatedAt()).isAfter(before);
    }

    // --- helper builder ---

    private static Builder build() { return new Builder(); }

    private static class Builder {
        private JsonNullable<String> firstName = JsonNullable.undefined();
        private JsonNullable<String> lastName = JsonNullable.undefined();
        private JsonNullable<String> displayNamePreference = JsonNullable.undefined();
        private JsonNullable<String> customDisplayName = JsonNullable.undefined();
        private JsonNullable<String> avatarUrl = JsonNullable.undefined();
        private JsonNullable<String> bio = JsonNullable.undefined();
        private JsonNullable<String> favoriteVerseReference = JsonNullable.undefined();
        private JsonNullable<String> favoriteVerseText = JsonNullable.undefined();
        private JsonNullable<String> timezone = JsonNullable.undefined();
        private JsonNullable<Boolean> presenceOptedOut = JsonNullable.undefined();

        Builder firstName(String v) { firstName = JsonNullable.of(v); return this; }
        Builder lastName(String v) { lastName = JsonNullable.of(v); return this; }
        Builder displayNamePreference(String v) { displayNamePreference = JsonNullable.of(v); return this; }
        Builder customDisplayName(String v) { customDisplayName = JsonNullable.of(v); return this; }
        Builder avatarUrl(String v) { avatarUrl = JsonNullable.of(v); return this; }
        Builder bio(String v) { bio = JsonNullable.of(v); return this; }
        Builder favoriteVerseReference(String v) { favoriteVerseReference = JsonNullable.of(v); return this; }
        Builder favoriteVerseText(String v) { favoriteVerseText = JsonNullable.of(v); return this; }
        Builder timezone(String v) { timezone = JsonNullable.of(v); return this; }
        Builder presenceOptedOut(Boolean v) { presenceOptedOut = JsonNullable.of(v); return this; }

        UpdateUserRequest done() {
            return new UpdateUserRequest(firstName, lastName, displayNamePreference, customDisplayName,
                avatarUrl, bio, favoriteVerseReference, favoriteVerseText, timezone, presenceOptedOut);
        }
    }
}
