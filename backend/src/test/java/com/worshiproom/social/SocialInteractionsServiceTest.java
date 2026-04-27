package com.worshiproom.social;

import com.worshiproom.friends.FriendRelationshipStatus;
import com.worshiproom.friends.InvalidInputException;
import com.worshiproom.friends.SelfActionException;
import com.worshiproom.friends.UserNotFoundException;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SocialInteractionsServiceTest extends AbstractIntegrationTest {

    @Autowired private SocialInteractionsService service;
    @Autowired private UserRepository userRepository;
    @Autowired private JdbcTemplate jdbc;

    private User userA;
    private User userB;
    private User userC;

    @BeforeEach
    void seedUsers() {
        // Targeted cleanup of social_interactions to keep this test class hermetic;
        // userRepository.deleteAll() cascades to social_interactions via FK ON DELETE CASCADE.
        userRepository.deleteAll();
        userA = userRepository.save(new User("alice-soc@example.com", "$2a$10$x", "Alice", "Anderson", "UTC"));
        userB = userRepository.save(new User("bob-soc@example.com", "$2a$10$x", "Bob", "Bennett", "UTC"));
        userC = userRepository.save(new User("carol-soc@example.com", "$2a$10$x", "Carol", "Chen", "UTC"));
        // userA <-> userB friendship (active in both directions)
        jdbc.update(
            "INSERT INTO friend_relationships (user_id, friend_user_id, status) VALUES (?, ?, ?)",
            userA.getId(), userB.getId(), FriendRelationshipStatus.ACTIVE.value());
        jdbc.update(
            "INSERT INTO friend_relationships (user_id, friend_user_id, status) VALUES (?, ?, ?)",
            userB.getId(), userA.getId(), FriendRelationshipStatus.ACTIVE.value());
    }

    // ---------------------------------------------------------------
    // sendEncouragement
    // ---------------------------------------------------------------
    @Nested
    @DisplayName("sendEncouragement")
    class SendEncouragement {

        @Test
        void sendEncouragement_happyPath_createsRowWithMessagePayload() {
            SocialInteraction row = service.sendEncouragement(
                userA.getId(), userB.getId(), "Praying for you.");

            assertThat(row.getId()).isNotNull();
            assertThat(row.getCreatedAt()).isNotNull();

            String storedPayload = jdbc.queryForObject(
                "SELECT payload::text FROM social_interactions WHERE id = ?",
                String.class, row.getId());
            assertThat(storedPayload).contains("\"message\"").contains("Praying for you.");
        }

        @Test
        void sendEncouragement_toSelf_throwsSelfActionException() {
            assertThatThrownBy(() ->
                service.sendEncouragement(userA.getId(), userA.getId(), "self"))
                .isInstanceOf(SelfActionException.class);
        }

        @Test
        void sendEncouragement_toDeletedUser_throwsUserNotFoundException() {
            jdbc.update("UPDATE users SET is_deleted = TRUE WHERE id = ?", userB.getId());
            assertThatThrownBy(() ->
                service.sendEncouragement(userA.getId(), userB.getId(), "msg"))
                .isInstanceOf(UserNotFoundException.class);
        }

        @Test
        void sendEncouragement_toBannedUser_throwsUserNotFoundException() {
            jdbc.update("UPDATE users SET is_banned = TRUE WHERE id = ?", userB.getId());
            assertThatThrownBy(() ->
                service.sendEncouragement(userA.getId(), userB.getId(), "msg"))
                .isInstanceOf(UserNotFoundException.class);
        }

        @Test
        void sendEncouragement_toNonFriend_throwsSocialNotFriendsException() {
            // userA <-> userC has no friendship row.
            assertThatThrownBy(() ->
                service.sendEncouragement(userA.getId(), userC.getId(), "msg"))
                .isInstanceOf(NotFriendsException.class)
                .satisfies(ex -> {
                    NotFriendsException nfe = (NotFriendsException) ex;
                    // Verify HTTP 403 (vs friends-package version's 404).
                    assertThat(nfe.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(nfe.getCode()).isEqualTo("NOT_FRIENDS");
                });
        }

        @Test
        void sendEncouragement_atHourlyCap_throwsRateLimited() {
            // Hourly cap = 60 (recipient-agnostic). Per-friend daily cap = 3.
            // Seed 60 rows userA -> userC via JdbcTemplate (bypassing service
            // validation, since A and C are not friends). The hourly query
            // counts ALL encouragements from userA, so the 61st A -> B trips
            // the hourly cap before per-friend is even checked.
            for (int i = 0; i < 60; i++) {
                jdbc.update(
                    "INSERT INTO social_interactions "
                  + "(from_user_id, to_user_id, interaction_type, payload) "
                  + "VALUES (?, ?, 'encouragement', '{}'::jsonb)",
                    userA.getId(), userC.getId());
            }

            assertThatThrownBy(() ->
                service.sendEncouragement(userA.getId(), userB.getId(), "msg"))
                .isInstanceOf(RateLimitedException.class)
                .hasMessageContaining("Hourly");
        }

        @Test
        void sendEncouragement_atDailyCapPerFriend_throwsRateLimited() {
            // Default per-friend daily cap = 3. Seed 3 rows from userA to userB.
            for (int i = 0; i < 3; i++) {
                service.sendEncouragement(userA.getId(), userB.getId(), "msg-" + i);
            }
            assertThatThrownBy(() ->
                service.sendEncouragement(userA.getId(), userB.getId(), "msg-4"))
                .isInstanceOf(RateLimitedException.class)
                .hasMessageContaining("Daily");
        }

        @Test
        void sendEncouragement_belowAllCaps_succeeds() {
            SocialInteraction row1 = service.sendEncouragement(userA.getId(), userB.getId(), "one");
            SocialInteraction row2 = service.sendEncouragement(userA.getId(), userB.getId(), "two");
            assertThat(row1.getId()).isNotEqualTo(row2.getId());
        }
    }

    // ---------------------------------------------------------------
    // sendNudge
    // ---------------------------------------------------------------
    @Nested
    @DisplayName("sendNudge")
    class SendNudge {

        @Test
        void sendNudge_happyPath_createsRowWithNullPayload() {
            SocialInteraction row = service.sendNudge(userA.getId(), userB.getId());
            assertThat(row.getId()).isNotNull();
            assertThat(row.getInteractionType()).isEqualTo(SocialInteractionType.NUDGE);
            // payload is null — nudges carry no body
            String storedPayload = jdbc.queryForObject(
                "SELECT payload::text FROM social_interactions WHERE id = ?",
                String.class, row.getId());
            assertThat(storedPayload).isNull();
        }

        @Test
        void sendNudge_toNonFriend_throwsSocialNotFriendsException() {
            assertThatThrownBy(() ->
                service.sendNudge(userA.getId(), userC.getId()))
                .isInstanceOf(NotFriendsException.class)
                .satisfies(ex ->
                    assertThat(((NotFriendsException) ex).getStatus())
                        .isEqualTo(HttpStatus.FORBIDDEN));
        }

        @Test
        void sendNudge_withinCooldown_throwsNudgeCooldownException() {
            // Seed nudge 3 days ago. cooldownDays = 7 by default → still active.
            OffsetDateTime threeDaysAgo = OffsetDateTime.now(ZoneOffset.UTC).minusDays(3);
            UUID priorNudgeId = UUID.randomUUID();
            jdbc.update(
                "INSERT INTO social_interactions "
              + "(id, from_user_id, to_user_id, interaction_type, payload, created_at) "
              + "VALUES (?, ?, ?, 'nudge', NULL, ?)",
                priorNudgeId, userA.getId(), userB.getId(), threeDaysAgo);

            assertThatThrownBy(() -> service.sendNudge(userA.getId(), userB.getId()))
                .isInstanceOf(NudgeCooldownException.class);
        }

        @Test
        void sendNudge_pastCooldown_succeeds() {
            // Seed nudge 8 days ago. cooldownDays = 7 → cooldown expired.
            OffsetDateTime eightDaysAgo = OffsetDateTime.now(ZoneOffset.UTC).minusDays(8);
            UUID priorNudgeId = UUID.randomUUID();
            jdbc.update(
                "INSERT INTO social_interactions "
              + "(id, from_user_id, to_user_id, interaction_type, payload, created_at) "
              + "VALUES (?, ?, ?, 'nudge', NULL, ?)",
                priorNudgeId, userA.getId(), userB.getId(), eightDaysAgo);

            SocialInteraction row = service.sendNudge(userA.getId(), userB.getId());
            assertThat(row.getId()).isNotEqualTo(priorNudgeId);
        }

        @Test
        void sendNudge_atHourlyCap_throwsRateLimited() {
            // Default hourly cap = 60. Seed 60 nudges from userA in last hour.
            for (int i = 0; i < 60; i++) {
                jdbc.update(
                    "INSERT INTO social_interactions "
                  + "(from_user_id, to_user_id, interaction_type, payload) "
                  + "VALUES (?, ?, 'nudge', NULL)",
                    userA.getId(), userC.getId());
            }
            // userA <-> userB friendship ok, but hourly cap trips first
            assertThatThrownBy(() -> service.sendNudge(userA.getId(), userB.getId()))
                .isInstanceOf(RateLimitedException.class)
                .hasMessageContaining("Hourly");
        }
    }

    // ---------------------------------------------------------------
    // dismissRecap
    // ---------------------------------------------------------------
    @Nested
    @DisplayName("dismissRecap")
    class DismissRecap {

        @Test
        void dismissRecap_happyPath_createsSelfRow() {
            SocialInteraction row = service.dismissRecap(userA.getId(), "2026-04-21");
            assertThat(row.getFromUserId()).isEqualTo(userA.getId());
            assertThat(row.getToUserId()).isEqualTo(userA.getId()); // self-row
            assertThat(row.getInteractionType()).isEqualTo(SocialInteractionType.RECAP_DISMISSAL);

            String storedPayload = jdbc.queryForObject(
                "SELECT payload::text FROM social_interactions WHERE id = ?",
                String.class, row.getId());
            assertThat(storedPayload).contains("\"weekStart\"").contains("2026-04-21");
        }

        @Test
        void dismissRecap_invalidWeekStartFormat_throwsInvalidInputException() {
            // The @Pattern on the DTO catches bad inputs before the service is invoked,
            // but the service's defensive parse remains in case a future direct caller
            // bypasses the DTO. Verify the parse-fallback path here.
            assertThatThrownBy(() -> service.dismissRecap(userA.getId(), "not-a-date"))
                .isInstanceOf(InvalidInputException.class);
        }
    }
}
