package com.worshiproom.friends;

import org.springframework.http.HttpStatus;

public class FriendRequestNotFoundException extends FriendsException {
    public FriendRequestNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, "FRIEND_REQUEST_NOT_FOUND", message);
    }
}
