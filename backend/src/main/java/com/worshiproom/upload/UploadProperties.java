package com.worshiproom.upload;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds {@code worshiproom.uploads.*} from application.properties (Spec 4.6b).
 *
 * <p>Service-layer file-size cap (max-size-bytes) is the user-facing limit;
 * Spring's {@code spring.servlet.multipart.max-file-size} is a higher
 * protocol-layer safety net that returns 413 PAYLOAD_TOO_LARGE before the
 * request body reaches the controller.
 *
 * <p>Bucket cache size is bounded per the BOUNDED EXTERNAL-INPUT CACHES rule
 * (02-security.md). The {@code RateLimit} sub-class mirrors the shape of
 * {@link com.worshiproom.post.PostsRateLimitConfig.RateLimit}.
 */
@Configuration
@ConfigurationProperties(prefix = "worshiproom.uploads")
public class UploadProperties {

    private long maxSizeBytes = 5_242_880L;
    private int maxDimension = 4000;
    private int pendingTtlHours = 24;
    private RateLimit rateLimit = new RateLimit();
    private String cdnBaseUrl = "";

    public long getMaxSizeBytes() { return maxSizeBytes; }
    public void setMaxSizeBytes(long maxSizeBytes) { this.maxSizeBytes = maxSizeBytes; }

    public int getMaxDimension() { return maxDimension; }
    public void setMaxDimension(int maxDimension) { this.maxDimension = maxDimension; }

    public int getPendingTtlHours() { return pendingTtlHours; }
    public void setPendingTtlHours(int pendingTtlHours) { this.pendingTtlHours = pendingTtlHours; }

    public RateLimit getRateLimit() { return rateLimit; }
    public void setRateLimit(RateLimit rateLimit) { this.rateLimit = rateLimit; }

    public String getCdnBaseUrl() { return cdnBaseUrl; }
    public void setCdnBaseUrl(String cdnBaseUrl) { this.cdnBaseUrl = cdnBaseUrl; }

    public static class RateLimit {
        private int maxPerHour = 10;
        private int bucketCacheSize = 10_000;

        public int getMaxPerHour() { return maxPerHour; }
        public void setMaxPerHour(int maxPerHour) { this.maxPerHour = maxPerHour; }

        public int getBucketCacheSize() { return bucketCacheSize; }
        public void setBucketCacheSize(int bucketCacheSize) { this.bucketCacheSize = bucketCacheSize; }
    }
}
