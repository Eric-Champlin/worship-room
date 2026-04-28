package com.worshiproom.mute;

import org.springframework.http.HttpStatus;

public class NotMutedException extends MuteException {
    public NotMutedException(String message) {
        super(HttpStatus.NOT_FOUND, "NOT_MUTED", message);
    }
}
