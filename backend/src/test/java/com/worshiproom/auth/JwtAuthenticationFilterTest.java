package com.worshiproom.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.HandlerExceptionResolver;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("JwtAuthenticationFilter")
class JwtAuthenticationFilterTest {

    private static final String SECRET_32B = "a-32-byte-test-secret-xxxxxxxxxx";

    private JwtService jwtService;
    private HandlerExceptionResolver resolver;
    private JwtAuthenticationFilter filter;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;
    private FilterChain chain;

    @BeforeEach
    void setUp() {
        jwtService = mock(JwtService.class);
        resolver = mock(HandlerExceptionResolver.class);
        filter = new JwtAuthenticationFilter(jwtService, resolver);
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        chain = mock(FilterChain.class);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("no Authorization header passes through with no auth context")
    void noAuthorizationHeaderPassesThrough() throws Exception {
        filter.doFilter(request, response, chain);

        verify(chain, times(1)).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("non-Bearer prefix passes through with no auth context")
    void nonBearerPrefixPassesThrough() throws Exception {
        request.addHeader("Authorization", "Basic abc123");

        filter.doFilter(request, response, chain);

        verify(chain, times(1)).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("valid token sets AuthenticatedUser principal")
    void validTokenSetsAuthenticatedUserPrincipal() throws Exception {
        UUID userId = UUID.randomUUID();
        Jws<Claims> jws = signedJws(userId.toString(), true, 3600);
        when(jwtService.parseToken("valid.token.here")).thenReturn(jws);

        request.addHeader("Authorization", "Bearer valid.token.here");

        filter.doFilter(request, response, chain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isInstanceOf(AuthenticatedUser.class);
        AuthenticatedUser principal = (AuthenticatedUser) auth.getPrincipal();
        assertThat(principal.userId()).isEqualTo(userId);
        assertThat(principal.isAdmin()).isTrue();
    }

    @Test
    @DisplayName("valid token calls next filter")
    void validTokenCallsNextFilter() throws Exception {
        when(jwtService.parseToken(any())).thenReturn(signedJws(UUID.randomUUID().toString(), false, 3600));
        request.addHeader("Authorization", "Bearer any.token.value");

        filter.doFilter(request, response, chain);

        verify(chain, times(1)).doFilter(request, response);
    }

    @Test
    @DisplayName("expired token delegates to resolver with TOKEN_EXPIRED; chain not advanced")
    void expiredTokenDelegatesToResolverWithTokenExpired() throws Exception {
        when(jwtService.parseToken(any())).thenThrow(mock(ExpiredJwtException.class));
        request.addHeader("Authorization", "Bearer expired.token.here");

        filter.doFilter(request, response, chain);

        ArgumentCaptor<Exception> captor = ArgumentCaptor.forClass(Exception.class);
        verify(resolver, times(1)).resolveException(eq(request), eq(response), isNull(), captor.capture());
        assertThat(captor.getValue()).isInstanceOf(AuthException.class);
        assertThat(((AuthException) captor.getValue()).getCode()).isEqualTo("TOKEN_EXPIRED");
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    @DisplayName("invalid signature delegates to resolver with TOKEN_INVALID")
    void invalidSignatureDelegatesToResolverWithTokenInvalid() throws Exception {
        when(jwtService.parseToken(any())).thenThrow(mock(SignatureException.class));
        request.addHeader("Authorization", "Bearer bad.sig.here");

        filter.doFilter(request, response, chain);

        ArgumentCaptor<Exception> captor = ArgumentCaptor.forClass(Exception.class);
        verify(resolver, times(1)).resolveException(eq(request), eq(response), isNull(), captor.capture());
        assertThat(((AuthException) captor.getValue()).getCode()).isEqualTo("TOKEN_INVALID");
    }

    @Test
    @DisplayName("malformed token delegates to resolver with TOKEN_MALFORMED")
    void malformedTokenDelegatesToResolverWithTokenMalformed() throws Exception {
        when(jwtService.parseToken(any())).thenThrow(mock(MalformedJwtException.class));
        request.addHeader("Authorization", "Bearer not.a.jwt");

        filter.doFilter(request, response, chain);

        ArgumentCaptor<Exception> captor = ArgumentCaptor.forClass(Exception.class);
        verify(resolver, times(1)).resolveException(eq(request), eq(response), isNull(), captor.capture());
        assertThat(((AuthException) captor.getValue()).getCode()).isEqualTo("TOKEN_MALFORMED");
    }

    @Test
    @DisplayName("bad UUID in sub claim delegates to resolver with TOKEN_MALFORMED")
    void badUuidInSubClaimDelegatesToResolverWithTokenMalformed() throws Exception {
        // Token parses fine, but sub is not a valid UUID. UUID.fromString throws
        // IllegalArgumentException which maps to TOKEN_MALFORMED.
        when(jwtService.parseToken(any())).thenReturn(signedJws("not-a-uuid", false, 3600));
        request.addHeader("Authorization", "Bearer token.with.bad.sub");

        filter.doFilter(request, response, chain);

        ArgumentCaptor<Exception> captor = ArgumentCaptor.forClass(Exception.class);
        verify(resolver, times(1)).resolveException(eq(request), eq(response), isNull(), captor.capture());
        assertThat(((AuthException) captor.getValue()).getCode()).isEqualTo("TOKEN_MALFORMED");
    }

    @Test
    @DisplayName("empty Bearer token delegates to resolver")
    void emptyBearerTokenDelegatesToResolver() throws Exception {
        // JJWT treats empty string as IllegalArgumentException, which maps to TOKEN_MALFORMED
        when(jwtService.parseToken("")).thenThrow(new IllegalArgumentException("JWT string cannot be empty"));
        request.addHeader("Authorization", "Bearer ");

        filter.doFilter(request, response, chain);

        ArgumentCaptor<Exception> captor = ArgumentCaptor.forClass(Exception.class);
        verify(resolver, times(1)).resolveException(eq(request), eq(response), isNull(), captor.capture());
        assertThat(((AuthException) captor.getValue()).getCode()).isEqualTo("TOKEN_MALFORMED");
    }

    @Test
    @DisplayName("missing is_admin claim defaults to false")
    void nullIsAdminClaimDefaultsToFalse() throws Exception {
        UUID userId = UUID.randomUUID();
        // Build token without is_admin claim
        Jws<Claims> jws = signedJwsNoAdminClaim(userId.toString(), 3600);
        when(jwtService.parseToken(any())).thenReturn(jws);
        request.addHeader("Authorization", "Bearer some.token.here");

        filter.doFilter(request, response, chain);

        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder
            .getContext().getAuthentication().getPrincipal();
        assertThat(principal.isAdmin()).isFalse();
    }

    /** Build a real Jws<Claims> for tests that want to stub parseToken with a valid result. */
    private static Jws<Claims> signedJws(String sub, boolean isAdmin, int expiresInSeconds) {
        SecretKey key = Keys.hmacShaKeyFor(SECRET_32B.getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        String token = Jwts.builder()
            .subject(sub)
            .claim("is_admin", isAdmin)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusSeconds(expiresInSeconds)))
            .signWith(key, Jwts.SIG.HS256)
            .compact();
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
    }

    /** Same as signedJws but omits the is_admin claim entirely. */
    private static Jws<Claims> signedJwsNoAdminClaim(String sub, int expiresInSeconds) {
        SecretKey key = Keys.hmacShaKeyFor(SECRET_32B.getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        String token = Jwts.builder()
            .subject(sub)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusSeconds(expiresInSeconds)))
            .signWith(key, Jwts.SIG.HS256)
            .compact();
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
    }
}
