package com.worshiproom.post;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Spec 7.4 — Binds {@code worshiproom.friend-prayers.rate-limit.*} from
 * application.properties. Mirrors {@link com.worshiproom.quicklift.QuickLiftStartRateLimitConfig}.
 *
 * <p>Per-user rate limit on {@code GET /api/v1/users/me/friend-prayers-today}.
 * Defaults are prod-strict (60/min); dev profile overrides to 120/min for
 * faster local iteration. Single {@code requestsPerMinute} drives both the
 * bucket capacity and the refill rate via {@code Bandwidth.classic} — there
 * is no separate burst tunable.
 */
@Configuration
@ConfigurationProperties(prefix = "worshiproom.friend-prayers.rate-limit")
public class FriendPrayersRateLimitConfig {

    private int requestsPerMinute = 60;
    private int bucketCacheSize = 10_000;

    public int getRequestsPerMinute() { return requestsPerMinute; }
    public void setRequestsPerMinute(int requestsPerMinute) { this.requestsPerMinute = requestsPerMinute; }
    public int getBucketCacheSize() { return bucketCacheSize; }
    public void setBucketCacheSize(int bucketCacheSize) { this.bucketCacheSize = bucketCacheSize; }
}
