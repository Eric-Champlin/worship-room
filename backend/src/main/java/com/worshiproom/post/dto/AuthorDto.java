package com.worshiproom.post.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.UUID;

/**
 * Nested author block in PostDto. {@code id} is null for anonymous posts.
 *
 * <p>The class-level {@code @JsonInclude(Include.ALWAYS)} OVERRIDES the global
 * {@code spring.jackson.default-property-inclusion=non_null} setting so that
 * the {@code id} field is rendered as {@code "id":null} (present-with-null)
 * rather than omitted. Frontend code distinguishes "field absent" from
 * "field null" — see Spec 3.3 Watch-For #16.
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record AuthorDto(UUID id, String displayName, String avatarUrl) {}
