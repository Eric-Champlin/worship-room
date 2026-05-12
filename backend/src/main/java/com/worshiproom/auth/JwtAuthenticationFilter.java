package com.worshiproom.auth;

import com.worshiproom.auth.blocklist.JwtBlocklistService;
import com.worshiproom.user.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

import java.io.IOException;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

/**
 * Reads {@code Authorization: Bearer <token>} and sets Spring Security's
 * SecurityContextHolder authentication to a {@link AuthenticatedUser}
 * principal. NOT a Spring bean — instantiated inline by {@link SecurityConfig}
 * to avoid Spring Boot's servlet-filter auto-registration (which would run
 * this filter twice per request).
 *
 * Ordering in the combined chain:
 *   RequestIdFilter          @Order(HIGHEST_PRECEDENCE)        [threads MDC]
 *   RateLimitFilter          @Order(HIGHEST_PRECEDENCE + 10)   [per-IP, /proxy/** only]
 *   DelegatingFilterProxy    (Spring Security; runs AFTER the above)
 *     └── JwtAuthenticationFilter                              [this filter]
 *
 * Error handling: JJWT exceptions are caught, wrapped in AuthException, and
 * delegated to HandlerExceptionResolver (same pattern as RateLimitFilter →
 * RateLimitExceptionHandler). AuthExceptionHandler (unscoped advice)
 * produces the 401 ProxyError body.
 *
 * Requests without an Authorization header pass through unchanged — they
 * reach authorization checks with no principal. If the route is protected,
 * RestAuthenticationEntryPoint emits the 401 response. Public routes (e.g.,
 * /api/v1/health, /api/v1/proxy/**) proceed normally.
 *
 * <p>Forums Wave Spec 1.5g insertion point: blocklist + session-generation
 * checks AFTER claim extraction, BEFORE principal construction. Pre-1.5g
 * tokens (no {@code jti} claim, no {@code gen} claim) are tolerated per
 * Gate-G-MIGRATION — they pass through the new checks as no-ops. Infrastructure
 * failures (Redis AND Postgres unreachable on the blocklist check, or Postgres
 * unreachable on the session-gen lookup) propagate to the conservative catch-all
 * and produce 401 TOKEN_INVALID (Gate-G-FAIL-CLOSED). The principal carries
 * the {@code jti} so {@code AuthController.logout} can blocklist the current
 * token.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final String BEARER_PREFIX = "Bearer ";

    // Public paths where a Bearer token — even a malformed one — MUST be ignored
    // rather than rejected. Shared with SecurityConfig via PublicPaths.PATTERNS
    // so the two call sites cannot drift. The filter skips these paths entirely
    // so the permitAll() contract holds: "If a client sends Authorization on
    // /api/v1/proxy/**, permitAll() IGNORES the token rather than rejecting it"
    // (spec Decision #5).
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    private final JwtService jwtService;
    private final JwtBlocklistService jwtBlocklistService;
    private final UserRepository userRepository;
    private final HandlerExceptionResolver handlerExceptionResolver;

    public JwtAuthenticationFilter(JwtService jwtService,
                                   JwtBlocklistService jwtBlocklistService,
                                   UserRepository userRepository,
                                   HandlerExceptionResolver handlerExceptionResolver) {
        this.jwtService = jwtService;
        this.jwtBlocklistService = jwtBlocklistService;
        this.userRepository = userRepository;
        this.handlerExceptionResolver = handlerExceptionResolver;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Always skip CORS preflight — permitAll() on OPTIONS is SecurityConfig's
        // job, but running JWT validation on a preflight is pointless and a
        // tampered bearer on preflight should never block the real request.
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }
        // Use getRequestURI() rather than getServletPath() — the latter can be
        // an empty string in MockMvc-driven test contexts, which breaks the
        // pattern match. getRequestURI() is consistent across MockMvc and live
        // Tomcat. Context path is "" in this app so the paths align.
        String path = request.getRequestURI();
        for (String pattern : PublicPaths.PATTERNS) {
            if (pathMatcher.match(pattern, path)) {
                return true;
            }
        }
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            // No token — pass through. SecurityConfig's authorization rules
            // decide whether the route needs auth. Public routes proceed;
            // protected routes route to RestAuthenticationEntryPoint.
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(BEARER_PREFIX.length()).trim();
        try {
            Jws<Claims> jws = jwtService.parseToken(token);
            Claims claims = jws.getPayload();
            UUID userId = UUID.fromString(claims.getSubject());
            Boolean isAdminClaim = claims.get("is_admin", Boolean.class);
            boolean isAdmin = isAdminClaim != null && isAdminClaim;

            // 1.5g: extract jti — tolerate missing claim (Gate-G-MIGRATION). Pre-1.5g
            // tokens have no jti; the blocklist check below is skipped for them.
            String jtiStr = claims.getId();
            UUID jti = null;
            if (jtiStr != null && !jtiStr.isBlank()) {
                try {
                    jti = UUID.fromString(jtiStr);
                } catch (IllegalArgumentException malformed) {
                    log.info("JWT malformed jti claim: {}", malformed.getClass().getSimpleName());
                    handlerExceptionResolver.resolveException(request, response, null,
                        AuthException.tokenMalformed());
                    return;
                }
            }

            // 1.5g: blocklist check — only when jti is present. Exception during the
            // check propagates to the conservative catch-all below → 401 TOKEN_INVALID
            // (Gate-G-FAIL-CLOSED: never authenticate when both Redis AND Postgres
            // are unreachable).
            if (jti != null && jwtBlocklistService.isRevoked(jti)) {
                log.info("JWT revoked jti={}", jti);
                handlerExceptionResolver.resolveException(request, response, null,
                    AuthException.tokenRevoked());
                return;
            }

            // 1.5g: session-generation check — only when claim is present (Gate-G-MIGRATION).
            // Pre-1.5g tokens with no `gen` claim pass through. A claim of `gen=0` on a
            // user whose current row says `session_generation=0` matches and passes.
            Integer claimGen = claims.get("gen", Integer.class);
            if (claimGen != null) {
                Optional<Integer> currentGen = userRepository.getSessionGenerationByUserId(userId);
                if (currentGen.isPresent() && !currentGen.get().equals(claimGen)) {
                    log.info("JWT session generation mismatch jti={} userId={} claimGen={} currentGen={}",
                        jti, userId, claimGen, currentGen.get());
                    handlerExceptionResolver.resolveException(request, response, null,
                        AuthException.tokenRevoked());
                    return;
                }
            }

            // 1.5g: principal carries jti + expiresAt so AuthController.logout can
            // blocklist the current token without re-parsing the JWT.
            AuthenticatedUser principal = new AuthenticatedUser(
                userId, isAdmin, jti, claims.getExpiration().toInstant());
            UsernamePasswordAuthenticationToken authToken =
                new UsernamePasswordAuthenticationToken(principal, null, Collections.emptyList());
            SecurityContextHolder.getContext().setAuthentication(authToken);

            filterChain.doFilter(request, response);
        } catch (ExpiredJwtException e) {
            log.info("JWT expired: {}", e.getMessage());
            handlerExceptionResolver.resolveException(request, response, null,
                AuthException.tokenExpired());
        } catch (SignatureException e) {
            log.info("JWT invalid signature");
            handlerExceptionResolver.resolveException(request, response, null,
                AuthException.tokenInvalid());
        } catch (MalformedJwtException | IllegalArgumentException e) {
            // IllegalArgumentException covers UUID.fromString failure and null/empty tokens
            log.info("JWT malformed: {}", e.getClass().getSimpleName());
            handlerExceptionResolver.resolveException(request, response, null,
                AuthException.tokenMalformed());
        } catch (Exception e) {
            // Conservative catch-all — any other JWT issue is TOKEN_INVALID
            log.warn("JWT parsing failed with unexpected exception", e);
            handlerExceptionResolver.resolveException(request, response, null,
                AuthException.tokenInvalid());
        }
    }
}
