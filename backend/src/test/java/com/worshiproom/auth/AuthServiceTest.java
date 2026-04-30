package com.worshiproom.auth;

import com.worshiproom.auth.dto.AuthResponse;
import com.worshiproom.auth.dto.LoginRequest;
import com.worshiproom.auth.dto.RegisterRequest;
import com.worshiproom.legal.LegalVersionService;
import com.worshiproom.user.DisplayNamePreference;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private JwtService jwtService;
    @Mock private LoginAttemptService loginAttemptService;

    private BCryptPasswordEncoder realEncoder;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        realEncoder = new BCryptPasswordEncoder();
        authService = new AuthService(userRepository, realEncoder, jwtService,
            new LegalVersionService(), loginAttemptService);
    }

    private static final String V = LegalVersionService.TERMS_VERSION; // shorthand for current versions in tests

    @Test
    void registerWithNewEmailCreatesUser() {
        when(userRepository.existsByEmailIgnoreCase("alice@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.register(new RegisterRequest(
            "Alice@Example.COM", "verylongpassword123", "Alice", "Smith", "America/Chicago", V, V));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("alice@example.com");
        assertThat(saved.getPasswordHash()).startsWith("$2a$10$");
        assertThat(saved.getTimezone()).isEqualTo("America/Chicago");
    }

    @Test
    void registerWithExistingEmailDoesNotCreate() {
        when(userRepository.existsByEmailIgnoreCase("taken@example.com")).thenReturn(true);

        authService.register(new RegisterRequest(
            "taken@example.com", "verylongpassword123", "Bob", "Jones", "UTC", V, V));

        verify(userRepository, never()).save(any());
    }

    @Test
    void registerNormalizesEmailToLowercase() {
        when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.register(new RegisterRequest(
            "Foo@BAR.com", "verylongpassword123", "Foo", "Bar", "UTC", V, V));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getEmail()).isEqualTo("foo@bar.com");
    }

    @Test
    void registerWithOmittedTimezoneDefaultsToUTC() {
        when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.register(new RegisterRequest(
            "x@example.com", "verylongpassword123", "X", "Y", null, V, V));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getTimezone()).isEqualTo("UTC");
    }

    @Test
    void registerWithInvalidTimezoneDefaultsToUTC() {
        when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.register(new RegisterRequest(
            "x@example.com", "verylongpassword123", "X", "Y", "Not/AZone", V, V));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getTimezone()).isEqualTo("UTC");
    }

    @Test
    void registerExistingEmailMatchesNewEmailTiming() {
        for (int i = 0; i < 3; i++) realEncoder.encode("warmup");

        when(userRepository.existsByEmailIgnoreCase("new@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.existsByEmailIgnoreCase("exists@example.com")).thenReturn(true);

        int iterations = 30;
        long[] newTimings = new long[iterations];
        long[] existsTimings = new long[iterations];

        for (int i = 0; i < iterations; i++) {
            long t0 = System.nanoTime();
            authService.register(new RegisterRequest(
                "new@example.com", "verylongpassword123", "N", "N", "UTC", V, V));
            newTimings[i] = System.nanoTime() - t0;

            long t1 = System.nanoTime();
            authService.register(new RegisterRequest(
                "exists@example.com", "verylongpassword123", "E", "E", "UTC", V, V));
            existsTimings[i] = System.nanoTime() - t1;
        }

        long newMedian = median(newTimings);
        long existsMedian = median(existsTimings);
        long deltaMs = Math.abs(newMedian - existsMedian) / 1_000_000L;
        assertThat(deltaMs)
            .as("timing delta between new-email and existing-email paths")
            .isLessThan(200L);
    }

    @Test
    void loginWithCorrectCredentialsReturnsToken() {
        User user = buildUser("alice@example.com", realEncoder.encode("hunter2hunter2"));
        when(userRepository.findByEmailIgnoreCase("alice@example.com")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(user.getId(), false)).thenReturn("fake.jwt.token");

        AuthResponse response = authService.login(new LoginRequest(
            "Alice@Example.COM", "hunter2hunter2"));

        assertThat(response.token()).isEqualTo("fake.jwt.token");
        assertThat(response.user().email()).isEqualTo("alice@example.com");
        assertThat(response.user().id()).isEqualTo(user.getId());
        assertThat(response.user().displayName()).isEqualTo("Alice");
    }

    @Test
    void loginWithWrongPasswordThrowsInvalidCredentials() {
        User user = buildUser("alice@example.com", realEncoder.encode("correctpassword"));
        when(userRepository.findByEmailIgnoreCase("alice@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("alice@example.com", "wrongpassword")))
            .isInstanceOf(AuthException.class)
            .hasMessage("Invalid email or password.");
    }

    @Test
    void loginWithUnknownEmailThrowsInvalidCredentials() {
        when(userRepository.findByEmailIgnoreCase("unknown@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("unknown@example.com", "anything")))
            .isInstanceOf(AuthException.class)
            .hasMessage("Invalid email or password.");
    }

    @Test
    void loginUnknownEmailMatchesKnownEmailWrongPasswordTiming() {
        for (int i = 0; i < 5; i++) realEncoder.matches("warmup", realEncoder.encode("warmup"));

        User user = buildUser("known@example.com", realEncoder.encode("realpassword"));
        when(userRepository.findByEmailIgnoreCase("known@example.com")).thenReturn(Optional.of(user));
        when(userRepository.findByEmailIgnoreCase("unknown@example.com")).thenReturn(Optional.empty());

        int iterations = 30;
        long[] knownTimings = new long[iterations];
        long[] unknownTimings = new long[iterations];

        for (int i = 0; i < iterations; i++) {
            long t0 = System.nanoTime();
            try { authService.login(new LoginRequest("known@example.com", "wrongpassword")); }
            catch (AuthException ignored) {}
            knownTimings[i] = System.nanoTime() - t0;

            long t1 = System.nanoTime();
            try { authService.login(new LoginRequest("unknown@example.com", "anything")); }
            catch (AuthException ignored) {}
            unknownTimings[i] = System.nanoTime() - t1;
        }

        long deltaMs = Math.abs(median(knownTimings) - median(unknownTimings)) / 1_000_000L;
        assertThat(deltaMs).isLessThan(200L);
    }

    @Test
    void loginEmailLookupIsCaseInsensitive() {
        User user = buildUser("alice@example.com", realEncoder.encode("hunter2hunter2"));
        when(userRepository.findByEmailIgnoreCase("alice@example.com")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(any(UUID.class), eq(false))).thenReturn("jwt");

        AuthResponse response = authService.login(new LoginRequest(
            "ALICE@Example.COM", "hunter2hunter2"));

        assertThat(response.user().email()).isEqualTo("alice@example.com");
    }

    @Test
    void loginNeverLogsRawPassword() {
        ch.qos.logback.classic.Logger logbackLogger = (ch.qos.logback.classic.Logger)
            org.slf4j.LoggerFactory.getLogger(AuthService.class);
        ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent> appender =
            new ch.qos.logback.core.read.ListAppender<>();
        appender.start();
        logbackLogger.addAppender(appender);
        ch.qos.logback.classic.Level prevLevel = logbackLogger.getLevel();
        logbackLogger.setLevel(ch.qos.logback.classic.Level.TRACE);

        String canary = "CanaryPwd-4201-DistinctString-XyZ";
        when(userRepository.findByEmailIgnoreCase("x@example.com")).thenReturn(Optional.empty());

        try {
            authService.login(new LoginRequest("x@example.com", canary));
        } catch (AuthException ignored) {}

        try {
            assertThat(appender.list)
                .as("canary password must never appear in any log line at any level")
                .extracting(ch.qos.logback.classic.spi.ILoggingEvent::getFormattedMessage)
                .noneMatch(msg -> msg.contains(canary));
        } finally {
            logbackLogger.detachAppender(appender);
            logbackLogger.setLevel(prevLevel);
        }
    }

    @Test
    void registerNeverLogsRawPassword() {
        ch.qos.logback.classic.Logger logbackLogger = (ch.qos.logback.classic.Logger)
            org.slf4j.LoggerFactory.getLogger(AuthService.class);
        ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent> appender =
            new ch.qos.logback.core.read.ListAppender<>();
        appender.start();
        logbackLogger.addAppender(appender);
        ch.qos.logback.classic.Level prevLevel = logbackLogger.getLevel();
        logbackLogger.setLevel(ch.qos.logback.classic.Level.TRACE);

        String canary = "RegCanaryPwd-9987-DistinctString-XyZ";
        when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        try {
            authService.register(new RegisterRequest(
                "canary@example.com", canary, "C", "N", "UTC", V, V));
        } catch (Exception ignored) {}

        try {
            assertThat(appender.list)
                .as("canary password must never appear in any log line at any level")
                .extracting(ch.qos.logback.classic.spi.ILoggingEvent::getFormattedMessage)
                .noneMatch(msg -> msg.contains(canary));
        } finally {
            logbackLogger.detachAppender(appender);
            logbackLogger.setLevel(prevLevel);
        }
    }

    // ─── Spec 1.5f: Account lockout flow ──────────────────────────────────

    @Test
    void loginSuccessfulResetsPriorFailedCount() {
        User user = buildUser("alice@example.com", realEncoder.encode("hunter2hunter2"));
        user.setFailedLoginCount(1);
        when(userRepository.findByEmailIgnoreCase("alice@example.com")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(user.getId(), false)).thenReturn("jwt");

        authService.login(new LoginRequest("alice@example.com", "hunter2hunter2"));

        verify(loginAttemptService, times(1)).recordSuccessfulLogin(user);
        verify(loginAttemptService, never()).recordFailedAttempt(any(UUID.class));
    }

    @Test
    void loginWrongPasswordCallsRecordFailedAttempt() {
        User user = buildUser("alice@example.com", realEncoder.encode("correctpassword"));
        when(userRepository.findByEmailIgnoreCase("alice@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("alice@example.com", "wrongpassword")))
            .isInstanceOf(AuthException.class);

        verify(loginAttemptService, times(1)).recordFailedAttempt(user.getId());
        verify(loginAttemptService, never()).recordSuccessfulLogin(any(User.class));
    }

    @Test
    void loginLockedWithWrongPasswordReturns401NotLocked() {
        User user = buildUser("alice@example.com", realEncoder.encode("correctpassword"));
        user.setFailedLoginCount(5);
        user.setLockedUntil(OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(10));
        when(userRepository.findByEmailIgnoreCase("alice@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("alice@example.com", "wrongpassword")))
            .isInstanceOfSatisfying(AuthException.class, ex -> {
                assertThat(ex.getCode()).isEqualTo("INVALID_CREDENTIALS");
                assertThat(ex).isNotInstanceOf(AccountLockedException.class);
            });

        verify(loginAttemptService, times(1)).recordFailedAttempt(user.getId());
        verify(loginAttemptService, never()).recordSuccessfulLogin(any(User.class));
    }

    @Test
    void loginLockedWithCorrectPasswordReturns423() {
        User user = buildUser("alice@example.com", realEncoder.encode("correctpassword"));
        user.setFailedLoginCount(5);
        user.setLockedUntil(OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(10));
        when(userRepository.findByEmailIgnoreCase("alice@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("alice@example.com", "correctpassword")))
            .isInstanceOfSatisfying(AccountLockedException.class, ex -> {
                assertThat(ex.getCode()).isEqualTo("ACCOUNT_LOCKED");
                assertThat(ex.getRetryAfterSeconds()).isBetween(595L, 605L);
            });

        verify(loginAttemptService, never()).recordSuccessfulLogin(any(User.class));
        verify(loginAttemptService, never()).recordFailedAttempt(any(UUID.class));
        verify(jwtService, never()).generateToken(any(UUID.class), any(boolean.class));
    }

    @Test
    void loginLockedExpiredAcceptsCorrectPassword() {
        User user = buildUser("alice@example.com", realEncoder.encode("correctpassword"));
        user.setFailedLoginCount(5);
        user.setLockedUntil(OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1));
        when(userRepository.findByEmailIgnoreCase("alice@example.com")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(user.getId(), false)).thenReturn("jwt");

        AuthResponse response = authService.login(new LoginRequest("alice@example.com", "correctpassword"));

        assertThat(response.token()).isEqualTo("jwt");
        verify(loginAttemptService, times(1)).recordSuccessfulLogin(user);
    }

    @Test
    void loginLockedExpiredFailedPasswordIncrementsAfresh() {
        User user = buildUser("alice@example.com", realEncoder.encode("correctpassword"));
        user.setFailedLoginCount(5);
        user.setFailedLoginWindowStart(OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(30));
        user.setLockedUntil(OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1));
        when(userRepository.findByEmailIgnoreCase("alice@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("alice@example.com", "wrongpassword")))
            .isInstanceOf(AuthException.class)
            .hasFieldOrPropertyWithValue("code", "INVALID_CREDENTIALS");

        verify(loginAttemptService, times(1)).recordFailedAttempt(user.getId());
    }

    @Test
    void loginUnknownEmailUnchangedDummyHashStillFires() {
        when(userRepository.findByEmailIgnoreCase("nobody@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("nobody@example.com", "anything")))
            .isInstanceOf(AuthException.class)
            .hasFieldOrPropertyWithValue("code", "INVALID_CREDENTIALS");

        verifyNoInteractions(loginAttemptService);
    }

    @Test
    void loginUnknownEmailDoesNotTouchLockoutService() {
        when(userRepository.findByEmailIgnoreCase("unknown@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("unknown@example.com", "x")))
            .isInstanceOf(AuthException.class);

        verifyNoInteractions(loginAttemptService);
    }

    @Test
    void loginRetryAfterSecondsClampedToOne() {
        User user = buildUser("alice@example.com", realEncoder.encode("correctpassword"));
        user.setFailedLoginCount(5);
        user.setLockedUntil(OffsetDateTime.now(ZoneOffset.UTC).plusNanos(500_000_000L));
        when(userRepository.findByEmailIgnoreCase("alice@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("alice@example.com", "correctpassword")))
            .isInstanceOfSatisfying(AccountLockedException.class, ex -> {
                assertThat(ex.getRetryAfterSeconds()).isGreaterThanOrEqualTo(1L);
            });
    }

    @Test
    void loginAdminFlagPreservedThroughLockoutPath() {
        User user = buildUser("admin@example.com", realEncoder.encode("hunter2hunter2"));
        user.setAdmin(true);
        when(userRepository.findByEmailIgnoreCase("admin@example.com")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(user.getId(), true)).thenReturn("admin-jwt");

        AuthResponse response = authService.login(new LoginRequest("admin@example.com", "hunter2hunter2"));

        assertThat(response.token()).isEqualTo("admin-jwt");
        verify(jwtService, times(1)).generateToken(user.getId(), true);
    }

    @Test
    void loginCorrectPasswordSkipsResetWhenStateAlreadyClean() {
        User user = buildUser("alice@example.com", realEncoder.encode("hunter2hunter2"));
        when(userRepository.findByEmailIgnoreCase("alice@example.com")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(user.getId(), false)).thenReturn("jwt");

        authService.login(new LoginRequest("alice@example.com", "hunter2hunter2"));

        // Service-level guard is INSIDE LoginAttemptService — we just assert the call happens.
        verify(loginAttemptService, times(1)).recordSuccessfulLogin(user);
    }

    private static User buildUser(String email, String passwordHash) {
        User u = new User(email, passwordHash, "Alice", "Smith", "UTC");
        u.setDisplayNamePreference(DisplayNamePreference.FIRST_ONLY);
        try {
            java.lang.reflect.Field f = User.class.getDeclaredField("id");
            f.setAccessible(true);
            f.set(u, UUID.randomUUID());
        } catch (Exception e) { throw new RuntimeException(e); }
        return u;
    }

    private static long median(long[] values) {
        long[] sorted = values.clone();
        java.util.Arrays.sort(sorted);
        return sorted[sorted.length / 2];
    }
}
