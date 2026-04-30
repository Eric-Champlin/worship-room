package com.worshiproom.auth;

import com.worshiproom.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * Orchestrates account-lockout writes for {@link AuthService} (Spec 1.5f).
 *
 * Atomicity lives in the JPQL CASE statement of {@link LoginAttemptRepository#incrementFailedLogin}.
 * This service exists for testability, dependency-injection clarity, and to host
 * the reset-conditional guard.
 *
 * <p>Timing note: the {@code recordFailedAttempt} UPDATE adds ~1ms vs. paths that don't
 * call it. Dominated by BCrypt's ~80ms cost — undetectable over the public
 * internet (network jitter dwarfs the skew). See spec D6.
 */
@Service
public class LoginAttemptService {

    private final LoginAttemptRepository loginAttemptRepository;
    private final AccountLockoutProperties properties;

    public LoginAttemptService(LoginAttemptRepository loginAttemptRepository,
                                AccountLockoutProperties properties) {
        this.loginAttemptRepository = loginAttemptRepository;
        this.properties = properties;
    }

    /**
     * Atomically records a failed login attempt and may transition the account
     * to locked state if the threshold is reached within the sliding window.
     *
     * Caller MUST already be inside a transaction ({@code AuthService.login} is
     * {@code @Transactional}); we propagate via {@link Propagation#MANDATORY} to
     * fail loudly if anyone calls this outside a transaction.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordFailedAttempt(UUID userId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime windowCutoff = now.minusMinutes(properties.windowMinutes());
        OffsetDateTime lockUntil = now.plusMinutes(properties.durationMinutes());
        loginAttemptRepository.incrementFailedLogin(
            userId, now, windowCutoff, properties.maxFailuresPerWindow(), lockUntil);
    }

    /**
     * Conditionally resets lockout state on successful login. Skips the write
     * when state is already clean (count==0 AND lockedUntil==null) — avoids a
     * spurious UPDATE on the common happy path.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordSuccessfulLogin(User user) {
        if (user.getFailedLoginCount() > 0 || user.getLockedUntil() != null) {
            loginAttemptRepository.resetLoginAttempts(user.getId());
        }
    }
}
