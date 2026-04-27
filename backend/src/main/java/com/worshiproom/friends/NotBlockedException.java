package com.worshiproom.friends;

import org.springframework.http.HttpStatus;

public class NotBlockedException extends FriendsException {
    public NotBlockedException(String message) {
        super(HttpStatus.NOT_FOUND, "NOT_BLOCKED", message);
    }
}
