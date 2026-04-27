package com.worshiproom.friends;

import org.springframework.http.HttpStatus;

public class NotFriendsException extends FriendsException {
    public NotFriendsException(String message) {
        super(HttpStatus.NOT_FOUND, "NOT_FRIENDS", message);
    }
}
