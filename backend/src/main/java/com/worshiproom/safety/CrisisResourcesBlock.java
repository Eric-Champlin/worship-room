package com.worshiproom.safety;

import java.util.List;

/**
 * Response payload returned alongside PostDto when crisis flag fires on
 * post creation. Sits at the response root, parallel to {@code data}, so
 * the frontend can detect the resources block via {@code response.crisisResources != null}
 * without parsing the post body.
 */
public record CrisisResourcesBlock(
        String message,
        List<CrisisResource> resources
) {}
