package com.worshiproom.friends;

import org.springframework.http.HttpStatus;

public class UnauthorizedActionException extends FriendsException {
    public UnauthorizedActionException(String message) {
        super(HttpStatus.FORBIDDEN, "UNAUTHORIZED_ACTION", message);
    }
}
