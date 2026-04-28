package com.worshiproom.post;

import org.springframework.http.HttpStatus;

public class InvalidScripturePairException extends PostException {
    public InvalidScripturePairException() {
        super(HttpStatus.BAD_REQUEST, "INVALID_INPUT",
              "scriptureReference and scriptureText must both be present or both be absent.");
    }
}
