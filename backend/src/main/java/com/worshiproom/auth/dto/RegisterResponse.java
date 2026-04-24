package com.worshiproom.auth.dto;

public record RegisterResponse(boolean registered) {
    public static RegisterResponse ok() { return new RegisterResponse(true); }
}
