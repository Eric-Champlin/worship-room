package com.worshiproom.friends;

import org.springframework.http.HttpStatus;

public class UserNotFoundException extends FriendsException {
    public UserNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", message);
    }
}
