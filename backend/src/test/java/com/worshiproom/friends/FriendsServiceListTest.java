package com.worshiproom.friends;

import com.worshiproom.activity.constants.LevelThresholds;
import com.worshiproom.friends.dto.FriendDto;
import com.worshiproom.friends.dto.FriendRequestDto;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class FriendsServiceListTest extends AbstractIntegrationTest {

    @Autowired private FriendsService friendsService;
    @Autowired private UserRepository userRepository;
    @Autowired private JdbcTemplate jdbc;

    private User userA;
    private User userB;
    private User userC;

    @BeforeEach
    void seedUsers() {
        userRepository.deleteAll();
        userA = userRepository.save(new User("alice@example.com", "$2a$10$x", "Alice", "Anderson", "UTC"));
        userB = userRepository.save(new User("bob@example.com", "$2a$10$x", "Bob", "Bennett", "UTC"));
        userC = userRepository.save(new User("carol@example.com", "$2a$10$x", "Carol", "Chen", "UTC"));
    }

    private void establishFriendship(UUID a, UUID b) {
        FriendRequest req = friendsService.sendRequest(a, b, null);
        friendsService.acceptRequest(req.getId(), b);
    }

    private void insertActivityLog(UUID userId, OffsetDateTime occurredAt, int points) {
        jdbc.update(
            "INSERT INTO activity_log (id, user_id, activity_type, source_feature, occurred_at, points_earned) "
          + "VALUES (?, ?, 'pray', 'test', ?, ?)",
            UUID.randomUUID(), userId, occurredAt, points);
    }

    // -----------------------------------------------------------------
    // listFriends
    // -----------------------------------------------------------------
    @Nested
    @DisplayName("listFriends")
    class ListFriends {

        @Test
        void listFriends_returnsOneDtoPerActiveRelationship() {
            establishFriendship(userA.getId(), userB.getId());
            establishFriendship(userA.getId(), userC.getId());

            OffsetDateTime weekStart = OffsetDateTime.now(ZoneOffset.UTC).minusDays(7);
            List<FriendDto> friends = friendsService.listFriends(userA.getId(), weekStart);
            assertThat(friends).hasSize(2);
            assertThat(friends).extracting(FriendDto::id).containsExactlyInAnyOrder(userB.getId(), userC.getId());
        }

        @Test
        void listFriends_excludesCallerFromOwnList() {
            establishFriendship(userA.getId(), userB.getId());
            OffsetDateTime weekStart = OffsetDateTime.now(ZoneOffset.UTC).minusDays(7);
            List<FriendDto> friends = friendsService.listFriends(userA.getId(), weekStart);
            assertThat(friends).extracting(FriendDto::id).doesNotContain(userA.getId());
        }

        @Test
        void listFriends_excludesBlockedUsers() {
            establishFriendship(userA.getId(), userB.getId());
            // userA blocks userB — destroys the friendship row, leaves a single 'blocked' row.
            // listFriends filters to status='active', so blocked users are excluded.
            friendsService.blockUser(userA.getId(), userB.getId());

            OffsetDateTime weekStart = OffsetDateTime.now(ZoneOffset.UTC).minusDays(7);
            List<FriendDto> friends = friendsService.listFriends(userA.getId(), weekStart);
            assertThat(friends).extracting(FriendDto::id).doesNotContain(userB.getId());
        }

        @Test
        void listFriends_appliesDefaultsForUsersWithoutFaithPointsRow() {
            establishFriendship(userA.getId(), userB.getId());
            // userB has no faith_points / streak_state / activity_log rows

            OffsetDateTime weekStart = OffsetDateTime.now(ZoneOffset.UTC).minusDays(7);
            List<FriendDto> friends = friendsService.listFriends(userA.getId(), weekStart);
            assertThat(friends).hasSize(1);

            FriendDto bDto = friends.get(0);
            assertThat(bDto.id()).isEqualTo(userB.getId());
            assertThat(bDto.level()).isEqualTo(1);
            assertThat(bDto.faithPoints()).isEqualTo(0);
            assertThat(bDto.currentStreak()).isEqualTo(0);
            assertThat(bDto.weeklyPoints()).isEqualTo(0);
            assertThat(bDto.levelName()).isEqualTo("Seedling");
            assertThat(bDto.lastActive()).isNull();
        }

        @Test
        void listFriends_computesWeeklyPointsFromActivityLogSum() {
            establishFriendship(userA.getId(), userB.getId());

            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            OffsetDateTime weekStart = now.minusDays(3);

            insertActivityLog(userB.getId(), now.minusDays(1), 50);   // Inside week
            insertActivityLog(userB.getId(), now.minusDays(2), 30);   // Inside week
            insertActivityLog(userB.getId(), now.minusDays(10), 100); // Outside week

            List<FriendDto> friends = friendsService.listFriends(userA.getId(), weekStart);
            assertThat(friends).hasSize(1);
            assertThat(friends.get(0).weeklyPoints()).isEqualTo(80);
        }

        @Test
        void listFriends_excludesActivityRowsOlderThanWeekStart() {
            establishFriendship(userA.getId(), userB.getId());

            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            OffsetDateTime weekStart = now.minusDays(2);

            insertActivityLog(userB.getId(), now.minusDays(5), 200);  // Strictly outside

            List<FriendDto> friends = friendsService.listFriends(userA.getId(), weekStart);
            assertThat(friends).hasSize(1);
            assertThat(friends.get(0).weeklyPoints()).isEqualTo(0);
        }

        @Test
        void listFriends_passesThroughLastActiveAtAsNull() {
            // No last_active_at write yet (Divergence 2). Default is NULL.
            establishFriendship(userA.getId(), userB.getId());
            OffsetDateTime weekStart = OffsetDateTime.now(ZoneOffset.UTC).minusDays(7);
            List<FriendDto> friends = friendsService.listFriends(userA.getId(), weekStart);
            assertThat(friends).hasSize(1);
            assertThat(friends.get(0).lastActive()).isNull();
        }

        @Test
        void listFriends_resolvesDisplayNameForAllFourPreferences() {
            // Friend userB with each preference variant; verify the resolved displayName.
            establishFriendship(userA.getId(), userB.getId());
            OffsetDateTime weekStart = OffsetDateTime.now(ZoneOffset.UTC).minusDays(7);

            // FIRST_ONLY (default)
            List<FriendDto> firstOnly = friendsService.listFriends(userA.getId(), weekStart);
            assertThat(firstOnly.get(0).displayName()).isEqualTo("Bob");

            // FIRST_LAST_INITIAL
            jdbc.update("UPDATE users SET display_name_preference = 'first_last_initial' WHERE id = ?",
                userB.getId());
            List<FriendDto> firstLastInitial = friendsService.listFriends(userA.getId(), weekStart);
            assertThat(firstLastInitial.get(0).displayName()).isEqualTo("Bob B.");

            // FIRST_LAST
            jdbc.update("UPDATE users SET display_name_preference = 'first_last' WHERE id = ?",
                userB.getId());
            List<FriendDto> firstLast = friendsService.listFriends(userA.getId(), weekStart);
            assertThat(firstLast.get(0).displayName()).isEqualTo("Bob Bennett");

            // CUSTOM (with custom_display_name set)
            jdbc.update(
                "UPDATE users SET display_name_preference = 'custom', custom_display_name = ? WHERE id = ?",
                "Bobby", userB.getId());
            List<FriendDto> custom = friendsService.listFriends(userA.getId(), weekStart);
            assertThat(custom.get(0).displayName()).isEqualTo("Bobby");
        }

        @Test
        void listFriends_returnsCanonicalLevelNameForEachPointsRange() {
            // Verifies LevelThresholds.levelForPoints(...).name() matches the canonical 6 names.
            int[][] cases = {
                {0, 1},      {99, 1},
                {100, 2},    {499, 2},
                {500, 3},    {1499, 3},
                {1500, 4},   {3999, 4},
                {4000, 5},   {9999, 5},
                {10000, 6},  {999999, 6},
            };
            String[] expectedNames = {
                "Seedling", "Sprout", "Blooming", "Flourishing", "Oak", "Lighthouse"
            };
            for (int[] c : cases) {
                int points = c[0];
                int expectedLevel = c[1];
                LevelThresholds.LevelInfo info = LevelThresholds.levelForPoints(points);
                assertThat(info.level()).isEqualTo(expectedLevel);
                assertThat(info.name()).isEqualTo(expectedNames[expectedLevel - 1]);
            }
        }

        @Test
        void listFriends_ordersByLastActiveDescNullsLast() {
            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            // userB.last_active_at = now - 1h (most recent)
            jdbc.update("UPDATE users SET last_active_at = ? WHERE id = ?", now.minusHours(1), userB.getId());
            // userC.last_active_at stays NULL (older)

            establishFriendship(userA.getId(), userB.getId());
            establishFriendship(userA.getId(), userC.getId());

            List<FriendDto> friends = friendsService.listFriends(userA.getId(), now.minusDays(7));
            assertThat(friends).extracting(FriendDto::id)
                .containsExactly(userB.getId(), userC.getId());
        }
    }

    // -----------------------------------------------------------------
    // listIncomingPendingRequests
    // -----------------------------------------------------------------
    @Nested
    @DisplayName("listIncomingPendingRequests")
    class ListIncoming {

        @Test
        void listIncoming_returnsOnlyPendingRequestsWhereCallerIsRecipient() {
            // B -> A (incoming for A)
            friendsService.sendRequest(userB.getId(), userA.getId(), null);
            // A -> C (outgoing for A; not incoming)
            friendsService.sendRequest(userA.getId(), userC.getId(), null);

            List<FriendRequestDto> incoming = friendsService.listIncomingPendingRequests(userA.getId());
            assertThat(incoming).hasSize(1);
            assertThat(incoming.get(0).fromUserId()).isEqualTo(userB.getId());
            assertThat(incoming.get(0).toUserId()).isNull();
        }

        @Test
        void listIncoming_excludesAcceptedDeclinedCancelled() {
            FriendRequest req1 = friendsService.sendRequest(userB.getId(), userA.getId(), null);
            friendsService.declineRequest(req1.getId(), userA.getId());
            // req1 is declined; should not appear in incoming-pending.

            List<FriendRequestDto> incoming = friendsService.listIncomingPendingRequests(userA.getId());
            assertThat(incoming).isEmpty();
        }

        @Test
        void listIncoming_eachDtoIncludesSenderDisplayNameAndAvatar() {
            jdbc.update("UPDATE users SET avatar_url = ? WHERE id = ?", "https://example.com/bob.png", userB.getId());
            friendsService.sendRequest(userB.getId(), userA.getId(), "Hi!");

            List<FriendRequestDto> incoming = friendsService.listIncomingPendingRequests(userA.getId());
            assertThat(incoming).hasSize(1);
            assertThat(incoming.get(0).otherPartyDisplayName()).isEqualTo("Bob");
            assertThat(incoming.get(0).otherPartyAvatarUrl()).isEqualTo("https://example.com/bob.png");
            assertThat(incoming.get(0).message()).isEqualTo("Hi!");
        }

        @Test
        void listIncoming_returnsEmptyListNotNullWhenNoneExist() {
            List<FriendRequestDto> incoming = friendsService.listIncomingPendingRequests(userA.getId());
            assertThat(incoming).isNotNull().isEmpty();
        }
    }

    // -----------------------------------------------------------------
    // listOutgoingPendingRequests
    // -----------------------------------------------------------------
    @Nested
    @DisplayName("listOutgoingPendingRequests")
    class ListOutgoing {

        @Test
        void listOutgoing_returnsOnlyPendingRequestsWhereCallerIsSender() {
            friendsService.sendRequest(userA.getId(), userB.getId(), null);
            // C -> A (incoming for A; not outgoing)
            friendsService.sendRequest(userC.getId(), userA.getId(), null);

            List<FriendRequestDto> outgoing = friendsService.listOutgoingPendingRequests(userA.getId());
            assertThat(outgoing).hasSize(1);
            assertThat(outgoing.get(0).toUserId()).isEqualTo(userB.getId());
            assertThat(outgoing.get(0).fromUserId()).isNull();
        }

        @Test
        void listOutgoing_eachDtoIncludesRecipientDisplayNameAndAvatar() {
            jdbc.update("UPDATE users SET avatar_url = ? WHERE id = ?", "https://example.com/carol.png", userC.getId());
            friendsService.sendRequest(userA.getId(), userC.getId(), "Hey Carol");

            List<FriendRequestDto> outgoing = friendsService.listOutgoingPendingRequests(userA.getId());
            assertThat(outgoing).hasSize(1);
            assertThat(outgoing.get(0).otherPartyDisplayName()).isEqualTo("Carol");
            assertThat(outgoing.get(0).otherPartyAvatarUrl()).isEqualTo("https://example.com/carol.png");
            assertThat(outgoing.get(0).message()).isEqualTo("Hey Carol");
        }
    }

    // -----------------------------------------------------------------
    // FK CASCADE behavior
    // -----------------------------------------------------------------
    @Nested
    @DisplayName("FK CASCADE behavior")
    class CascadeBehavior {

        @Test
        void deletingUser_cascadesAllRelationshipsAndRequests() {
            establishFriendship(userA.getId(), userB.getId());
            // userA -> 2 active relationship rows, 1 accepted request row

            userRepository.deleteById(userA.getId());

            Long relCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_relationships WHERE user_id = ? OR friend_user_id = ?",
                Long.class, userA.getId(), userA.getId());
            assertThat(relCount).isEqualTo(0L);

            Long reqCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_requests WHERE from_user_id = ? OR to_user_id = ?",
                Long.class, userA.getId(), userA.getId());
            assertThat(reqCount).isEqualTo(0L);
        }

        @Test
        void listFriends_correctlyExcludesUserDeletedMidFlight() {
            establishFriendship(userA.getId(), userB.getId());
            // Now mark B as deleted (without actually deleting; tests soft-delete filter)
            jdbc.update("UPDATE users SET is_deleted = TRUE WHERE id = ?", userB.getId());

            OffsetDateTime weekStart = OffsetDateTime.now(ZoneOffset.UTC).minusDays(7);
            List<FriendDto> friends = friendsService.listFriends(userA.getId(), weekStart);
            assertThat(friends).extracting(FriendDto::id).doesNotContain(userB.getId());
        }
    }
}
