package com.worshiproom.user;

import com.worshiproom.user.dto.UpdateUserRequest;
import com.worshiproom.user.dto.UserResponse;
import org.openapitools.jackson.nullable.JsonNullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DateTimeException;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.function.Consumer;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(UserException::userNotFound);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateCurrentUser(UUID userId, UpdateUserRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(UserException::userNotFound);

        // firstName: nullable=false in DB; explicit null rejected, value updates,
        // empty string rejected (Bean Validation @Size min=1 should have caught it
        // but enforce here as defense-in-depth).
        applyNonNullable(request.firstName(), "firstName", user::setFirstName);

        // lastName: same rules as firstName.
        applyNonNullable(request.lastName(), "lastName", user::setLastName);

        // displayNamePreference: nullable=false in DB; parse via fromDbValue.
        if (request.displayNamePreference() != null && request.displayNamePreference().isPresent()) {
            String value = request.displayNamePreference().get();
            if (value == null) {
                throw UserException.nonNullableFieldNull("displayNamePreference");
            }
            try {
                user.setDisplayNamePreference(DisplayNamePreference.fromDbValue(value));
            } catch (IllegalArgumentException ex) {
                throw UserException.invalidDisplayNamePreference(value);
            }
        }

        // customDisplayName: nullable in DB; explicit null clears, value updates.
        applyNullable(request.customDisplayName(), user::setCustomDisplayName);

        // avatarUrl: nullable in DB.
        applyNullable(request.avatarUrl(), user::setAvatarUrl);

        // bio: nullable in DB.
        applyNullable(request.bio(), user::setBio);

        // favoriteVerseReference: nullable in DB.
        applyNullable(request.favoriteVerseReference(), user::setFavoriteVerseReference);

        // favoriteVerseText: nullable in DB.
        applyNullable(request.favoriteVerseText(), user::setFavoriteVerseText);

        // timezone: nullable=false in DB; validate via ZoneId.of before assigning.
        if (request.timezone() != null && request.timezone().isPresent()) {
            String value = request.timezone().get();
            if (value == null) {
                throw UserException.nonNullableFieldNull("timezone");
            }
            if (value.isBlank()) {
                throw UserException.fieldBlank("timezone");
            }
            try {
                ZoneId.of(value);
                user.setTimezone(value);
            } catch (DateTimeException ex) {
                throw UserException.invalidTimezone(value);
            }
        }

        // Custom-display-name constraint: if preference is now 'custom' and
        // customDisplayName is null after the update, reject. Per spec § Decision 7.
        if (user.getDisplayNamePreference() == DisplayNamePreference.CUSTOM
                && (user.getCustomDisplayName() == null || user.getCustomDisplayName().isBlank())) {
            throw UserException.customDisplayNameRequired();
        }

        // Manual updated_at maintenance — Spec 1.5 deferred JPA auditing.
        user.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));

        User saved = userRepository.save(user);
        log.info("userProfileUpdated userId={}", saved.getId());
        return UserResponse.from(saved);
    }

    /**
     * For DB-non-null columns: explicit null in request → 400; absent → no-op;
     * value → validate non-blank then set.
     */
    private static void applyNonNullable(JsonNullable<String> field, String fieldName,
                                         Consumer<String> setter) {
        if (field == null || !field.isPresent()) return;
        String value = field.get();
        if (value == null) {
            throw UserException.nonNullableFieldNull(fieldName);
        }
        if (value.isBlank()) {
            throw UserException.fieldBlank(fieldName);
        }
        setter.accept(value);
    }

    /**
     * For DB-nullable columns: explicit null in request → set to null; absent
     * → no-op; value → set verbatim.
     */
    private static void applyNullable(JsonNullable<String> field, Consumer<String> setter) {
        if (field == null || !field.isPresent()) return;
        setter.accept(field.get());
    }
}
