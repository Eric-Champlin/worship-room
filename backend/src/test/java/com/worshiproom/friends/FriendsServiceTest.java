package com.worshiproom.friends;

import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FriendsServiceTest extends AbstractIntegrationTest {

    @Autowired private FriendsService friendsService;
    @Autowired private FriendRequestRepository requestRepo;
    @Autowired private FriendRelationshipRepository relationshipRepo;
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
    // sendRequest
    // -----------------------------------------------------------------
    @Nested
    @DisplayName("sendRequest")
    class SendRequest {

        @Test
        void sendRequest_happyPath_createsPendingRow() {
            FriendRequest req = friendsService.sendRequest(userA.getId(), userB.getId(), "Hello!");
            assertThat(req.getId()).isNotNull();
            assertThat(req.getStatus()).isEqualTo(FriendRequestStatus.PENDING);
            assertThat(req.getMessage()).isEqualTo("Hello!");
            assertThat(req.getRespondedAt()).isNull();

            Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?",
                Long.class, userA.getId(), userB.getId());
            assertThat(count).isEqualTo(1L);
        }

        @Test
        void sendRequest_toSelf_throwsSelfActionException() {
            assertThatThrownBy(() -> friendsService.sendRequest(userA.getId(), userA.getId(), null))
                .isInstanceOf(SelfActionException.class);
        }

        @Test
        void sendRequest_toDeletedUser_throwsUserNotFoundException() {
            jdbc.update("UPDATE users SET is_deleted = TRUE WHERE id = ?", userB.getId());
            assertThatThrownBy(() -> friendsService.sendRequest(userA.getId(), userB.getId(), null))
                .isInstanceOf(UserNotFoundException.class);
        }

        @Test
        void sendRequest_toBannedUser_throwsUserNotFoundException() {
            jdbc.update("UPDATE users SET is_banned = TRUE WHERE id = ?", userB.getId());
            assertThatThrownBy(() -> friendsService.sendRequest(userA.getId(), userB.getId(), null))
                .isInstanceOf(UserNotFoundException.class);
        }

        @Test
        void sendRequest_whenCallerBlockedByTarget_throwsBlockedUserException() {
            // B blocks A
            friendsService.blockUser(userB.getId(), userA.getId());
            assertThatThrownBy(() -> friendsService.sendRequest(userA.getId(), userB.getId(), null))
                .isInstanceOf(BlockedUserException.class);
        }

        @Test
        void sendRequest_whenTargetBlockedByCaller_throwsBlockedUserException() {
            // A blocks B
            friendsService.blockUser(userA.getId(), userB.getId());
            assertThatThrownBy(() -> friendsService.sendRequest(userA.getId(), userB.getId(), null))
                .isInstanceOf(BlockedUserException.class);
        }

        @Test
        void sendRequest_whenAlreadyFriends_throwsAlreadyFriendsException() {
            // Validation order in sendRequest checks AlreadyFriends BEFORE the
            // saveAndFlush UNIQUE catch, so a resend after accept short-circuits
            // here regardless of whether the prior friend_requests row still exists.
            FriendRequest req = friendsService.sendRequest(userA.getId(), userB.getId(), null);
            friendsService.acceptRequest(req.getId(), userB.getId());

            assertThatThrownBy(() -> friendsService.sendRequest(userA.getId(), userB.getId(), null))
                .isInstanceOf(AlreadyFriendsException.class);
        }

        @Test
        void sendRequest_secondTimeAfterDeclined_throwsDuplicateFriendRequestException() {
            FriendRequest first = friendsService.sendRequest(userA.getId(), userB.getId(), null);
            friendsService.declineRequest(first.getId(), userB.getId());

            assertThatThrownBy(() -> friendsService.sendRequest(userA.getId(), userB.getId(), null))
                .isInstanceOf(DuplicateFriendRequestException.class);

            Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?",
                Long.class, userA.getId(), userB.getId());
            assertThat(count).isEqualTo(1L);
        }

        @Test
        void sendRequest_secondTimeAfterCancelled_throwsDuplicateFriendRequestException() {
            FriendRequest first = friendsService.sendRequest(userA.getId(), userB.getId(), null);
            friendsService.cancelRequest(first.getId(), userA.getId());

            assertThatThrownBy(() -> friendsService.sendRequest(userA.getId(), userB.getId(), null))
                .isInstanceOf(DuplicateFriendRequestException.class);
        }

        @Test
        void sendRequest_secondTimeAfterAccepted_throwsAlreadyFriendsException() {
            // After accept, both the active friendship rows AND the FULL UNIQUE
            // friend_requests row exist. Validation order makes AlreadyFriends
            // the first-fired exception. Spec criterion intent ("sender can't
            // re-send after accept") is preserved — only the exception class
            // differs from the literal text. The after-declined and after-cancelled
            // tests below cover the FULL UNIQUE catch path directly.
            FriendRequest first = friendsService.sendRequest(userA.getId(), userB.getId(), null);
            friendsService.acceptRequest(first.getId(), userB.getId());
            assertThatThrownBy(() -> friendsService.sendRequest(userA.getId(), userB.getId(), null))
                .isInstanceOf(AlreadyFriendsException.class);
        }
    }

    // -----------------------------------------------------------------
    // acceptRequest
    // -----------------------------------------------------------------
    @Nested
    @DisplayName("acceptRequest")
    class AcceptRequest {

        @Test
        void acceptRequest_updatesStatusAndInsertsTwoRelationshipRows() {
            FriendRequest req = friendsService.sendRequest(userA.getId(), userB.getId(), null);
            friendsService.acceptRequest(req.getId(), userB.getId());

            FriendRequest reloaded = requestRepo.findById(req.getId()).orElseThrow();
            assertThat(reloaded.getStatus()).isEqualTo(FriendRequestStatus.ACCEPTED);
            assertThat(reloaded.getRespondedAt()).isNotNull();

            Long relCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_relationships WHERE status = 'active' "
              + "AND ((user_id = ? AND friend_user_id = ?) OR (user_id = ? AND friend_user_id = ?))",
                Long.class, userA.getId(), userB.getId(), userB.getId(), userA.getId());
            assertThat(relCount).isEqualTo(2L);
        }

        @Test
        void acceptRequest_byNonRecipient_throwsUnauthorizedActionException() {
            FriendRequest req = friendsService.sendRequest(userA.getId(), userB.getId(), null);
            assertThatThrownBy(() -> friendsService.acceptRequest(req.getId(), userC.getId()))
                .isInstanceOf(UnauthorizedActionException.class);
        }

        @Test
        void acceptRequest_onAlreadyAccepted_throwsInvalidRequestStateException() {
            FriendRequest req = friendsService.sendRequest(userA.getId(), userB.getId(), null);
            friendsService.acceptRequest(req.getId(), userB.getId());
            assertThatThrownBy(() -> friendsService.acceptRequest(req.getId(), userB.getId()))
                .isInstanceOf(InvalidRequestStateException.class);
        }

        @Test
        void acceptRequest_whenBlockPlacedMidFlight_rollsBackTransaction() {
            FriendRequest req = friendsService.sendRequest(userA.getId(), userB.getId(), null);

            // Simulate block placed AFTER send but BEFORE accept (D13).
            // Direct INSERT via JdbcTemplate commits immediately, outside the test's tx scope.
            jdbc.update(
                "INSERT INTO friend_relationships (user_id, friend_user_id, status) VALUES (?, ?, 'blocked')",
                userB.getId(), userA.getId());

            assertThatThrownBy(() -> friendsService.acceptRequest(req.getId(), userB.getId()))
                .isInstanceOf(BlockedUserException.class);

            // Request status should be unchanged (still pending)
            FriendRequest reloaded = requestRepo.findById(req.getId()).orElseThrow();
            assertThat(reloaded.getStatus()).isEqualTo(FriendRequestStatus.PENDING);

            // Zero ACTIVE relationship rows — only the BLOCKED row from above
            Long activeCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_relationships WHERE status = 'active'", Long.class);
            assertThat(activeCount).isEqualTo(0L);
        }
    }

    // -----------------------------------------------------------------
    // declineRequest
    // -----------------------------------------------------------------
    @Nested
    @DisplayName("declineRequest")
    class DeclineRequest {

        @Test
        void declineRequest_updatesStatusAndInsertsZeroRelationships() {
            FriendRequest req = friendsService.sendRequest(userA.getId(), userB.getId(), null);
            friendsService.declineRequest(req.getId(), userB.getId());

            FriendRequest reloaded = requestRepo.findById(req.getId()).orElseThrow();
            assertThat(reloaded.getStatus()).isEqualTo(FriendRequestStatus.DECLINED);
            assertThat(reloaded.getRespondedAt()).isNotNull();

            Long relCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_relationships WHERE status = 'active'", Long.class);
            assertThat(relCount).isEqualTo(0L);
        }

        @Test
        void declineRequest_byNonRecipient_throwsUnauthorizedActionException() {
            FriendRequest req = friendsService.sendRequest(userA.getId(), userB.getId(), null);
            assertThatThrownBy(() -> friendsService.declineRequest(req.getId(), userC.getId()))
                .isInstanceOf(UnauthorizedActionException.class);
        }
    }

    // -----------------------------------------------------------------
    // cancelRequest
    // -----------------------------------------------------------------
    @Nested
    @DisplayName("cancelRequest")
    class CancelRequest {

        @Test
        void cancelRequest_updatesStatusToCancelled() {
            FriendRequest req = friendsService.sendRequest(userA.getId(), userB.getId(), null);
            friendsService.cancelRequest(req.getId(), userA.getId());

            FriendRequest reloaded = requestRepo.findById(req.getId()).orElseThrow();
            assertThat(reloaded.getStatus()).isEqualTo(FriendRequestStatus.CANCELLED);
            assertThat(reloaded.getRespondedAt()).isNotNull();
        }

        @Test
        void cancelRequest_byNonSender_throwsUnauthorizedActionException() {
            FriendRequest req = friendsService.sendRequest(userA.getId(), userB.getId(), null);
            // Recipient (B) tries to cancel — only sender (A) can cancel.
            assertThatThrownBy(() -> friendsService.cancelRequest(req.getId(), userB.getId()))
                .isInstanceOf(UnauthorizedActionException.class);
        }
    }

    // -----------------------------------------------------------------
    // removeFriend
    // -----------------------------------------------------------------
    @Nested
    @DisplayName("removeFriend")
    class RemoveFriend {

        @Test
        void removeFriend_deletesBothRelationshipRows() {
            FriendRequest req = friendsService.sendRequest(userA.getId(), userB.getId(), null);
            friendsService.acceptRequest(req.getId(), userB.getId());

            friendsService.removeFriend(userA.getId(), userB.getId());

            Long relCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM friend_relationships "
              + "WHERE (user_id = ? AND friend_user_id = ?) OR (user_id = ? AND friend_user_id = ?)",
                Long.class, userA.getId(), userB.getId(), userB.getId(), userA.getId());
            assertThat(relCount).isEqualTo(0L);
        }

        @Test
        void removeFriend_whenNotFriends_throwsNotFriendsException() {
            assertThatThrownBy(() -> friendsService.removeFriend(userA.getId(), userB.getId()))
                .isInstanceOf(NotFriendsException.class);
        }
    }
}
