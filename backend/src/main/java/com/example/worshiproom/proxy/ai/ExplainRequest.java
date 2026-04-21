package com.example.worshiproom.proxy.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/v1/proxy/ai/explain}.
 *
 * Constraints:
 *   - {@code reference} is required and capped at 200 chars. Longest
 *     realistic Bible reference is ~50 chars (e.g., "The Song of Solomon
 *     5:2-16"); 200 is generous padding for defensive validation.
 *   - {@code verseText} is required and capped at 8000 chars. The longest
 *     chapter in scripture (Psalm 119) is ~12,000 chars; we cap AI
 *     explanation requests to 8000 to bound upstream cost and latency.
 *     Callers enforce a 20-verse cap upstream; 8000 is a hard backstop.
 */
public record ExplainRequest(
    @NotBlank(message = "reference is required")
    @Size(max = 200, message = "reference must be 200 characters or fewer")
    String reference,

    @NotBlank(message = "verseText is required")
    @Size(max = 8000, message = "verseText must be 8000 characters or fewer")
    String verseText
) {}
