package com.worshiproom.post;

import org.springframework.http.HttpStatus;

public class AnonymousNotAllowedException extends PostException {

    private final String postType;

    public AnonymousNotAllowedException(String postType) {
        super(HttpStatus.BAD_REQUEST, "ANONYMOUS_NOT_ALLOWED",
              String.format("Anonymous posting is not allowed for %s posts.", postType));
        this.postType = postType;
    }

    public String getPostType() {
        return postType;
    }
}
