package com.worshiproom.verse;

import org.springframework.http.HttpStatus;

/**
 * 400 INVALID_INPUT for unrecognized {@code ?trigger=} query param values
 * (Spec 6.8 §"API contract"). The wire value itself is included in the message
 * for actionable debug; never the user content.
 */
public class InvalidTriggerException extends VerseException {

    public InvalidTriggerException(String wireValue) {
        super(HttpStatus.BAD_REQUEST,
              "INVALID_INPUT",
              "Unknown trigger value: '" + (wireValue == null ? "null" : wireValue)
                  + "'. Expected one of: post_compose, comment, reading_time.");
    }
}
