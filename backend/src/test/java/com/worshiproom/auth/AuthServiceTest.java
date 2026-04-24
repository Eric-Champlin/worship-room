package com.worshiproom.auth;

import com.worshiproom.auth.dto.AuthResponse;
import com.worshiproom.auth.dto.LoginRequest;
import com.worshiproom.auth.dto.RegisterRequest;
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

    private BCryptPasswordEncoder realEncoder;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        realEncoder = new BCryptPasswordEncoder();
        authService = new AuthService(userRepository, realEncoder, jwtService);
    }

    @Test
    void registerWithNewEmailCreatesUser() {
        when(userRepository.existsByEmailIgnoreCase("alice@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.register(new RegisterRequest(
            "Alice@Example.COM", "verylongpassword123", "Alice", "Smith", "America/Chicago"));

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
            "taken@example.com", "verylongpassword123", "Bob", "Jones", "UTC"));

        verify(userRepository, never()).save(any());
    }

    @Test
    void registerNormalizesEmailToLowercase() {
        when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.register(new RegisterRequest(
            "Foo@BAR.com", "verylongpassword123", "Foo", "Bar", "UTC"));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getEmail()).isEqualTo("foo@bar.com");
    }

    @Test
    void registerWithOmittedTimezoneDefaultsToUTC() {
        when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.register(new RegisterRequest(
            "x@example.com", "verylongpassword123", "X", "Y", null));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getTimezone()).isEqualTo("UTC");
    }

    @Test
    void registerWithInvalidTimezoneDefaultsToUTC() {
        when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.register(new RegisterRequest(
            "x@example.com", "verylongpassword123", "X", "Y", "Not/AZone"));

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
                "new@example.com", "verylongpassword123", "N", "N", "UTC"));
            newTimings[i] = System.nanoTime() - t0;

            long t1 = System.nanoTime();
            authService.register(new RegisterRequest(
                "exists@example.com", "verylongpassword123", "E", "E", "UTC"));
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
                "canary@example.com", canary, "C", "N", "UTC"));
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
