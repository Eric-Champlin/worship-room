package com.worshiproom.post.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request body for POST /api/v1/posts.
 *
 * <p>JSR-303 covers ~80% of rejection logic; PostService.createPost adds the
 * cross-field rules (qotdId existence check, scripture pair completeness,
 * category-required-for-prayer-request).
 *
 * <p>{@code @JsonIgnoreProperties(ignoreUnknown = false)} on the record means
 * Jackson rejects unknown fields with HttpMessageNotReadableException, which
 * PostValidationExceptionHandler maps to 400 INVALID_INPUT. This is per-DTO
 * (does NOT change global Jackson settings, which still allow unknown fields
 * for other endpoints).
 */
@JsonIgnoreProperties(ignoreUnknown = false)
public record CreatePostRequest(
        @NotBlank
        @Pattern(regexp = "^(prayer_request|testimony|question|discussion|encouragement)$",
                 message = "postType must be one of prayer_request, testimony, question, discussion, encouragement")
        String postType,

        @NotBlank
        @Size(max = 2000)
        String content,

        @Pattern(regexp = "^(health|mental-health|family|work|grief|gratitude|praise|relationships|other|discussion)$",
                 message = "category must be one of the 10 valid prayer categories")
        String category,                         // nullable; service-layer validates required-when

        Boolean isAnonymous,                     // null = false default; service-layer applies default

        @Pattern(regexp = "^(public|friends|private)$",
                 message = "visibility must be one of public, friends, private")
        String visibility,                       // null = 'public' default

        @Size(max = 50)
        String challengeId,                      // nullable

        @Size(max = 50)
        String qotdId,                           // nullable; service-layer existence check

        @Size(max = 100)
        String scriptureReference,               // nullable

        @Size(max = 2000)
        String scriptureText                     // nullable
) {}
