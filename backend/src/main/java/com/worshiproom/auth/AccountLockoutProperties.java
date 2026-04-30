package com.worshiproom.auth;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

/**
 * Persistent account-lockout policy (Spec 1.5f).
 *
 * <p>Complements the in-memory {@link LoginRateLimitFilter} (Spec 1.5) with a
 * DB-persisted layer that survives JVM restarts and provides a forensic audit
 * trail. Thresholds intentionally match the per-email rate-limit values so
 * both layers fire at the same moment for consistent UX.
 *
 * <p>POJO (not a record) per Spec 1.5f Plan-Time Divergence — matches the
 * existing codebase precedent ({@code PostsRateLimitConfig}, {@code StorageProperties},
 * {@code JwtConfig} etc.) and works most cleanly with {@code @ConfigurationProperties}
 * relaxed binding plus {@code @Configuration} registration. The plan's record approach
 * required {@code @EnableConfigurationProperties} on {@code WorshipRoomApplication};
 * the class approach self-registers.
 */
@Configuration
@ConfigurationProperties(prefix = "auth.lockout")
@Validated
public class AccountLockoutProperties {

    @Min(1) private int maxFailuresPerWindow = 5;
    @Min(1) private int windowMinutes = 15;
    @Min(1) private int durationMinutes = 15;

    public int getMaxFailuresPerWindow() { return maxFailuresPerWindow; }
    public void setMaxFailuresPerWindow(int maxFailuresPerWindow) {
        this.maxFailuresPerWindow = maxFailuresPerWindow;
    }
    public int getWindowMinutes() { return windowMinutes; }
    public void setWindowMinutes(int windowMinutes) { this.windowMinutes = windowMinutes; }
    public int getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(int durationMinutes) { this.durationMinutes = durationMinutes; }

    // Record-style accessor aliases to keep callers terse.
    public int maxFailuresPerWindow() { return maxFailuresPerWindow; }
    public int windowMinutes() { return windowMinutes; }
    public int durationMinutes() { return durationMinutes; }
}
