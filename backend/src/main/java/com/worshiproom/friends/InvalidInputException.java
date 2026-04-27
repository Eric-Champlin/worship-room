package com.worshiproom.friends;

import org.springframework.http.HttpStatus;

public class InvalidInputException extends FriendsException {
    public InvalidInputException(String message) {
        super(HttpStatus.BAD_REQUEST, "INVALID_INPUT", message);
    }
}
