package com.worshiproom.verse;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds {@code worshiproom.verse-finds-you.*} from application.properties
 * (Spring {@code @ConfigurationProperties} prefixes are kebab-case; the Java
 * field names remain camelCase via Spring's relaxed-binding rules — e.g.,
 * {@code requests-per-hour} maps to {@code requestsPerHour}).
 *
 * <p>Per Phase 3 Addendum item 5 / 02-security.md § "BOUNDED EXTERNAL-INPUT CACHES":
 * the bucket map is bounded ({@code bucketMapMaxSize}) with TTL-based eviction
 * ({@code bucketMapTtlMinutes}, slightly longer than the rate window) to prevent
 * unbounded growth under per-user keying.
 */
@Configuration
@ConfigurationProperties(prefix = "worshiproom.verse-finds-you")
public class VerseFindsYouRateLimitConfig {

    private int requestsPerHour = 10;
    private int bucketMapMaxSize = 10_000;
    private int bucketMapTtlMinutes = 120;

    public int getRequestsPerHour() { return requestsPerHour; }
    public void setRequestsPerHour(int requestsPerHour) { this.requestsPerHour = requestsPerHour; }
    public int getBucketMapMaxSize() { return bucketMapMaxSize; }
    public void setBucketMapMaxSize(int bucketMapMaxSize) { this.bucketMapMaxSize = bucketMapMaxSize; }
    public int getBucketMapTtlMinutes() { return bucketMapTtlMinutes; }
    public void setBucketMapTtlMinutes(int bucketMapTtlMinutes) { this.bucketMapTtlMinutes = bucketMapTtlMinutes; }
}
