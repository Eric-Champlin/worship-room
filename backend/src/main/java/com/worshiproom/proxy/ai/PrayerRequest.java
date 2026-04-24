package com.worshiproom.proxy.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PrayerRequest(
    @NotBlank @Size(min = 1, max = 500) String request
) {}
