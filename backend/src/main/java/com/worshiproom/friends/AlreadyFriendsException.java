package com.worshiproom.friends;

import org.springframework.http.HttpStatus;

public class AlreadyFriendsException extends FriendsException {
    public AlreadyFriendsException(String message) {
        super(HttpStatus.CONFLICT, "ALREADY_FRIENDS", message);
    }
}
