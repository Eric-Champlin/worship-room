package com.worshiproom.post;

import com.worshiproom.support.AbstractDataJpaTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies {@link UserResolverService} resolves both literal UUIDs and
 * kebab-case (first_name + '-' + last_name lowercased) usernames.
 */
@Import(UserResolverService.class)
class UserResolverServiceTest extends AbstractDataJpaTest {

    @Autowired private UserResolverService userResolverService;
    @Autowired private UserRepository userRepository;

    @Test
    void resolveLiteralUuid_returnsParsedUuid() {
        UUID expected = UUID.fromString("00000000-0000-0000-0000-000000000101");
        Optional<UUID> resolved = userResolverService.resolve(expected.toString());
        assertThat(resolved).contains(expected);
    }

    @Test
    void resolveKebabCase_findsExistingUser() {
        User u = userRepository.saveAndFlush(new User(
                "sarah-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$x",
                "Sarah", "Johnson", "UTC"));
        Optional<UUID> resolved = userResolverService.resolve("sarah-johnson");
        assertThat(resolved).contains(u.getId());
    }

    @Test
    void resolveKebabCase_caseInsensitive() {
        User u = userRepository.saveAndFlush(new User(
                "david-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$x",
                "David", "Chen", "UTC"));
        assertThat(userResolverService.resolve("DAVID-CHEN")).contains(u.getId());
        assertThat(userResolverService.resolve("David-Chen")).contains(u.getId());
        assertThat(userResolverService.resolve("david-chen")).contains(u.getId());
    }

    @Test
    void resolveKebabCase_nonexistent_returnsEmpty() {
        assertThat(userResolverService.resolve("nobody-exists")).isEmpty();
    }

    @Test
    void resolveBlankOrNull_returnsEmpty() {
        assertThat(userResolverService.resolve(null)).isEmpty();
        assertThat(userResolverService.resolve("")).isEmpty();
        assertThat(userResolverService.resolve("   ")).isEmpty();
    }

    @Test
    void resolveDashlessIdentifier_returnsEmpty() {
        // No dash → can't be split into first/last name → no resolution
        assertThat(userResolverService.resolve("sarah")).isEmpty();
    }
}
