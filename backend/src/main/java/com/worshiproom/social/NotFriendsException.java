package com.worshiproom.social;

import org.springframework.http.HttpStatus;

/**
 * Distinct from {@link com.worshiproom.friends.NotFriendsException} — same name,
 * different package, different HTTP status. The friends version returns 404
 * (used by {@code removeFriend} where the friendship-row lookup acts like a
 * "not found"); this version returns 403 because encouragement/nudge endpoints
 * authenticate the user successfully but reject the action authorization.
 */
public class NotFriendsException extends SocialException {
    public NotFriendsException(String message) {
        super(HttpStatus.FORBIDDEN, "NOT_FRIENDS", message);
    }
}
