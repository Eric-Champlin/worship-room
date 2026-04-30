package com.worshiproom.auth;

import com.worshiproom.auth.dto.ChangePasswordRequest;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Service-level integration tests for {@link AuthService#changePassword}
 * (Spec 1.5c). Exercises the BCrypt verify → save flow end-to-end against
 * the singleton Testcontainers Postgres.
 */
class AuthServiceChangePasswordTest extends AbstractIntegrationTest {

    @Autowired private AuthService authService;
    @Autowired private UserRepository userRepository;
    @Autowired private BCryptPasswordEncoder encoder;

    @BeforeEach
    void clean() { userRepository.deleteAll(); }

    @Test
    void changePassword_updatesPasswordHashOnSuccess() {
        User user = createUser("svc-success@example.com", "current-password");
        UUID userId = user.getId();
        String oldHash = user.getPasswordHash();

        authService.changePassword(userId, new ChangePasswordRequest(
            "current-password", "new-password-9876"));

        User reloaded = userRepository.findById(userId).orElseThrow();
        assertThat(reloaded.getPasswordHash()).isNotEqualTo(oldHash);
        assertThat(encoder.matches("new-password-9876", reloaded.getPasswordHash())).isTrue();
        assertThat(encoder.matches("current-password", reloaded.getPasswordHash())).isFalse();
    }

    @Test
    void changePassword_throwsCurrentPasswordIncorrect_onWrongCurrent() {
        User user = createUser("svc-wrong-current@example.com", "current-password");
        UUID userId = user.getId();
        String oldHash = user.getPasswordHash();

        assertThatThrownBy(() -> authService.changePassword(userId,
                new ChangePasswordRequest("not-the-current-password", "new-password-9876")))
            .isInstanceOf(AuthException.class)
            .satisfies(ex -> {
                AuthException ae = (AuthException) ex;
                assertThat(ae.getCode()).isEqualTo("CURRENT_PASSWORD_INCORRECT");
                // 403, not 401 — see AuthException#currentPasswordIncorrect javadoc.
                assertThat(ae.getStatus().value()).isEqualTo(403);
            });

        User reloaded = userRepository.findById(userId).orElseThrow();
        assertThat(reloaded.getPasswordHash()).isEqualTo(oldHash);
    }

    @Test
    void changePassword_throwsPasswordsMustDiffer_whenNewMatchesCurrent() {
        User user = createUser("svc-same-pwd@example.com", "current-password");
        UUID userId = user.getId();
        String oldHash = user.getPasswordHash();

        assertThatThrownBy(() -> authService.changePassword(userId,
                new ChangePasswordRequest("current-password", "current-password")))
            .isInstanceOf(AuthException.class)
            .satisfies(ex -> {
                AuthException ae = (AuthException) ex;
                assertThat(ae.getCode()).isEqualTo("PASSWORDS_MUST_DIFFER");
                assertThat(ae.getStatus().value()).isEqualTo(400);
            });

        User reloaded = userRepository.findById(userId).orElseThrow();
        assertThat(reloaded.getPasswordHash()).isEqualTo(oldHash);
    }

    @Test
    void changePassword_bumpsUpdatedAtTimestamp() throws InterruptedException {
        User user = createUser("svc-updatedat@example.com", "current-password");
        UUID userId = user.getId();
        OffsetDateTime before = user.getUpdatedAt();
        // Sleep briefly so the new timestamp is observably later than the
        // pre-persist value at clock resolution.
        Thread.sleep(10);

        authService.changePassword(userId, new ChangePasswordRequest(
            "current-password", "new-password-9876"));

        User reloaded = userRepository.findById(userId).orElseThrow();
        assertThat(reloaded.getUpdatedAt()).isAfter(before);
    }

    @Test
    void changePassword_doesNotModifyOtherFields() {
        User user = createUser("svc-other-fields@example.com", "current-password");
        UUID userId = user.getId();
        String origEmail = user.getEmail();
        String origFirst = user.getFirstName();
        String origLast = user.getLastName();
        String origTz = user.getTimezone();

        authService.changePassword(userId, new ChangePasswordRequest(
            "current-password", "new-password-9876"));

        User reloaded = userRepository.findById(userId).orElseThrow();
        assertThat(reloaded.getEmail()).isEqualTo(origEmail);
        assertThat(reloaded.getFirstName()).isEqualTo(origFirst);
        assertThat(reloaded.getLastName()).isEqualTo(origLast);
        assertThat(reloaded.getTimezone()).isEqualTo(origTz);
    }

    private User createUser(String email, String plaintextPassword) {
        User user = new User(email, encoder.encode(plaintextPassword), "Test", "User", "UTC");
        return userRepository.save(user);
    }
}
