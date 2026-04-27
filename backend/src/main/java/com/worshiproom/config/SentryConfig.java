package com.worshiproom.config;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.auth.AuthException;
import com.worshiproom.friends.FriendsException;
import com.worshiproom.proxy.bible.FcbhNotFoundException;
import com.worshiproom.proxy.common.RateLimitExceededException;
import com.worshiproom.proxy.common.SafetyBlockException;
import com.worshiproom.proxy.common.UpstreamException;
import com.worshiproom.proxy.common.UpstreamTimeoutException;
import com.worshiproom.social.SocialException;
import com.worshiproom.user.UserException;
import io.sentry.Sentry;
import io.sentry.SentryOptions;
import io.sentry.protocol.User;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.ConstraintViolationException;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

import java.io.IOException;
import java.util.Set;

/**
 * Sentry integration for backend operational monitoring (Spec 1.10d).
 *
 * <p>Two beans:
 * <ol>
 *   <li>{@link SentryOptions.BeforeSendCallback} that drops events for the set of
 *       "expected" exception classes — auth/validation/rate-limit/upstream/safety.
 *       Without this filter, the Sentry free tier (5K events/month) is consumed in
 *       days by routine 401s and 429s, defeating the alerting purpose.</li>
 *   <li>A request-scoped {@link OncePerRequestFilter} that copies the authenticated
 *       {@code user.id} from {@link SecurityContextHolder} into the Sentry scope.
 *       Email, displayName, IP, and request bodies are NEVER attached — only the
 *       UUID. Matches the PII rule from {@code 07-logging-monitoring.md}.</li>
 * </ol>
 *
 * <p>DSN-absent path: {@code sentry.dsn} defaults empty in {@code application.properties}.
 * The Sentry starter handles empty-DSN gracefully — zero outbound traffic, no warnings.
 * This bean's logic still runs (it is wired into the SDK's option-customization chain),
 * but the SDK itself is a no-op so there are no events to filter or scope to populate.
 *
 * <p>Sample rates are pinned in {@code application.properties}: {@code sample-rate=1.0}
 * (capture every error), {@code traces-sample-rate=0.0} (no APM in this spec).
 *
 * <p>Modeled on {@link CorsConfig} and {@link SecurityHeadersConfig} — same package,
 * same filter-registration pattern, same code-as-policy approach.
 */
@Configuration
public class SentryConfig {

    /**
     * Exceptions deliberately dropped before reaching Sentry. Each maps to one of the
     * "expected" error codes in {@code backend/docs/api-error-codes.md} — auth failures,
     * validation errors, rate limits, upstream errors, safety blocks, FCBH not-found,
     * and the friends/social domain rejections (block, self-action, not-friends,
     * nudge cooldown, encouragement caps).
     *
     * <p>{@link FriendsException} and {@link SocialException} are added as base
     * classes so the entry covers every concrete subclass without listing each by
     * name (Spec 2.5.4b: {@code NotFriendsException}, {@code RateLimitedException},
     * {@code NudgeCooldownException}; Spec 2.5.3 friends-domain subclasses).
     *
     * <p>Updating this set requires code review per spec § 4.4 — NOT env-var-tunable.
     */
    static final Set<Class<? extends Throwable>> EXPECTED_EXCEPTIONS = Set.of(
        AuthException.class,
        UserException.class,
        MethodArgumentNotValidException.class,
        HandlerMethodValidationException.class,
        ConstraintViolationException.class,
        RateLimitExceededException.class,
        UpstreamException.class,
        UpstreamTimeoutException.class,
        SafetyBlockException.class,
        FcbhNotFoundException.class,
        FriendsException.class,
        SocialException.class
    );

    /**
     * Drops events whose throwable (or any cause in its chain) is an instance of one of
     * the {@link #EXPECTED_EXCEPTIONS}. Cause-chain walk catches the case where a service
     * wraps an expected exception in a {@link RuntimeException} before it bubbles up.
     */
    @Bean
    public SentryOptions.BeforeSendCallback sentryBeforeSendCallback() {
        return (event, hint) -> isExpectedException(event.getThrowable()) ? null : event;
    }

    static boolean isExpectedException(Throwable throwable) {
        Throwable t = throwable;
        while (t != null) {
            for (Class<? extends Throwable> expected : EXPECTED_EXCEPTIONS) {
                if (expected.isInstance(t)) {
                    return true;
                }
            }
            t = t.getCause();
        }
        return false;
    }

    /**
     * Filter that copies the authenticated user's UUID into the per-request Sentry scope.
     * Runs at {@link Ordered#LOWEST_PRECEDENCE} so it lands AFTER {@code JwtAuthenticationFilter}
     * (which populates {@link SecurityContextHolder}). When the request is anonymous, no user
     * is attached to the scope.
     *
     * <p>ONLY {@code user.id} is attached. Email, displayName, IP, and any request-body field
     * are deliberately omitted — see spec § 4.3.
     */
    @Bean
    public FilterRegistrationBean<SentryUserContextFilter> sentryUserContextFilterRegistration() {
        FilterRegistrationBean<SentryUserContextFilter> registration =
            new FilterRegistrationBean<>(new SentryUserContextFilter());
        registration.setOrder(Ordered.LOWEST_PRECEDENCE);
        registration.addUrlPatterns("/*");
        return registration;
    }

    static class SentryUserContextFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(
                HttpServletRequest request,
                HttpServletResponse response,
                FilterChain chain) throws ServletException, IOException {
            User user = buildUserFromSecurityContext();
            if (user != null) {
                Sentry.configureScope(scope -> scope.setUser(user));
            }
            chain.doFilter(request, response);
        }

        /**
         * Builds a Sentry {@link User} from the current {@link SecurityContextHolder} state,
         * or returns {@code null} if the request is anonymous. Only {@code user.id} (the
         * authenticated UUID) is populated — every other Sentry {@link User} field is left
         * null per the PII boundary in {@code 02-security.md} and spec § 4.3.
         *
         * <p>Package-private static so {@code SentryConfigTest} can assert on the return value
         * directly without standing up a Sentry hub.
         */
        static User buildUserFromSecurityContext() {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return null;
            }
            Object principal = auth.getPrincipal();
            if (!(principal instanceof AuthenticatedUser authenticatedUser)) {
                return null;
            }
            User user = new User();
            user.setId(authenticatedUser.userId().toString());
            return user;
        }
    }
}
