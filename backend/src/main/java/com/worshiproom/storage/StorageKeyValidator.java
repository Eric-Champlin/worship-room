package com.worshiproom.storage;

import java.util.regex.Pattern;

/**
 * Centralized storage key sanitization. Every {@link ObjectStorageAdapter} method that takes a
 * key calls {@link #validate(String)} BEFORE any IO so that:
 *
 * <ul>
 *   <li>Path traversal attempts ({@code ..}) are rejected without ever touching the filesystem
 *       (LocalFilesystem adapter) or the S3 API (S3 adapter).</li>
 *   <li>Unit tests (see {@code StorageKeyValidatorTest}) can exercise the rejection logic
 *       without instantiating an adapter.</li>
 * </ul>
 *
 * <p>Allowed character set: {@code [a-z0-9._/-]}. Rationale: lowercase forward-slash-separated
 * keys are the strict subset that R2, S3, GCS, B2, MinIO, and the local filesystem all accept
 * without case-folding or path-character ambiguity.
 *
 * <p>Final class with private constructor — invoke via the static method.
 */
public final class StorageKeyValidator {

    private StorageKeyValidator() {
        // Static-only.
    }

    private static final Pattern ALLOWED = Pattern.compile("^[a-z0-9._/-]+$");
    private static final int MAX_LENGTH = 256;

    /**
     * Throws {@link IllegalArgumentException} if the key is malformed. Returns silently on
     * success.
     *
     * <p>Rejected (in order): null, empty, longer than 256 chars, leading {@code /}, trailing
     * {@code /}, contains {@code //}, contains {@code ..}, contains any character outside
     * {@code [a-z0-9._/-]}.
     *
     * <p>Note: this method does NOT include the rejected key value in the exception message
     * or in any subsequent log line emitted by callers (see Spec 1.10e Step 3 guardrails).
     * That defensive omission keeps path-traversal probe values out of long-term log storage.
     */
    public static void validate(String key) {
        if (key == null || key.isEmpty()) {
            throw new IllegalArgumentException("Storage key must not be null or empty");
        }
        if (key.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("Storage key exceeds " + MAX_LENGTH + " characters");
        }
        if (key.startsWith("/") || key.endsWith("/")) {
            throw new IllegalArgumentException("Storage key must not start or end with '/'");
        }
        if (key.contains("//")) {
            throw new IllegalArgumentException("Storage key must not contain '//'");
        }
        if (key.contains("..")) {
            throw new IllegalArgumentException("Storage key must not contain '..'");
        }
        if (!ALLOWED.matcher(key).matches()) {
            throw new IllegalArgumentException(
                    "Storage key contains illegal characters (allowed: a-z 0-9 . _ / -)");
        }
    }

    /**
     * Validates a list prefix. Same character rules as {@link #validate(String)} EXCEPT a
     * trailing {@code /} is permitted — S3 / R2 / GCS conventionally encode "list this
     * directory" as a key prefix ending in {@code /}, so {@code "post-images/"} is a
     * legitimate prefix even though it would be rejected as a key.
     *
     * <p>Path traversal ({@code ..}), leading slash, and double slash are still rejected.
     */
    public static void validatePrefix(String prefix) {
        if (prefix == null || prefix.isEmpty()) {
            throw new IllegalArgumentException("Storage prefix must not be null or empty");
        }
        if (prefix.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("Storage prefix exceeds " + MAX_LENGTH + " characters");
        }
        if (prefix.startsWith("/")) {
            throw new IllegalArgumentException("Storage prefix must not start with '/'");
        }
        if (prefix.contains("//")) {
            throw new IllegalArgumentException("Storage prefix must not contain '//'");
        }
        if (prefix.contains("..")) {
            throw new IllegalArgumentException("Storage prefix must not contain '..'");
        }
        if (!ALLOWED.matcher(prefix).matches()) {
            throw new IllegalArgumentException(
                    "Storage prefix contains illegal characters (allowed: a-z 0-9 . _ / -)");
        }
    }
}
