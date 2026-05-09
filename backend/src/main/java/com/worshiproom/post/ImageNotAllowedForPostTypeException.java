package com.worshiproom.post;

import org.springframework.http.HttpStatus;

/**
 * 400 IMAGE_NOT_ALLOWED_FOR_POST_TYPE — image upload submitted with a post
 * type that does not support images. Per spec 4.6b, only testimony and question
 * accept image attachments. Lives in the post package (not upload) because it's
 * thrown during PostService.createPost cross-field validation, so the existing
 * package-scoped PostExceptionHandler catches it.
 *
 * <p>The {@code wireValue} (the rejected postType, e.g., "prayer_request") is
 * preserved for server-side logging via {@link #getWireValue()} so the audit
 * trail records which post type was rejected.
 */
public class ImageNotAllowedForPostTypeException extends PostException {

    private final String wireValue;

    public ImageNotAllowedForPostTypeException(String wireValue) {
        super(HttpStatus.BAD_REQUEST, "IMAGE_NOT_ALLOWED_FOR_POST_TYPE",
            "Images are only allowed on testimony and question posts.");
        this.wireValue = wireValue;
    }

    public String getWireValue() { return wireValue; }
}
