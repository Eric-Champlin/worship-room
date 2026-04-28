package com.worshiproom.post;

import org.springframework.http.HttpStatus;

/**
 * 400 returned when {@code category} is required for the given postType
 * (currently {@code prayer_request} and {@code discussion}) but absent in the request.
 *
 * <p>Distinct from {@link InvalidCategoryException}, which fires when the value is
 * present but not a recognized category. This exception fires when no value is supplied.
 */
public class MissingCategoryException extends PostException {
    public MissingCategoryException(String postType) {
        super(HttpStatus.BAD_REQUEST, "INVALID_INPUT",
              "category is required for postType=" + postType);
    }
}
