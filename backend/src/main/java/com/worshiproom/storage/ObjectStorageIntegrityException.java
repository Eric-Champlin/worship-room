package com.worshiproom.storage;

/**
 * Thrown when an object storage operation detects a data integrity violation — most commonly,
 * the {@code contentLength} declared on a {@link ObjectStorageAdapter#put} call did not match
 * the byte count actually read from the input stream.
 *
 * <p>NOT extends {@code IOException} — this is a server-side data correctness violation, not
 * an IO error. Callers should not be forced to declare it in {@code throws} clauses.
 */
public class ObjectStorageIntegrityException extends RuntimeException {

    public ObjectStorageIntegrityException(String message) {
        super(message);
    }
}
