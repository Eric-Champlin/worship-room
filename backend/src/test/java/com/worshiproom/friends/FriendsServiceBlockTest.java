package com.worshiproom.friends;

import com.worshiproom.friends.dto.UserSearchResultDto;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FriendsServiceBlockTest extends AbstractIntegrationTest {

    @Autowired private FriendsService friendsService;
    @Autowired private FriendRequestRepository requestRepo;
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

    // -----------------------------------------------------------------
    // blockUser
    // -----------------------------------------------------------------
    @Nested
    @DisplayName("blockUser")
    class BlockUser {

        @Test
        void blockUser_insertsSingleBlockedRowFromBlockerToBlocked() {
            friendsService.blockUser(userA.getId(), userB.getId());

            Long blockedRows = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_relationships "
              + "WHERE user_id = ? AND friend_user_id = ? AND status = 'blocked'",
                Long.class, userA.getId(), userB.getId());
            assertThat(blockedRows).isEqualTo(1L);

            // Reverse direction has no row
            Long reverseRows = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_relationships "
              + "WHERE user_id = ? AND friend_user_id = ?",
                Long.class, userB.getId(), userA.getId());
            assertThat(reverseRows).isEqualTo(0L);
        }

        @Test
        void blockUser_whenPreviouslyFriends_deletesPriorRelationshipsAndInsertsBlock() {
            FriendRequest req = friendsService.sendRequest(userA.getId(), userB.getId(), null);
            friendsService.acceptRequest(req.getId(), userB.getId());
            // Both A->B and B->A active rows exist

            friendsService.blockUser(userA.getId(), userB.getId());

            Long activeRows = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_relationships WHERE status = 'active'",
                Long.class);
            assertThat(activeRows).isEqualTo(0L);

            Long blockedRows = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_relationships WHERE status = 'blocked'",
                Long.class);
            assertThat(blockedRows).isEqualTo(1L);
        }

        @Test
        void blockUser_deletesAnyPendingFriendRequestsInEitherDirection() {
            // A -> B request and B -> A request both pending
            friendsService.sendRequest(userA.getId(), userB.getId(), null);
            friendsService.sendRequest(userB.getId(), userA.getId(), null);

            friendsService.blockUser(userA.getId(), userB.getId());

            Long pendingCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_requests WHERE status = 'pending' "
              + "AND ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))",
                Long.class, userA.getId(), userB.getId(), userB.getId(), userA.getId());
            assertThat(pendingCount).isEqualTo(0L);
        }

        @Test
        void blockUser_leavesNonPendingFriendRequestsUntouched() {
            FriendRequest req1 = friendsService.sendRequest(userA.getId(), userB.getId(), null);
            friendsService.declineRequest(req1.getId(), userB.getId());
            // req1 is now status='declined'

            friendsService.blockUser(userA.getId(), userB.getId());

            FriendRequest reloaded = requestRepo.findById(req1.getId()).orElseThrow();
            assertThat(reloaded.getStatus()).isEqualTo(FriendRequestStatus.DECLINED);
        }

        @Test
        void blockUser_onAlreadyBlockedTarget_isNoOp() {
            friendsService.blockUser(userA.getId(), userB.getId());
            // Second call should not throw and should not duplicate the row
            friendsService.blockUser(userA.getId(), userB.getId());

            Long blockedRows = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_relationships "
              + "WHERE user_id = ? AND friend_user_id = ? AND status = 'blocked'",
                Long.class, userA.getId(), userB.getId());
            assertThat(blockedRows).isEqualTo(1L);
        }

        @Test
        void blockUser_toSelf_throwsSelfActionException() {
            assertThatThrownBy(() -> friendsService.blockUser(userA.getId(), userA.getId()))
                .isInstanceOf(SelfActionException.class);
        }

        @Test
        void blockUser_whenOtherPartyAlreadyBlockedCaller_doesNotDestroyOtherBlock() {
            // Mutual-block scenario: B blocks A first, then A independently blocks B.
            // A's new block must coexist with B's existing block — neither is
            // authorized to mutate the other's block state.
            friendsService.blockUser(userB.getId(), userA.getId()); // B → A
            friendsService.blockUser(userA.getId(), userB.getId()); // A → B

            Long bBlocksA = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_relationships "
              + "WHERE user_id = ? AND friend_user_id = ? AND status = 'blocked'",
                Long.class, userB.getId(), userA.getId());
            assertThat(bBlocksA).as("B's block of A must survive A's later block of B").isEqualTo(1L);

            Long aBlocksB = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_relationships "
              + "WHERE user_id = ? AND friend_user_id = ? AND status = 'blocked'",
                Long.class, userA.getId(), userB.getId());
            assertThat(aBlocksB).as("A's new block of B must exist").isEqualTo(1L);
        }
    }

    // -----------------------------------------------------------------
    // unblockUser
    // -----------------------------------------------------------------
    @Nested
    @DisplayName("unblockUser")
    class UnblockUser {

        @Test
        void unblockUser_deletesBlockRowAndDoesNotRestorePriorFriendship() {
            // Establish friendship
            FriendRequest req = friendsService.sendRequest(userA.getId(), userB.getId(), null);
            friendsService.acceptRequest(req.getId(), userB.getId());
            // Block (deletes the friendship)
            friendsService.blockUser(userA.getId(), userB.getId());
            // Unblock
            friendsService.unblockUser(userA.getId(), userB.getId());

            Long activeRows = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_relationships WHERE status = 'active'",
                Long.class);
            assertThat(activeRows).isEqualTo(0L);

            Long blockedRows = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_relationships WHERE status = 'blocked'",
                Long.class);
            assertThat(blockedRows).isEqualTo(0L);
        }

        @Test
        void unblockUser_whenNotBlocked_throwsNotBlockedException() {
            assertThatThrownBy(() -> friendsService.unblockUser(userA.getId(), userB.getId()))
                .isInstanceOf(NotBlockedException.class);
        }

        @Test
        void unblockUser_doesNotDestroyReverseDirectionBlockFromOtherParty() {
            // Both parties have independently blocked each other. A unblocking B
            // must remove ONLY A's block — B's independent block of A must remain.
            friendsService.blockUser(userA.getId(), userB.getId()); // A → B
            friendsService.blockUser(userB.getId(), userA.getId()); // B → A

            friendsService.unblockUser(userA.getId(), userB.getId());

            Long aBlocksB = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_relationships "
              + "WHERE user_id = ? AND friend_user_id = ? AND status = 'blocked'",
                Long.class, userA.getId(), userB.getId());
            assertThat(aBlocksB).as("A's block of B should be removed").isEqualTo(0L);

            Long bBlocksA = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_relationships "
              + "WHERE user_id = ? AND friend_user_id = ? AND status = 'blocked'",
                Long.class, userB.getId(), userA.getId());
            assertThat(bBlocksA).as("B's independent block of A must remain intact").isEqualTo(1L);
        }
    }

    // -----------------------------------------------------------------
    // searchUsers
    // -----------------------------------------------------------------
    @Nested
    @DisplayName("searchUsers")
    class SearchUsers {

        @Test
        void searchUsers_excludesActingUser() {
            // userA searches for "Al" — should not find herself
            List<UserSearchResultDto> results = friendsService.searchUsers(userA.getId(), "Al", 50);
            assertThat(results).extracting(UserSearchResultDto::id).doesNotContain(userA.getId());
        }

        @Test
        void searchUsers_excludesUsersBlockedByCaller() {
            friendsService.blockUser(userA.getId(), userB.getId());
            List<UserSearchResultDto> results = friendsService.searchUsers(userA.getId(), "Bob", 50);
            assertThat(results).extracting(UserSearchResultDto::id).doesNotContain(userB.getId());
        }

        @Test
        void searchUsers_excludesUsersWhoBlockedCaller() {
            friendsService.blockUser(userB.getId(), userA.getId());
            List<UserSearchResultDto> results = friendsService.searchUsers(userA.getId(), "Bob", 50);
            assertThat(results).extracting(UserSearchResultDto::id).doesNotContain(userB.getId());
        }

        @Test
        void searchUsers_excludesDeletedAndBannedUsers() {
            jdbc.update("UPDATE users SET is_deleted = TRUE WHERE id = ?", userB.getId());
            jdbc.update("UPDATE users SET is_banned = TRUE WHERE id = ?", userC.getId());

            // Two separate 2+char searches — one for each user. Query must be ≥2 chars.
            List<UserSearchResultDto> deletedSearch = friendsService.searchUsers(userA.getId(), "Bo", 50);
            assertThat(deletedSearch).extracting(UserSearchResultDto::id).doesNotContain(userB.getId());

            List<UserSearchResultDto> bannedSearch = friendsService.searchUsers(userA.getId(), "Ca", 50);
            assertThat(bannedSearch).extracting(UserSearchResultDto::id).doesNotContain(userC.getId());
        }

        @Test
        void searchUsers_matchesFirstNameOrLastNameCaseInsensitive() {
            // Match by first name (case-insensitive)
            List<UserSearchResultDto> byFirst = friendsService.searchUsers(userA.getId(), "bO", 50);
            assertThat(byFirst).extracting(UserSearchResultDto::id).contains(userB.getId());

            // Match by last name (case-insensitive)
            List<UserSearchResultDto> byLast = friendsService.searchUsers(userA.getId(), "BeNn", 50);
            assertThat(byLast).extracting(UserSearchResultDto::id).contains(userB.getId());
        }

        @Test
        void searchUsers_withQueryUnderTwoChars_throwsInvalidInputException() {
            assertThatThrownBy(() -> friendsService.searchUsers(userA.getId(), "A", 50))
                .isInstanceOf(InvalidInputException.class);
            // Whitespace-only query also rejects
            assertThatThrownBy(() -> friendsService.searchUsers(userA.getId(), "  ", 50))
                .isInstanceOf(InvalidInputException.class);
        }

        @Test
        void searchUsers_clampsLimitToFifty() {
            // Seed 60 additional users with first name starting with "Zz" so they're
            // the only matches and we can verify the cap.
            for (int i = 0; i < 60; i++) {
                userRepository.save(new User(
                    "zz-" + i + "@example.com", "$2a$10$x", "Zz" + i, "Zlast", "UTC"));
            }
            List<UserSearchResultDto> results = friendsService.searchUsers(userA.getId(), "Zz", 1000);
            assertThat(results).hasSizeLessThanOrEqualTo(50);
        }
    }
}
