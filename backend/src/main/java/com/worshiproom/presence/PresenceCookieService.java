package com.worshiproom.presence;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;

/**
 * Spec 6.11b — anonymous-session cookie issuance and reading for the Live
 * Presence feature. Used by {@link PresenceTrackingInterceptor} on every
 * anonymous read of the Prayer Wall.
 *
 * <p>Cookie shape (per brief Section 2 / Decisions table):
 * <ul>
 *   <li>Name: {@code wr_presence_session} (configurable)</li>
 *   <li>Value: opaque {@link UUID} string — zero identity</li>
 *   <li>HttpOnly + Secure (Secure flipped per profile) + SameSite=Lax</li>
 *   <li>Path: {@code /api/v1} (wider than just /presence so the interceptor on /posts
 *       can read it too — see Plan-Time Divergence #4)</li>
 *   <li>Max-Age: 90 days (configurable)</li>
 * </ul>
 *
 * <p>Uses Spring's {@link ResponseCookie} (not legacy {@link Cookie}) so SameSite
 * is settable. Reading still uses the legacy {@code Cookie[]} API because
 * {@code HttpServletRequest} only exposes that surface.
 */
@Service
public class PresenceCookieService {

    private final PresenceProperties props;

    public PresenceCookieService(PresenceProperties props) {
        this.props = props;
    }

    /** Extract the session id from the request cookie if present and well-formed. */
    public Optional<String> readSessionId(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return Optional.empty();
        return Arrays.stream(cookies)
            .filter(c -> props.getCookieName().equals(c.getName()))
            .map(Cookie::getValue)
            .filter(this::isValidSessionId)
            .findFirst();
    }

    /** Issue a fresh opaque session id and write the Set-Cookie header. */
    public String issue(HttpServletResponse response) {
        String sessionId = UUID.randomUUID().toString();
        ResponseCookie cookie = ResponseCookie.from(props.getCookieName(), sessionId)
            .httpOnly(true)
            .secure(props.isCookieSecure())
            .sameSite("Lax")
            .path(props.getCookiePath())
            .maxAge(Duration.ofSeconds(props.getCookieMaxAgeSeconds()))
            .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return sessionId;
    }

    /** Defensive validation — must be a parseable UUID, exact 36 chars. */
    private boolean isValidSessionId(String value) {
        if (value == null || value.length() != 36) return false;
        try {
            UUID.fromString(value);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
