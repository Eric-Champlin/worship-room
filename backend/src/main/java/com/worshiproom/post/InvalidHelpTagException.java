package com.worshiproom.post;

import org.springframework.http.HttpStatus;

/**
 * 400 INVALID_HELP_TAG — emitted when a HelpTag wire-value is unknown.
 * Thrown from {@link HelpTag#fromWireValue(String)}. Message includes the
 * rejected value for debugging; PostExceptionHandler routes via the generic
 * handlePost(PostException) path.
 */
public class InvalidHelpTagException extends PostException {

    private final String invalidValue;

    public InvalidHelpTagException(String invalidValue) {
        super(HttpStatus.BAD_REQUEST, "INVALID_HELP_TAG",
                String.format("Invalid help tag: %s", invalidValue));
        this.invalidValue = invalidValue;
    }

    public String getInvalidValue() { return invalidValue; }
}
