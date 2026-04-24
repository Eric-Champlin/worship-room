package com.worshiproom.config;

import com.worshiproom.proxy.common.IpResolver;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Proxy-foundation configuration.
 *
 * Binds all `proxy.*` properties from application.properties to a typed
 * Java object so other classes can inject {@link ProxyConfig} and read
 * settings type-safely instead of using {@code @Value("${proxy.*}")}.
 *
 * Also exposes shared infrastructure beans (WebClient, IpResolver) that
 * subsequent proxy specs depend on.
 */
@Configuration
@ConfigurationProperties(prefix = "proxy")
public class ProxyConfig {

    private RateLimitProperties rateLimit = new RateLimitProperties();
    private UpstreamProperties upstream = new UpstreamProperties();
    private long maxRequestBodyBytes = 65536;
    private boolean trustForwardedHeaders = false;
    private GeminiProperties gemini = new GeminiProperties();
    private GoogleMapsProperties googleMaps = new GoogleMapsProperties();
    private FcbhProperties fcbh = new FcbhProperties();

    // ─── Beans ──────────────────────────────────────────────────────────

    @Bean
    public WebClient proxyWebClient() {
        return WebClient.builder()
            .codecs(configurer -> configurer.defaultCodecs()
                .maxInMemorySize((int) maxRequestBodyBytes))
            .build();
    }

    @Bean
    public IpResolver ipResolver() {
        return new IpResolver(trustForwardedHeaders);
    }

    // ─── Getters / setters (Spring needs these for property binding) ────

    public RateLimitProperties getRateLimit() { return rateLimit; }
    public void setRateLimit(RateLimitProperties rateLimit) { this.rateLimit = rateLimit; }
    public UpstreamProperties getUpstream() { return upstream; }
    public void setUpstream(UpstreamProperties upstream) { this.upstream = upstream; }
    public long getMaxRequestBodyBytes() { return maxRequestBodyBytes; }
    public void setMaxRequestBodyBytes(long maxRequestBodyBytes) { this.maxRequestBodyBytes = maxRequestBodyBytes; }
    public boolean isTrustForwardedHeaders() { return trustForwardedHeaders; }
    public void setTrustForwardedHeaders(boolean trustForwardedHeaders) { this.trustForwardedHeaders = trustForwardedHeaders; }
    public GeminiProperties getGemini() { return gemini; }
    public void setGemini(GeminiProperties gemini) { this.gemini = gemini; }
    public GoogleMapsProperties getGoogleMaps() { return googleMaps; }
    public void setGoogleMaps(GoogleMapsProperties googleMaps) { this.googleMaps = googleMaps; }
    public FcbhProperties getFcbh() { return fcbh; }
    public void setFcbh(FcbhProperties fcbh) { this.fcbh = fcbh; }

    // ─── Nested property classes ────────────────────────────────────────

    public static class RateLimitProperties {
        private int requestsPerMinute = 60;
        private int burstCapacity = 10;
        public int getRequestsPerMinute() { return requestsPerMinute; }
        public void setRequestsPerMinute(int requestsPerMinute) { this.requestsPerMinute = requestsPerMinute; }
        public int getBurstCapacity() { return burstCapacity; }
        public void setBurstCapacity(int burstCapacity) { this.burstCapacity = burstCapacity; }
    }

    public static class UpstreamProperties {
        private long defaultTimeoutMs = 10_000;
        public long getDefaultTimeoutMs() { return defaultTimeoutMs; }
        public void setDefaultTimeoutMs(long defaultTimeoutMs) { this.defaultTimeoutMs = defaultTimeoutMs; }
    }

    public static class GeminiProperties {
        private String apiKey = "";
        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
        public boolean isConfigured() { return apiKey != null && !apiKey.isBlank(); }
    }

    public static class GoogleMapsProperties {
        private String apiKey = "";
        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
        public boolean isConfigured() { return apiKey != null && !apiKey.isBlank(); }
    }

    public static class FcbhProperties {
        private String apiKey = "";
        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
        public boolean isConfigured() { return apiKey != null && !apiKey.isBlank(); }
    }
}
