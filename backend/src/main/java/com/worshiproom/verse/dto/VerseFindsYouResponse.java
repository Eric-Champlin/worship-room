package com.worshiproom.verse.dto;

import java.time.OffsetDateTime;

/**
 * Wire response for {@code GET /api/v1/verse-finds-you}. Either:
 *   - {@code verse != null} and {@code reason == null} (a verse was surfaced); or
 *   - {@code verse == null} and {@code reason in {cooldown, crisis_suppression, disabled, no_match}}.
 *
 * <p>{@code cooldownUntil} is non-null only when {@code reason == "cooldown"}.
 *
 * <p>Wire format: camelCase per project convention. {@code reason} is lowercased
 * by the controller before serialization to match Spec 6.8's documented enum
 * values.
 *
 * <p>{@code @JsonInclude} is NOT applied here — the spec REQUIRES nullable fields
 * to surface as explicit nulls (e.g., {@code "verse": null}) so frontend type
 * narrowing works. The global {@code spring.jackson.default-property-inclusion=non_null}
 * default is overridden by the explicit field types — well, no, the default WILL
 * drop nulls. Add per-record {@code @JsonInclude(JsonInclude.Include.ALWAYS)} so
 * the contract is preserved.
 */
@com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.ALWAYS)
public record VerseFindsYouResponse(
    VerseDto verse,
    OffsetDateTime cooldownUntil,
    String reason
) {}
