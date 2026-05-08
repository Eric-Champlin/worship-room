package com.worshiproom.post.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** Request body for PATCH /api/v1/posts/{id}/resolve (Spec 4.4). */
public record ResolveQuestionRequest(@NotNull UUID commentId) {}
