package com.worshiproom.social;

import org.springframework.http.HttpStatus;

public class NudgeCooldownException extends SocialException {
    public NudgeCooldownException(String message) {
        super(HttpStatus.CONFLICT, "NUDGE_COOLDOWN", message);
    }
}
