package com.worshiproom.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank @Email @Size(max = 255) String email,
    @NotBlank @Size(min = 8, max = 255) String password,
    @NotBlank @Size(max = 100) String firstName,
    @NotBlank @Size(max = 100) String lastName,
    @Size(max = 50) String timezone,
    @NotBlank
    @Size(max = 20)
    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$",
             message = "termsVersion must be ISO-8601 date YYYY-MM-DD")
    String termsVersion,
    @NotBlank
    @Size(max = 20)
    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$",
             message = "privacyVersion must be ISO-8601 date YYYY-MM-DD")
    String privacyVersion
) {}
