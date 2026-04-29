package com.worshiproom.post;

import java.time.Clock;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Binds {@code worshiproom.qotd.cache.*} from application.properties.
 * Per Phase 3 Execution Reality Addendum item 5 — bounded-cache pattern with
 * @ConfigurationProperties; never @Value-injected magic numbers and never
 * ConcurrentHashMap keyed on external input.
 *
 * <p>The cache itself is keyed by {@link java.time.LocalDate} (server-derived,
 * not external input), but the bounded-cache convention applies project-wide
 * for any feature-level cache (Spec 3.9 D2).
 *
 * <p>Also exposes a {@link Clock} bean so {@code QotdService} can compute
 * "today" against an injected clock for testability — production wiring
 * defaults to {@link Clock#systemUTC()}.
 */
@Configuration
@ConfigurationProperties(prefix = "worshiproom.qotd")
public class QotdProperties {

    private Cache cache = new Cache();

    public Cache getCache() { return cache; }
    public void setCache(Cache cache) { this.cache = cache; }

    @Bean
    public Clock qotdClock() {
        return Clock.systemUTC();
    }

    public static class Cache {
        /**
         * Maximum number of {@code (LocalDate -> QotdQuestion)} entries held in memory.
         * Default 2: today plus a one-day buffer for clock-edge / UTC-crossing cases.
         */
        private int maxSize = 2;

        public int getMaxSize() { return maxSize; }
        public void setMaxSize(int maxSize) { this.maxSize = maxSize; }
    }
}
