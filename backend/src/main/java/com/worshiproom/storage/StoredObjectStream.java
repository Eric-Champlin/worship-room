package com.worshiproom.storage;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;

/**
 * Streaming read result from {@link ObjectStorageAdapter#get}. Implements {@link AutoCloseable}
 * so callers can use try-with-resources directly:
 *
 * <pre>{@code
 * try (StoredObjectStream sos = adapter.get(key).orElseThrow()) {
 *     byte[] body = sos.stream().readAllBytes();
 * }
 * }</pre>
 *
 * <p>The adapter does not buffer the full payload in memory; for the S3 adapter,
 * {@link #stream()} is the SDK's {@code ResponseInputStream<GetObjectResponse>} and leaving it
 * unclosed leaks the underlying HTTP connection.
 */
public record StoredObjectStream(
        String key,
        InputStream stream,
        long sizeBytes,
        String contentType,
        Map<String, String> metadata) implements AutoCloseable {

    @Override
    public void close() throws IOException {
        if (stream != null) {
            stream.close();
        }
    }
}
