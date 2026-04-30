package com.worshiproom.legal.dto;

/**
 * GET /api/v1/legal/versions response shape (wrapped in ProxyResponse envelope).
 * Per Spec 1.10f D4.
 */
public record LegalVersionsResponse(
    String termsVersion,
    String privacyVersion,
    String communityGuidelinesVersion
) {}
