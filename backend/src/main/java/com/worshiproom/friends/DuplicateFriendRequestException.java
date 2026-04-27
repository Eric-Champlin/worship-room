package com.worshiproom.friends;

import org.springframework.http.HttpStatus;

public class DuplicateFriendRequestException extends FriendsException {
    public DuplicateFriendRequestException(String message) {
        super(HttpStatus.CONFLICT, "DUPLICATE_FRIEND_REQUEST", message);
    }
}
