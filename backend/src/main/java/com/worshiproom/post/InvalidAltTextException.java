package com.worshiproom.post;

import org.springframework.http.HttpStatus;

/**
 * 400 INVALID_ALT_TEXT — image upload submitted without alt text, or alt text
 * is whitespace-only after sanitization. Alt text is required on every image
 * (Spec 4.6b accessibility mandate). Caught by the existing package-scoped
 * PostExceptionHandler via the PostException superclass.
 */
public class InvalidAltTextException extends PostException {
    public InvalidAltTextException() {
        super(HttpStatus.BAD_REQUEST, "INVALID_ALT_TEXT",
            "Alt text is required when an image is attached.");
    }
}
