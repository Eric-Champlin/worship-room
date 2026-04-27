package com.worshiproom.friends;

import org.springframework.http.HttpStatus;

public class SelfActionException extends FriendsException {
    public SelfActionException(String message) {
        super(HttpStatus.BAD_REQUEST, "SELF_ACTION_FORBIDDEN", message);
    }
}
