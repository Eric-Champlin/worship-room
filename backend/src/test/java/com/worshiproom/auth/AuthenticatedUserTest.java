package com.worshiproom.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AuthenticatedUser")
class AuthenticatedUserTest {

    @Test
    @DisplayName("2-arg constructor sets jti and expiresAt to null")
    void twoArgConstructor_setsJtiAndExpiresAtToNull() {
        UUID userId = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(userId, false);

        assertThat(principal.userId()).isEqualTo(userId);
        assertThat(principal.isAdmin()).isFalse();
        assertThat(principal.jti()).isNull();
        assertThat(principal.expiresAt()).isNull();
    }

    @Test
    @DisplayName("4-arg constructor sets all fields")
    void fourArgConstructor_setsAllFields() {
        UUID userId = UUID.randomUUID();
        UUID jti = UUID.randomUUID();
        Instant exp = Instant.now().plusSeconds(3600);

        AuthenticatedUser principal = new AuthenticatedUser(userId, true, jti, exp);

        assertThat(principal.userId()).isEqualTo(userId);
        assertThat(principal.isAdmin()).isTrue();
        assertThat(principal.jti()).isEqualTo(jti);
        assertThat(principal.expiresAt()).isEqualTo(exp);
    }
}
