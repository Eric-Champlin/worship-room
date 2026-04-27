package com.worshiproom.social;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds {@code worshiproom.social.*} properties from application.properties.
 *
 * <p>Frontend constants in {@code frontend/src/constants/dashboard/encouragements.ts}
 * MUST agree with these values — drift between the two sides means inconsistent UX
 * (frontend rejects locally on a different boundary than backend enforces). The
 * frontend is the canonical source today; the backend mirrors it. A future Phase
 * 2.5+ cutover spec may flip canonical-source ownership to the backend.
 *
 * <p>Pattern mirrors {@link com.worshiproom.config.ProxyConfig} and
 * {@link com.worshiproom.auth.JwtConfig}: POJO with getters/setters, nested static
 * property classes, {@code @Configuration @ConfigurationProperties}.
 */
@Configuration
@ConfigurationProperties(prefix = "worshiproom.social")
public class SocialLimitsConfig {

    private Encouragement encouragement = new Encouragement();
    private Nudge nudge = new Nudge();

    public Encouragement getEncouragement() { return encouragement; }
    public void setEncouragement(Encouragement encouragement) { this.encouragement = encouragement; }
    public Nudge getNudge() { return nudge; }
    public void setNudge(Nudge nudge) { this.nudge = nudge; }

    public static class Encouragement {
        private int dailyCapPerFriend = 3;
        private int hourlyCapPerUser = 60;
        public int getDailyCapPerFriend() { return dailyCapPerFriend; }
        public void setDailyCapPerFriend(int dailyCapPerFriend) { this.dailyCapPerFriend = dailyCapPerFriend; }
        public int getHourlyCapPerUser() { return hourlyCapPerUser; }
        public void setHourlyCapPerUser(int hourlyCapPerUser) { this.hourlyCapPerUser = hourlyCapPerUser; }
    }

    public static class Nudge {
        private int cooldownDays = 7;
        private int hourlyCapPerUser = 60;
        public int getCooldownDays() { return cooldownDays; }
        public void setCooldownDays(int cooldownDays) { this.cooldownDays = cooldownDays; }
        public int getHourlyCapPerUser() { return hourlyCapPerUser; }
        public void setHourlyCapPerUser(int hourlyCapPerUser) { this.hourlyCapPerUser = hourlyCapPerUser; }
    }
}
