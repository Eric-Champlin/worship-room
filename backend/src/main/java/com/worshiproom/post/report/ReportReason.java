package com.worshiproom.post.report;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Categorical reason for a moderation report (Spec 3.8).
 *
 * <p>Java values use SCREAMING_SNAKE_CASE; JSON wire format uses lowercase via
 * {@link JsonProperty}. JPA persistence uses {@link ReportReasonConverter}
 * which maps to lowercase storage matching the OpenAPI wire format.
 */
public enum ReportReason {
    @JsonProperty("spam") SPAM,
    @JsonProperty("harassment") HARASSMENT,
    @JsonProperty("hate") HATE,
    @JsonProperty("self_harm") SELF_HARM,
    @JsonProperty("sexual") SEXUAL,
    @JsonProperty("other") OTHER
}
