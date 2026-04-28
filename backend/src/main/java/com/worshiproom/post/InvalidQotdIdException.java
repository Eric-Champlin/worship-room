package com.worshiproom.post;

import org.springframework.http.HttpStatus;

public class InvalidQotdIdException extends PostException {
    public InvalidQotdIdException(String qotdId) {
        super(HttpStatus.BAD_REQUEST, "INVALID_INPUT",
              "qotdId references a question that does not exist: " + qotdId);
    }
}
