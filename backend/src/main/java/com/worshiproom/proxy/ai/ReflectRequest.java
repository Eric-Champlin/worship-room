package com.worshiproom.proxy.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/v1/proxy/ai/reflect}.
 *
 * Same constraints as {@link ExplainRequest}. See that class for rationale.
 * Kept as a separate record so Explain and Reflect can diverge
 * independently if future iterations add per-feature fields.
 */
public record ReflectRequest(
    @NotBlank(message = "reference is required")
    @Size(max = 200, message = "reference must be 200 characters or fewer")
    String reference,

    @NotBlank(message = "verseText is required")
    @Size(max = 8000, message = "verseText must be 8000 characters or fewer")
    String verseText
) {}
