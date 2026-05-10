package com.worshiproom.post.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Set;

/**
 * Request body for PATCH /api/v1/posts/{id}.
 *
 * <p>All fields optional — PATCH semantics. Only fields present in the body
 * are interpreted as edits. Service-layer rejects all-null bodies as 400.
 *
 * <p>Forbidden fields (rejected by JsonIgnoreProperties + service-layer
 * verification): id, userId, postType, isAnonymous, createdAt, updatedAt,
 * lastActivityAt, answeredAt, deletedAt, isDeleted, moderationStatus,
 * crisisFlag, prayingCount, candleCount, commentCount, bookmarkCount,
 * reportCount.
 *
 * <p>postType and isAnonymous immutability is enforced by their absence here:
 * if a client sends them, JsonIgnoreProperties rejects → 400 INVALID_INPUT.
 */
@JsonIgnoreProperties(ignoreUnknown = false)
public record UpdatePostRequest(
        @Size(max = 5000)
        String content,

        @Pattern(regexp = "^(health|mental-health|family|work|grief|gratitude|praise|relationships|other|discussion)$",
                 message = "category must be one of the 10 valid prayer categories")
        String category,

        @Pattern(regexp = "^(public|friends|private)$",
                 message = "visibility must be one of public, friends, private")
        String visibility,

        Boolean isAnswered,

        @Size(max = 2000)
        String answeredText,

        @Size(max = 50)
        String challengeId,

        @Size(max = 50)
        String qotdId,

        @Size(max = 100)
        String scriptureReference,

        @Size(max = 2000)
        String scriptureText,

        // Spec 4.7b — null = no change; [] = clear all tags. Cross-type rules
        // and edit-window gating applied in PostService.updatePost.
        @Size(max = 5, message = "helpTags may contain at most 5 values")
        Set<String> helpTags
) {

    /**
     * True if no field is set. Used by PostService.updatePost to reject empty PATCH bodies.
     */
    public boolean isEmpty() {
        return content == null && category == null && visibility == null
                && isAnswered == null && answeredText == null
                && challengeId == null && qotdId == null
                && scriptureReference == null && scriptureText == null
                && helpTags == null;
    }
}
