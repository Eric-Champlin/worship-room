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
        @Size(max = 5000)
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
        String scriptureText,                    // nullable

        // Spec 4.6b — image upload claim. Cross-field rules in PostService.createPost:
        //   1. If imageUploadId is set, postType MUST be testimony or question
        //      (else IMAGE_NOT_ALLOWED_FOR_POST_TYPE)
        //   2. If imageUploadId is set, imageAltText MUST be non-blank after sanitize
        //      (else INVALID_ALT_TEXT)
        //   3. UploadService.claimUpload validates the userId path segment matches
        //      the authenticated user (else IMAGE_CLAIM_FAILED)
        @Pattern(regexp = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                 message = "imageUploadId must be a valid lowercase UUID")
        String imageUploadId,                    // nullable

        @Size(max = 500)
        String imageAltText                      // nullable; required when imageUploadId is set
) {}
