package com.worshiproom.upload.dto;

/**
 * Response shape for {@code POST /api/v1/uploads/post-image} (Spec 4.6b).
 *
 * <p>The {@code uploadId} is the server-generated UUID identifying the pending
 * upload — clients send it back in {@code CreatePostRequest.imageUploadId} when
 * creating the post. The three URLs are presigned-GET URLs with TTL =
 * {@code worshiproom.storage.max-presign-hours} (1 hour default), pointing at
 * the {@code posts/pending/{userId}/{uploadId}/} prefix until the post is
 * created and the MOVE-on-claim relocates them under {@code posts/{postId}/}.
 */
public record UploadResponse(String uploadId, String fullUrl, String mediumUrl, String thumbUrl) {}
