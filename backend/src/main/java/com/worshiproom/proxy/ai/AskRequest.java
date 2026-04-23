package com.worshiproom.proxy.ai;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record AskRequest(
    @NotBlank @Size(min = 1, max = 500) String question,
    @Valid @Size(max = 6) List<ConversationMessage> conversationHistory
) {}
