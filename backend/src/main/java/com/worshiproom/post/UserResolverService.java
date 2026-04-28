package com.worshiproom.post;

import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Resolves the {username} path param on /api/v1/users/{username}/posts to a UUID.
 * Accepts either a literal UUID string or a kebab-case identifier derived from
 * first_name + '-' + last_name (lowercased).
 *
 * Returns Optional.empty() if neither path resolves; the caller (PostService)
 * decides whether to return an empty array (anti-enumeration) or 404.
 *
 * Followup: Phase 8.1 (round3-phase08-spec01-username-system) replaces this
 * kebab-case derivation with a users.username column lookup. See
 * _plans/post-1.10-followups.md.
 */
@Service
@Transactional(readOnly = true)
public class UserResolverService {

    private final UserRepository userRepository;

    public UserResolverService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Optional<UUID> resolve(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(UUID.fromString(identifier));
        } catch (IllegalArgumentException ignored) {
            // Not a UUID; fall through to kebab-case derivation
        }
        return resolveByKebabCase(identifier);
    }

    private Optional<UUID> resolveByKebabCase(String kebab) {
        int lastDash = kebab.lastIndexOf('-');
        if (lastDash <= 0 || lastDash == kebab.length() - 1) {
            return Optional.empty();
        }
        String firstNameKebab = kebab.substring(0, lastDash);
        String lastNameKebab = kebab.substring(lastDash + 1);
        return userRepository.findByFirstNameIgnoreCaseAndLastNameIgnoreCase(
                firstNameKebab.replace('-', ' '),
                lastNameKebab
        ).map(User::getId);
    }
}
