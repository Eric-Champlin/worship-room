package com.worshiproom.friends;

import org.springframework.http.HttpStatus;

public class InvalidRequestStateException extends FriendsException {
    public InvalidRequestStateException(String message) {
        super(HttpStatus.CONFLICT, "INVALID_REQUEST_STATE", message);
    }
}
