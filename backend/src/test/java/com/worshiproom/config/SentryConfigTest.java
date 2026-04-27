package com.worshiproom.config;

import com.worshiproom.auth.AuthException;
import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.friends.SelfActionException;
import com.worshiproom.proxy.bible.FcbhNotFoundException;
import com.worshiproom.proxy.common.RateLimitExceededException;
import com.worshiproom.proxy.common.SafetyBlockException;
import com.worshiproom.proxy.common.UpstreamException;
import com.worshiproom.proxy.common.UpstreamTimeoutException;
import com.worshiproom.social.RateLimitedException;
import com.worshiproom.user.UserException;
import io.sentry.Hint;
import io.sentry.SentryEvent;
import io.sentry.SentryOptions;
import io.sentry.protocol.User;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

import java.util.Collections;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;

/**
 * Pure unit tests for {@link SentryConfig}. No Spring context, no Testcontainers,
 * no real Sentry transport. The bean factory methods are invoked directly; the
 * static helpers ({@code isExpectedException}, {@code buildUserFromSecurityContext})
 * are verified against synthetic inputs.
 *
 * <p>Mirrors the unit-test layer of {@link SecurityHeadersConfigTest}.
 */
@DisplayName("SentryConfig")
class SentryConfigTest {

    private SentryConfig config;
    private SentryOptions.BeforeSendCallback beforeSend;

    @BeforeEach
    void setUp() {
        config = new SentryConfig();
        beforeSend = config.sentryBeforeSendCallback();
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Nested
    @DisplayName("beforeSend filter")
    class BeforeSend {

        @Test
        @DisplayName("dropsEachExpectedException — every class in EXPECTED_EXCEPTIONS yields null")
        void dropsEachExpectedException() {
            // One synthetic instance per expected class. Real constructors where they
            // accept simple args; Mockito for Spring's framework-managed exceptions
            // whose constructors take MethodParameter / MethodValidationResult shapes
            // we do not have on hand. The filter only checks `instanceof`, so a Mockito
            // mock satisfies the contract.
            //
            // FriendsException and SocialException are abstract, so concrete subclasses
            // (SelfActionException, RateLimitedException) stand in. The filter resolves
            // the base class via instanceof, so any concrete subclass of either will
            // also be dropped.
            Throwable[] expected = new Throwable[] {
                AuthException.unauthorized(),
                new UserExceptionStub(),
                Mockito.mock(MethodArgumentNotValidException.class),
                Mockito.mock(HandlerMethodValidationException.class),
                new ConstraintViolationException("validation failed", Collections.emptySet()),
                new RateLimitExceededException(60),
                new UpstreamException("upstream"),
                new UpstreamTimeoutException("timeout"),
                new SafetyBlockException("blocked"),
                new FcbhNotFoundException("not found"),
                new SelfActionException("self-action"),
                new RateLimitedException("rate limited")
            };

            assertThat(expected).hasSize(SentryConfig.EXPECTED_EXCEPTIONS.size());

            for (Throwable t : expected) {
                SentryEvent event = new SentryEvent(t);
                assertThat(beforeSend.execute(event, new Hint()))
                    .as("beforeSend should drop event for %s", t.getClass().getSimpleName())
                    .isNull();
            }
        }

        @Test
        @DisplayName("dropsCausedByExpectedException — RuntimeException wrapping an expected cause is dropped")
        void dropsCausedByExpectedException() {
            RuntimeException wrapped = new RuntimeException("outer", new UpstreamException("inner"));
            SentryEvent event = new SentryEvent(wrapped);

            assertThat(beforeSend.execute(event, new Hint())).isNull();
        }

        @Test
        @DisplayName("keepsUnexpectedException — generic RuntimeException is sent")
        void keepsUnexpectedException() {
            RuntimeException unexpected = new RuntimeException("not in the expected set");
            SentryEvent event = new SentryEvent(unexpected);

            assertThat(beforeSend.execute(event, new Hint())).isSameAs(event);
        }

        @Test
        @DisplayName("dropsAllFriendsAndSocialSubclasses — base-class entries cover every concrete subclass")
        void dropsAllFriendsAndSocialSubclasses() {
            // The FriendsException and SocialException entries in EXPECTED_EXCEPTIONS
            // are deliberately base classes so concrete subclasses inherit the drop.
            // If a future refactor narrows either entry to a specific subclass, this
            // test fails — preventing the silent regression where new domain
            // exceptions slip through and flood Sentry.
            Throwable[] subclasses = new Throwable[] {
                new com.worshiproom.friends.SelfActionException("self"),
                new com.worshiproom.friends.UserNotFoundException("not found"),
                new com.worshiproom.friends.InvalidInputException("invalid"),
                new com.worshiproom.friends.NotFriendsException("not friends"),
                new com.worshiproom.social.NotFriendsException("not friends (social)"),
                new com.worshiproom.social.RateLimitedException("rate limited"),
                new com.worshiproom.social.NudgeCooldownException("cooldown")
            };

            for (Throwable t : subclasses) {
                SentryEvent event = new SentryEvent(t);
                assertThat(beforeSend.execute(event, new Hint()))
                    .as("beforeSend should drop %s via its base class", t.getClass().getName())
                    .isNull();
            }
        }
    }

    @Nested
    @DisplayName("user context attachment")
    class UserContext {

        @Test
        @DisplayName("idOnly_noPii — only userId is attached; no email, no displayName, no IP")
        void idOnly_noPii() {
            UUID userId = UUID.randomUUID();
            AuthenticatedUser principal = new AuthenticatedUser(userId, false);
            SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, Collections.emptyList())
            );

            User user = SentryConfig.SentryUserContextFilter.buildUserFromSecurityContext();

            assertThat(user).isNotNull();
            assertThat(user.getId()).isEqualTo(userId.toString());
            assertThat(user.getEmail()).isNull();
            assertThat(user.getUsername()).isNull();
            assertThat(user.getIpAddress()).isNull();
        }

        @Test
        @DisplayName("anonymousRequest_noUserSet — no SecurityContext authentication means no user attached")
        void anonymousRequest_noUserSet() {
            SecurityContextHolder.clearContext();

            User user = SentryConfig.SentryUserContextFilter.buildUserFromSecurityContext();

            assertThat(user).isNull();
        }
    }

    @Nested
    @DisplayName("DSN absent")
    class DsnAbsent {

        @Test
        @DisplayName("doesNotCrashOnStartup — bean factory methods do not throw with no DSN")
        void doesNotCrashOnStartup() {
            assertThatNoException().isThrownBy(() -> {
                SentryConfig fresh = new SentryConfig();
                fresh.sentryBeforeSendCallback();
                fresh.sentryUserContextFilterRegistration();
            });
        }
    }

    /**
     * Minimal {@link UserException} subclass — its public constructor takes
     * {@code (HttpStatus, String, String)} which is not zero-arg but is trivial
     * to call. Used to keep the test row for UserException independent of any
     * specific factory method.
     */
    private static class UserExceptionStub extends UserException {
        UserExceptionStub() {
            super(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "stub");
        }
    }
}
