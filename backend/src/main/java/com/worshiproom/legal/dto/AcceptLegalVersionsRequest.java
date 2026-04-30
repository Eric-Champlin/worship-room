package com.worshiproom.legal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * POST /api/v1/users/me/legal/accept request body. Both fields are required and
 * must be ISO-8601 date strings (the @Pattern is defense-in-depth; the
 * service-layer LegalVersionService.isXVersionCurrent check is authoritative).
 *
 * <p>Per Spec 1.10f D5.
 */
public record AcceptLegalVersionsRequest(
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
