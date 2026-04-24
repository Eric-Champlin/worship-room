package com.worshiproom.user.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.openapitools.jackson.nullable.JsonNullable;

/**
 * PATCH /api/v1/users/me request body. Every field uses JsonNullable to
 * preserve three-state semantics:
 *   - field absent from JSON      → JsonNullable.undefined()           → don't touch DB column
 *   - field present with null     → JsonNullable.of(null)              → clear DB column (nullable fields only)
 *   - field present with a value  → JsonNullable.of(value)             → update DB column
 *
 * Bean Validation annotations apply to the value INSIDE the JsonNullable
 * via the wrapper's content-type binding. Spring's @Valid recognizes this
 * automatically when the JsonNullableModule is registered (see Step 1).
 *
 * Fields explicitly NOT in this DTO (per spec § Decision 3):
 *   - email             → Spec 1.5e (Change Email — password-gated)
 *   - password          → Spec 1.5c (Change Password)
 *   - isAdmin           → admin-only future spec
 *   - isBanned          → moderation, Phase 10
 *   - isEmailVerified   → Spec 1.5d (verification flow)
 *   - username          → Phase 8.1 (Username System)
 *
 * Jackson {@code spring.jackson.deserialization.fail-on-unknown-properties=false}
 * is set globally — unknown fields are silently dropped. The DTO's field list
 * is the sole write surface.
 */
public record UpdateUserRequest(
    @Size(min = 1, max = 100, message = "firstName must be 1-100 characters")
    JsonNullable<String> firstName,

    @Size(min = 1, max = 100, message = "lastName must be 1-100 characters")
    JsonNullable<String> lastName,

    JsonNullable<String> displayNamePreference,

    @Size(min = 1, max = 100, message = "customDisplayName must be 1-100 characters")
    JsonNullable<String> customDisplayName,

    @Size(max = 500, message = "avatarUrl must be at most 500 characters")
    @Pattern(regexp = "^https?://.+", message = "avatarUrl must be an http(s) URL")
    JsonNullable<String> avatarUrl,

    @Size(max = 2000, message = "bio must be at most 2000 characters")
    JsonNullable<String> bio,

    @Size(max = 50, message = "favoriteVerseReference must be at most 50 characters")
    JsonNullable<String> favoriteVerseReference,

    @Size(max = 500, message = "favoriteVerseText must be at most 500 characters")
    JsonNullable<String> favoriteVerseText,

    @Size(max = 50, message = "timezone must be at most 50 characters")
    JsonNullable<String> timezone
) {}
