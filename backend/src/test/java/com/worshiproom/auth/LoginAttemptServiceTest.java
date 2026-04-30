package com.worshiproom.auth;

import com.worshiproom.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * Unit tests for {@link LoginAttemptService} (Spec 1.5f).
 *
 * <p>Mocks {@link LoginAttemptRepository}; verifies argument derivation
 * (timestamps, threshold) and the conditional-reset guard.
 */
@ExtendWith(MockitoExtension.class)
class LoginAttemptServiceTest {

    @Mock private LoginAttemptRepository loginAttemptRepository;

    private LoginAttemptService service;
    private AccountLockoutProperties properties;

    @BeforeEach
    void setUp() {
        properties = new AccountLockoutProperties();
        properties.setMaxFailuresPerWindow(5);
        properties.setWindowMinutes(15);
        properties.setDurationMinutes(15);
        service = new LoginAttemptService(loginAttemptRepository, properties);
    }

    @Test
    void recordFailedAttemptCallsRepositoryWithDerivedTimestamps() {
        UUID userId = UUID.randomUUID();
        OffsetDateTime before = OffsetDateTime.now(ZoneOffset.UTC);

        service.recordFailedAttempt(userId);

        OffsetDateTime after = OffsetDateTime.now(ZoneOffset.UTC);

        ArgumentCaptor<OffsetDateTime> nowCaptor = ArgumentCaptor.forClass(OffsetDateTime.class);
        ArgumentCaptor<OffsetDateTime> cutoffCaptor = ArgumentCaptor.forClass(OffsetDateTime.class);
        ArgumentCaptor<OffsetDateTime> lockUntilCaptor = ArgumentCaptor.forClass(OffsetDateTime.class);

        verify(loginAttemptRepository, times(1)).incrementFailedLogin(
            eq(userId),
            nowCaptor.capture(),
            cutoffCaptor.capture(),
            eq(5),
            lockUntilCaptor.capture());

        OffsetDateTime now = nowCaptor.getValue();
        assertThat(now).isBetween(before, after);
        assertThat(cutoffCaptor.getValue()).isBetween(before.minusMinutes(15), after.minusMinutes(15));
        assertThat(lockUntilCaptor.getValue()).isBetween(before.plusMinutes(15), after.plusMinutes(15));
    }

    @Test
    void recordSuccessfulLoginSkipsResetWhenStateClean() {
        User user = userWith(0, null);

        service.recordSuccessfulLogin(user);

        verifyNoInteractions(loginAttemptRepository);
    }

    @Test
    void recordSuccessfulLoginResetsWhenCountNonZero() {
        User user = userWith(3, null);

        service.recordSuccessfulLogin(user);

        verify(loginAttemptRepository, times(1)).resetLoginAttempts(user.getId());
    }

    @Test
    void recordSuccessfulLoginResetsWhenLockedUntilNonNull() {
        User user = userWith(0, OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(5));

        service.recordSuccessfulLogin(user);

        verify(loginAttemptRepository, times(1)).resetLoginAttempts(user.getId());
    }

    private static User userWith(int count, OffsetDateTime lockedUntil) {
        User u = new User("svc-test@example.com", "$2a$10$x", "S", "T", "UTC");
        u.setFailedLoginCount(count);
        u.setLockedUntil(lockedUntil);
        try {
            java.lang.reflect.Field f = User.class.getDeclaredField("id");
            f.setAccessible(true);
            f.set(u, UUID.randomUUID());
        } catch (Exception e) { throw new RuntimeException(e); }
        return u;
    }
}
