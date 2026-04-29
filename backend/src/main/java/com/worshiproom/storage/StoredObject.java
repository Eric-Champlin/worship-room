package com.worshiproom.storage;

/**
 * Result of a successful {@link ObjectStorageAdapter#put} call.
 *
 * @param key         the storage key the object was written under
 * @param sizeBytes   the byte count actually persisted
 * @param etag        provider-supplied entity tag (S3 ETag, or local MD5 hex for the
 *                    LocalFilesystem adapter)
 * @param contentType MIME type recorded with the object
 */
public record StoredObject(String key, long sizeBytes, String etag, String contentType) {}
