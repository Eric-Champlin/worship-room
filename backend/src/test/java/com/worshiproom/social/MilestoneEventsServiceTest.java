package com.worshiproom.social;

import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class MilestoneEventsServiceTest extends AbstractIntegrationTest {

    @Autowired private MilestoneEventsService service;
    @Autowired private UserRepository userRepository;
    @Autowired private JdbcTemplate jdbc;

    private UUID userId;

    @BeforeEach
    void seedUser() {
        userRepository.deleteAll();
        User u = userRepository.save(new User("milestone@example.com", "$2a$10$x", "Mile", "Stone", "UTC"));
        userId = u.getId();
    }

    @Test
    void recordEvent_streakMilestone_persistsRow() {
        service.recordEvent(userId, MilestoneEventType.STREAK_MILESTONE,
            Map.of("streakDays", 30));

        Map<String, Object> row = jdbc.queryForMap(
            "SELECT event_type, event_metadata::text AS m FROM milestone_events WHERE user_id = ?",
            userId);
        assertThat(row.get("event_type")).isEqualTo("streak_milestone");
        assertThat(row.get("m").toString()).contains("\"streakDays\"").contains("30");
    }

    @Test
    void recordEvent_levelUp_persistsRow() {
        service.recordEvent(userId, MilestoneEventType.LEVEL_UP,
            Map.of("newLevel", 3));

        Map<String, Object> row = jdbc.queryForMap(
            "SELECT event_type, event_metadata::text AS m FROM milestone_events WHERE user_id = ?",
            userId);
        assertThat(row.get("event_type")).isEqualTo("level_up");
        assertThat(row.get("m").toString()).contains("\"newLevel\"").contains("3");
    }

    @Test
    void recordEvent_badgeEarned_persistsRow() {
        service.recordEvent(userId, MilestoneEventType.BADGE_EARNED,
            Map.of("badgeId", "first_prayer"));

        Map<String, Object> row = jdbc.queryForMap(
            "SELECT event_type, event_metadata::text AS m FROM milestone_events WHERE user_id = ?",
            userId);
        assertThat(row.get("event_type")).isEqualTo("badge_earned");
        assertThat(row.get("m").toString()).contains("\"badgeId\"").contains("first_prayer");
    }
}
