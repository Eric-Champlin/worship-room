package com.worshiproom.post;

import org.springframework.http.HttpStatus;

/**
 * 404 returned when a post does not exist, is soft-deleted, or fails the
 * visibility predicate (anti-enumeration — no differential between forbidden
 * and missing).
 */
public class PostNotFoundException extends PostException {
    public PostNotFoundException() {
        super(HttpStatus.NOT_FOUND, "POST_NOT_FOUND", "Post not found");
    }
}
