package com.worshiproom.activity.dto;

import com.worshiproom.activity.ActivityType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;

/**
 * Request body for {@code POST /api/v1/activity}.
 *
 * <p>Bean Validation:
 * <ul>
 *   <li>{@code activityType} — required (Jackson rejects unknown enum values
 *       with {@code IllegalArgumentException} from
 *       {@link ActivityType#fromWireValue}; the service-layer
 *       {@code ActivityValidationExceptionHandler} maps that to 400 INVALID_INPUT).
 *   <li>{@code sourceFeature} — required, 1–50 characters.
 *   <li>{@code metadata} — optional; opaque {@code Map<String, Object>}
 *       persisted as JSONB. The backend does NOT inspect or validate
 *       metadata contents (per spec § Architectural Decision #15).
 * </ul>
 */
public record ActivityRequest(
    @NotNull(message = "activityType is required")
    ActivityType activityType,

    @NotBlank(message = "sourceFeature is required")
    @Size(max = 50, message = "sourceFeature must be 50 characters or fewer")
    String sourceFeature,

    Map<String, Object> metadata
) {}
