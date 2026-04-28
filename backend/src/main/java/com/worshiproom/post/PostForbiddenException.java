package com.worshiproom.post;

import org.springframework.http.HttpStatus;

/**
 * 403 returned when a non-author non-admin user attempts to PATCH or DELETE
 * a post owned by someone else.
 */
public class PostForbiddenException extends PostException {
    public PostForbiddenException() {
        super(HttpStatus.FORBIDDEN, "FORBIDDEN", "You do not have permission to modify this post.");
    }
}
