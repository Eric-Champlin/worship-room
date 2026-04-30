package com.worshiproom.auth;

import com.worshiproom.proxy.common.ProxyError;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit-level checks for {@link AuthExceptionHandler}'s {@code Retry-After} branch (Spec 1.5f).
 *
 * <p>The handler is instantiated directly — no Spring context — because the only
 * behavior under test is the {@code instanceof AccountLockedException} header
 * decision, which is pure mapping logic.
 */
class AuthExceptionHandlerTest {

    private final AuthExceptionHandler handler = new AuthExceptionHandler();

    @Test
    void accountLockedSetsRetryAfterHeader() {
        AccountLockedException ex = AuthException.accountLocked(900L);

        ResponseEntity<ProxyError> response = handler.handleAuth(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.LOCKED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("ACCOUNT_LOCKED");
        assertThat(response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER)).isEqualTo("900");
    }

    @Test
    void otherAuthExceptionsHaveNoRetryAfterHeader() {
        AuthException ex = AuthException.invalidCredentials();

        ResponseEntity<ProxyError> response = handler.handleAuth(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("INVALID_CREDENTIALS");
        assertThat(response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER)).isNull();
    }
}
