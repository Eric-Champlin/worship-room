package com.worshiproom.mute;

import org.springframework.http.HttpStatus;

public class UserNotFoundException extends MuteException {
    public UserNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", message);
    }
}
