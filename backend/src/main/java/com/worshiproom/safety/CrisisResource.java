package com.worshiproom.safety;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Single crisis-resource entry. One of {@code phone} or {@code text} will be
 * non-null; the other will be null. {@code link} is always present.
 * {@code chatUrl} is non-null only when the resource has a chat surface
 * (Spec 6.4 — 988 Lifeline only in v1).
 *
 * <p>Mirrors {@code CRISIS_RESOURCES} in
 * {@code frontend/src/constants/crisis-resources.ts}. The CrisisResourcesParityTest
 * asserts the lists stay in sync.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CrisisResource(
        String name,
        String phone,
        String text,
        String link,
        String chatUrl
) {}
