package com.worshiproom.auth;

import com.worshiproom.support.AbstractDataJpaTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Repository-slice tests for {@link LoginAttemptRepository} (Spec 1.5f).
 *
 * <p>Verifies the atomic JPQL CASE behavior across five scenarios:
 * first failure, in-window increment, out-of-window reset, threshold lock,
 * and full reset.
 */
class LoginAttemptRepositoryTest extends AbstractDataJpaTest {

    private static final int MAX_FAILURES = 5;
    private static final int WINDOW_MINUTES = 15;
    private static final int DURATION_MINUTES = 15;

    @Autowired private LoginAttemptRepository loginAttemptRepository;
    @Autowired private UserRepository userRepository;

    private User user;

    @BeforeEach
    void setUp() {
        // Each @DataJpaTest method auto-rolls-back; manual seed is fine.
        user = userRepository.save(new User(
            "lockout-repo-" + UUID.randomUUID() + "@example.com",
            "$2a$10$placeholderhashforinsertonlyok",
            "Repo", "Test", "UTC"));
    }

    @Test
    void firstFailureSetsCountToOneAndStartsWindow() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime windowCutoff = now.minusMinutes(WINDOW_MINUTES);
        OffsetDateTime lockUntil = now.plusMinutes(DURATION_MINUTES);

        int updated = loginAttemptRepository.incrementFailedLogin(
            user.getId(), now, windowCutoff, MAX_FAILURES, lockUntil);

        assertThat(updated).isEqualTo(1);

        User reloaded = userRepository.findById(user.getId()).orElseThrow();
        assertThat(reloaded.getFailedLoginCount()).isEqualTo(1);
        assertThat(reloaded.getFailedLoginWindowStart()).isCloseTo(now,
            within(1, java.time.temporal.ChronoUnit.SECONDS));
        assertThat(reloaded.getLockedUntil()).isNull();
    }

    @Test
    void failureWithinWindowIncrementsKeepsWindowStart() {
        OffsetDateTime tenMinAgo = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(10);
        user.setFailedLoginCount(2);
        user.setFailedLoginWindowStart(tenMinAgo);
        userRepository.save(user);

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime windowCutoff = now.minusMinutes(WINDOW_MINUTES);
        OffsetDateTime lockUntil = now.plusMinutes(DURATION_MINUTES);

        loginAttemptRepository.incrementFailedLogin(
            user.getId(), now, windowCutoff, MAX_FAILURES, lockUntil);

        User reloaded = userRepository.findById(user.getId()).orElseThrow();
        assertThat(reloaded.getFailedLoginCount()).isEqualTo(3);
        assertThat(reloaded.getFailedLoginWindowStart()).isCloseTo(tenMinAgo,
            within(1, java.time.temporal.ChronoUnit.SECONDS));
        assertThat(reloaded.getLockedUntil()).isNull();
    }

    @Test
    void failureOutsideWindowResetsCountAndWindow() {
        OffsetDateTime twentyMinAgo = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(20);
        user.setFailedLoginCount(3);
        user.setFailedLoginWindowStart(twentyMinAgo);
        userRepository.save(user);

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime windowCutoff = now.minusMinutes(WINDOW_MINUTES);
        OffsetDateTime lockUntil = now.plusMinutes(DURATION_MINUTES);

        loginAttemptRepository.incrementFailedLogin(
            user.getId(), now, windowCutoff, MAX_FAILURES, lockUntil);

        User reloaded = userRepository.findById(user.getId()).orElseThrow();
        assertThat(reloaded.getFailedLoginCount()).isEqualTo(1);
        assertThat(reloaded.getFailedLoginWindowStart()).isCloseTo(now,
            within(1, java.time.temporal.ChronoUnit.SECONDS));
        assertThat(reloaded.getLockedUntil()).isNull();
    }

    @Test
    void fifthFailureSetsLockedUntil() {
        OffsetDateTime fiveMinAgo = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(5);
        user.setFailedLoginCount(4);
        user.setFailedLoginWindowStart(fiveMinAgo);
        userRepository.save(user);

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime windowCutoff = now.minusMinutes(WINDOW_MINUTES);
        OffsetDateTime lockUntil = now.plusMinutes(DURATION_MINUTES);

        loginAttemptRepository.incrementFailedLogin(
            user.getId(), now, windowCutoff, MAX_FAILURES, lockUntil);

        User reloaded = userRepository.findById(user.getId()).orElseThrow();
        assertThat(reloaded.getFailedLoginCount()).isEqualTo(5);
        assertThat(reloaded.getLockedUntil()).isCloseTo(lockUntil,
            within(1, java.time.temporal.ChronoUnit.SECONDS));
    }

    @Test
    void continuedFailureWithinWindowDoesNotExtendLock() {
        // Spec 1.5f watch-for #18 + AC: "Continued failed attempts on a locked
        // account do NOT extend the lock." A user already at threshold with an
        // active lock should see count keep climbing on subsequent failures, but
        // lockedUntil must remain at its original value.
        OffsetDateTime fiveMinAgo = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(5);
        OffsetDateTime originalLock = OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(10);
        user.setFailedLoginCount(MAX_FAILURES);
        user.setFailedLoginWindowStart(fiveMinAgo);
        user.setLockedUntil(originalLock);
        userRepository.save(user);

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime windowCutoff = now.minusMinutes(WINDOW_MINUTES);
        OffsetDateTime newLockUntilWouldBe = now.plusMinutes(DURATION_MINUTES);

        loginAttemptRepository.incrementFailedLogin(
            user.getId(), now, windowCutoff, MAX_FAILURES, newLockUntilWouldBe);

        User reloaded = userRepository.findById(user.getId()).orElseThrow();
        assertThat(reloaded.getFailedLoginCount()).isEqualTo(MAX_FAILURES + 1);
        // originalLock (now+10min) and newLockUntilWouldBe (now+15min) are ~5min
        // apart — closeTo originalLock with 1-sec tolerance unambiguously rules out
        // the bug scenario where lockedUntil was overwritten with newLockUntilWouldBe.
        assertThat(reloaded.getLockedUntil()).isCloseTo(originalLock,
            within(1, java.time.temporal.ChronoUnit.SECONDS));
    }

    @Test
    void resetClearsAllThreeFields() {
        user.setFailedLoginCount(5);
        user.setFailedLoginWindowStart(OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2));
        user.setLockedUntil(OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(10));
        userRepository.save(user);

        int updated = loginAttemptRepository.resetLoginAttempts(user.getId());

        assertThat(updated).isEqualTo(1);

        User reloaded = userRepository.findById(user.getId()).orElseThrow();
        assertThat(reloaded.getFailedLoginCount()).isEqualTo(0);
        assertThat(reloaded.getFailedLoginWindowStart()).isNull();
        assertThat(reloaded.getLockedUntil()).isNull();
    }

    private static org.assertj.core.data.TemporalUnitOffset within(long value,
                                                                    java.time.temporal.TemporalUnit unit) {
        return new org.assertj.core.data.TemporalUnitWithinOffset(value, unit);
    }
}
