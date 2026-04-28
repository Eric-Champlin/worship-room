package com.worshiproom.post;

import org.springframework.http.HttpStatus;

public class EmptyPatchBodyException extends PostException {
    public EmptyPatchBodyException() {
        super(HttpStatus.BAD_REQUEST, "INVALID_INPUT",
              "PATCH request body must contain at least one field to update.");
    }
}
