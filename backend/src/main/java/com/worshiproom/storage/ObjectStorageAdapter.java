package com.worshiproom.storage;

import java.io.InputStream;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * The single abstraction every object-storage consumer depends on. Implementations:
 *
 * <ul>
 *   <li>{@link LocalFilesystemStorageAdapter} — registered under {@code dev} profile, writes to
 *       {@code ${HOME}/.worshiproom-dev-storage}.</li>
 *   <li>{@link S3StorageAdapter} — registered under {@code test} (against MinIO Testcontainer)
 *       and {@code prod} (against Cloudflare R2 / AWS S3 / any S3-API-compatible provider).</li>
 * </ul>
 *
 * <p>Wiring is in {@link StorageConfig}; consumers inject {@code ObjectStorageAdapter} directly.
 *
 * <p><b>Key validation:</b> every method that takes a {@code key} or {@code prefix} runs it
 * through {@link StorageKeyValidator#validate(String)} BEFORE doing any IO. Path-traversal
 * attempts ({@code ..}, leading/trailing {@code /}, etc.) throw {@link IllegalArgumentException}.
 *
 * <p><b>Failure mode:</b> implementations wrap upstream IO failures in
 * {@link ObjectStorageIntegrityException} or domain-specific runtime exceptions. Methods do NOT
 * declare {@code throws IOException} — that would force every caller into a {@code try/catch}
 * for what is, in practice, an unrecoverable infrastructure failure handled centrally by
 * {@link StorageExceptionHandler}.
 */
public interface ObjectStorageAdapter {

    /**
     * Stores {@code data} under {@code key}. Validates the key, throws
     * {@link IllegalArgumentException} for malformed keys. Throws
     * {@link ObjectStorageIntegrityException} if {@code contentLength} does not match the
     * actual byte count read from {@code data}.
     *
     * @param key           storage key (lowercase, forward-slash-separated)
     * @param data          payload to upload — caller closes
     * @param contentLength expected byte count; mismatch fails fast
     * @param contentType   MIME type recorded with the object
     * @param metadata      arbitrary key-value pairs persisted alongside the object
     * @return summary of the stored object including provider-supplied ETag
     */
    StoredObject put(
            String key,
            InputStream data,
            long contentLength,
            String contentType,
            Map<String, String> metadata);

    /**
     * Returns a streaming reference to the object at {@code key}, or empty if the key does not
     * exist. Caller MUST close the returned stream (try-with-resources) — leaving it open
     * leaks an HTTP connection on the S3 adapter.
     */
    Optional<StoredObjectStream> get(String key);

    /** Returns true if and only if a stored object exists for {@code key}. */
    boolean exists(String key);

    /**
     * Returns true if an object was deleted, false if the key did not exist. Idempotent — safe
     * to invoke for keys that may or may not exist.
     */
    boolean delete(String key);

    /**
     * Returns up to {@code maxResults} object summaries with keys starting with {@code prefix},
     * ordered ascending by key. Empty {@code prefix} lists all keys (validation is skipped for
     * the empty case since {@link StorageKeyValidator#validate(String)} rejects empty input).
     */
    List<StoredObjectSummary> list(String prefix, int maxResults);

    /**
     * Returns a time-limited URL for direct read access to the object. {@code expiry} is capped
     * at {@code worshiproom.storage.max-presign-hours}. Throws {@link IllegalArgumentException}
     * if {@code expiry.isNegative()} or {@code expiry.isZero()}.
     */
    String generatePresignedUrl(String key, Duration expiry);
}
