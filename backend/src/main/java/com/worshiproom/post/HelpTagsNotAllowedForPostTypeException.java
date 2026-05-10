package com.worshiproom.post;

import org.springframework.http.HttpStatus;

/**
 * 400 HELP_TAGS_NOT_ALLOWED_FOR_POST_TYPE — emitted when help_tags is
 * non-empty on a non-prayer_request post (testimony, question, discussion,
 * encouragement). Mirrors {@link ImageNotAllowedForPostTypeException} —
 * preserves the rejected wireValue for audit logging via a dedicated handler
 * in PostExceptionHandler.
 */
public class HelpTagsNotAllowedForPostTypeException extends PostException {

    private final String wireValue;

    public HelpTagsNotAllowedForPostTypeException(String wireValue) {
        super(HttpStatus.BAD_REQUEST, "HELP_TAGS_NOT_ALLOWED_FOR_POST_TYPE",
                "Help tags are only allowed on prayer_request posts.");
        this.wireValue = wireValue;
    }

    public String getWireValue() { return wireValue; }
}
