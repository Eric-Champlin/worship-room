package com.worshiproom.mute;

import com.worshiproom.mute.dto.MutedUserDto;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MuteServiceTest extends AbstractIntegrationTest {

    @Autowired private MuteService muteService;
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
    // muteUser
    // -----------------------------------------------------------------
    @Nested
    @DisplayName("muteUser")
    class MuteUser {

        @Test
        void muteUser_insertsRow_happyPath() {
            muteService.muteUser(userA.getId(), userB.getId());

            Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM user_mutes WHERE muter_id = ? AND muted_id = ?",
                Long.class, userA.getId(), userB.getId());
            assertThat(count).isEqualTo(1L);
        }

        @Test
        void muteUser_self_throwsSelfActionException() {
            assertThatThrownBy(() -> muteService.muteUser(userA.getId(), userA.getId()))
                .isInstanceOf(SelfActionException.class)
                .hasMessageContaining("Cannot mute yourself");
        }

        @Test
        void muteUser_targetNotFound_throwsUserNotFoundException() {
            UUID phantom = UUID.randomUUID();
            assertThatThrownBy(() -> muteService.muteUser(userA.getId(), phantom))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining("Target user not found");
        }

        @Test
        void muteUser_alreadyMuted_isIdempotent_noNewRow() {
            muteService.muteUser(userA.getId(), userB.getId());
            muteService.muteUser(userA.getId(), userB.getId());

            Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM user_mutes WHERE muter_id = ? AND muted_id = ?",
                Long.class, userA.getId(), userB.getId());
            assertThat(count).isEqualTo(1L);
        }
    }

    // -----------------------------------------------------------------
    // unmuteUser
    // -----------------------------------------------------------------
    @Nested
    @DisplayName("unmuteUser")
    class UnmuteUser {

        @Test
        void unmuteUser_deletesRow_happyPath() {
            muteService.muteUser(userA.getId(), userB.getId());
            muteService.unmuteUser(userA.getId(), userB.getId());

            Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM user_mutes WHERE muter_id = ? AND muted_id = ?",
                Long.class, userA.getId(), userB.getId());
            assertThat(count).isEqualTo(0L);
        }

        @Test
        void unmuteUser_notMuted_throwsNotMutedException() {
            assertThatThrownBy(() -> muteService.unmuteUser(userA.getId(), userB.getId()))
                .isInstanceOf(NotMutedException.class)
                .hasMessageContaining("not muted");
        }
    }

    // -----------------------------------------------------------------
    // listMutedUsers
    // -----------------------------------------------------------------
    @Nested
    @DisplayName("listMutedUsers")
    class ListMutedUsers {

        @Test
        void listMutedUsers_empty_returnsEmptyList() {
            List<MutedUserDto> mutes = muteService.listMutedUsers(userA.getId());
            assertThat(mutes).isEmpty();
        }

        @Test
        void listMutedUsers_populated_orderedByCreatedAtDesc_resolvesDisplayName() throws Exception {
            // Insert two mutes a small interval apart so ORDER BY created_at DESC
            // reliably places C-then-B (most recent first).
            muteService.muteUser(userA.getId(), userB.getId());
            Thread.sleep(10);
            muteService.muteUser(userA.getId(), userC.getId());

            List<MutedUserDto> mutes = muteService.listMutedUsers(userA.getId());

            assertThat(mutes).hasSize(2);
            assertThat(mutes.get(0).userId()).isEqualTo(userC.getId());
            assertThat(mutes.get(0).displayName()).isEqualTo("Carol"); // FIRST_ONLY default
            assertThat(mutes.get(1).userId()).isEqualTo(userB.getId());
            assertThat(mutes.get(1).displayName()).isEqualTo("Bob");
            assertThat(mutes.get(0).mutedAt()).isAfter(mutes.get(1).mutedAt());
        }
    }

    // -----------------------------------------------------------------
    // isMuted
    // -----------------------------------------------------------------
    @Nested
    @DisplayName("isMuted")
    class IsMutedCheck {

        @Test
        void isMuted_returnsTrue_whenRowExists() {
            muteService.muteUser(userA.getId(), userB.getId());
            assertThat(muteService.isMuted(userA.getId(), userB.getId())).isTrue();
        }

        @Test
        void isMuted_returnsFalse_whenNoRow() {
            assertThat(muteService.isMuted(userA.getId(), userB.getId())).isFalse();
        }
    }

    // -----------------------------------------------------------------
    // FK CASCADE
    // -----------------------------------------------------------------
    @Nested
    @DisplayName("FK CASCADE")
    class CascadeFk {

        @Test
        void userDelete_cascadesToUserMutes() {
            // userB appears as both muter and mutee in two separate rows.
            // Deleting userB must remove both via FK CASCADE.
            muteService.muteUser(userA.getId(), userB.getId()); // A mutes B
            muteService.muteUser(userB.getId(), userC.getId()); // B mutes C

            Long before = jdbc.queryForObject("SELECT COUNT(*) FROM user_mutes", Long.class);
            assertThat(before).isEqualTo(2L);

            userRepository.deleteById(userB.getId());

            Long after = jdbc.queryForObject("SELECT COUNT(*) FROM user_mutes", Long.class);
            assertThat(after).isEqualTo(0L);
        }
    }
}
