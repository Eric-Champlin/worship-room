package com.worshiproom.presence;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Spec 6.11b — binds {@code worshiproom.presence.*} from application.properties.
 * Covers the Redis sorted-set knobs (key, TTL window) and the anonymous-session
 * cookie shape (name, path, max-age, secure flag — secure flipped per profile).
 *
 * <p>Spring kebab-case relaxed binding: the property
 * {@code worshiproom.presence.cookie-secure} maps to {@code cookieSecure}.
 */
@Configuration
@ConfigurationProperties(prefix = "worshiproom.presence")
public class PresenceProperties {

    /** Redis sorted-set key for active presence members. */
    private String sortedSetKey = "presence:prayer_wall";

    /** Members with score older than this many seconds are considered stale. */
    private int ttlSeconds = 3600;

    /** Cookie name for anonymous-session id. */
    private String cookieName = "wr_presence_session";

    /** Cookie path scope. Wider than just /presence so the interceptor on /posts can read it. */
    private String cookiePath = "/api/v1";

    /** Cookie max-age (90 days by default). */
    private long cookieMaxAgeSeconds = 7_776_000L;

    /** {@code Secure} cookie flag. true in prod (HTTPS); false in dev/test (no HTTPS). */
    private boolean cookieSecure = true;

    public String getSortedSetKey() { return sortedSetKey; }
    public void setSortedSetKey(String sortedSetKey) { this.sortedSetKey = sortedSetKey; }

    public int getTtlSeconds() { return ttlSeconds; }
    public void setTtlSeconds(int ttlSeconds) { this.ttlSeconds = ttlSeconds; }

    public String getCookieName() { return cookieName; }
    public void setCookieName(String cookieName) { this.cookieName = cookieName; }

    public String getCookiePath() { return cookiePath; }
    public void setCookiePath(String cookiePath) { this.cookiePath = cookiePath; }

    public long getCookieMaxAgeSeconds() { return cookieMaxAgeSeconds; }
    public void setCookieMaxAgeSeconds(long cookieMaxAgeSeconds) { this.cookieMaxAgeSeconds = cookieMaxAgeSeconds; }

    public boolean isCookieSecure() { return cookieSecure; }
    public void setCookieSecure(boolean cookieSecure) { this.cookieSecure = cookieSecure; }
}
