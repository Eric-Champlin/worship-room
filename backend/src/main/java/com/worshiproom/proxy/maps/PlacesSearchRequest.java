package com.worshiproom.proxy.maps;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/v1/proxy/maps/places-search}.
 *
 * <p>{@code pageToken} is optional — null/empty means "first page". Google's
 * page tokens are typically ~70 characters; the 200 upper bound is generous.
 */
public record PlacesSearchRequest(
    @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double lat,
    @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double lng,
    @NotNull @Min(1) @Max(50) Integer radiusMiles,
    @NotBlank @Size(min = 1, max = 200) String keyword,
    @Size(max = 200) String pageToken
) {}
