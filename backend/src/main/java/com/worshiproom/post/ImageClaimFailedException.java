package com.worshiproom.post;

import org.springframework.http.HttpStatus;

/**
 * 400 IMAGE_CLAIM_FAILED — pending upload could not be attached to the post.
 * Covers three failure modes (single user-facing message; cause chain logged
 * server-side via the request ID):
 *   1. Pending upload no longer exists (TTL-expired or already claimed)
 *   2. Pending upload belongs to a different user (path-based ownership check
 *      via the {userId} segment in the storage key)
 *   3. Storage backend failure mid-claim
 *
 * Lives in the post package because it's thrown during PostService.createPost.
 * Caught by the existing package-scoped PostExceptionHandler via PostException.
 */
public class ImageClaimFailedException extends PostException {
    public ImageClaimFailedException() {
        super(HttpStatus.BAD_REQUEST, "IMAGE_CLAIM_FAILED",
            "This upload could not be attached. Please re-upload the image.");
    }
}
