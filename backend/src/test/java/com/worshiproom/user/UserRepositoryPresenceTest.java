package com.worshiproom.user;

import com.worshiproom.support.AbstractDataJpaTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Spec 6.11b — verifies the {@code findIdsByPresenceOptedOutTrue} batch query
 * used by {@code PresenceService.getCount()} to exclude opted-out users.
 */
class UserRepositoryPresenceTest extends AbstractDataJpaTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void findIdsByPresenceOptedOutTrue() {
        User a = userRepository.save(new User("a@example.com", "$2a$10$x", "Alice", "A", "UTC"));
        User b = userRepository.save(new User("b@example.com", "$2a$10$x", "Bob", "B", "UTC"));
        User c = userRepository.save(new User("c@example.com", "$2a$10$x", "Carol", "C", "UTC"));
        a.setPresenceOptedOut(true);
        c.setPresenceOptedOut(true);
        userRepository.saveAll(List.of(a, c));

        Set<UUID> result = userRepository.findIdsByPresenceOptedOutTrue(
            List.of(a.getId(), b.getId(), c.getId())
        );

        assertThat(result).containsExactlyInAnyOrder(a.getId(), c.getId());
    }

    @Test
    void findIdsByPresenceOptedOutTrueEmptyInput() {
        Set<UUID> result = userRepository.findIdsByPresenceOptedOutTrue(List.of());
        assertThat(result).isEmpty();
    }

    @Test
    void findIdsByPresenceOptedOutTrueAllFalse() {
        User a = userRepository.save(new User("a@example.com", "$2a$10$x", "Alice", "A", "UTC"));
        User b = userRepository.save(new User("b@example.com", "$2a$10$x", "Bob", "B", "UTC"));

        Set<UUID> result = userRepository.findIdsByPresenceOptedOutTrue(
            List.of(a.getId(), b.getId())
        );

        assertThat(result).isEmpty();
    }

    @Test
    void newUserDefaultsToOptedOutFalse() {
        User u = userRepository.save(new User("d@example.com", "$2a$10$x", "Dave", "D", "UTC"));
        User loaded = userRepository.findById(u.getId()).orElseThrow();
        assertThat(loaded.isPresenceOptedOut()).isFalse();
    }
}
