package com.worshiproom.activity.dto;

import java.util.Map;

/**
 * Documentation-only envelope mirror for {@code POST /api/v1/activity}.
 *
 * <p>The controller returns {@code ProxyResponse<ActivityResponseData>} for
 * envelope parity with every other endpoint in the project. This record
 * exists purely so the OpenAPI spec's {@code ActivityResponse} schema
 * has a 1:1 Java analogue for spec doc traceability — it is NOT used as
 * a controller return type.
 */
public record ActivityResponse(
    ActivityResponseData data,
    Map<String, Object> meta
) {}
