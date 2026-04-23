package com.worshiproom.proxy.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JournalReflectionRequest(
    @NotBlank @Size(min = 1, max = 5000) String entry
) {}
