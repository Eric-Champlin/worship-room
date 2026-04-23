package com.worshiproom.proxy.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ConversationMessage(
    @NotBlank @Pattern(regexp = "^(user|assistant)$", message = "role must be 'user' or 'assistant'")
    String role,
    @NotBlank @Size(min = 1, max = 2000)
    String content
) {}
