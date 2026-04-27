package com.worshiproom.friends;

import org.springframework.http.HttpStatus;

public class BlockedUserException extends FriendsException {
    public BlockedUserException(String message) {
        super(HttpStatus.FORBIDDEN, "BLOCKED_USER", message);
    }
}
