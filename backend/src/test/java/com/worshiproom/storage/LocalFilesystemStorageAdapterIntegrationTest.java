package com.worshiproom.storage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Runs the full {@link AbstractObjectStorageContractTest} suite against
 * {@link LocalFilesystemStorageAdapter} using a JUnit {@code @TempDir} as the storage root.
 *
 * <p>Pure-Java JUnit — no {@code @SpringBootTest}, no Spring context. Sub-second runtime.
 */
class LocalFilesystemStorageAdapterIntegrationTest extends AbstractObjectStorageContractTest {

    private static final Pattern EXPIRES_QUERY = Pattern.compile("expires=(\\d+)");

    @TempDir
    Path tempDir;

    private LocalFilesystemStorageAdapter testAdapter;

    @BeforeEach
    void setUp() {
        StorageProperties props = new StorageProperties();
        props.setLocalPath(tempDir.toString());
        props.setMaxPresignHours(1);
        props.setDevSigningSecret("test-signing-secret-32-chars-long-xxxxxx");
        testAdapter = new LocalFilesystemStorageAdapter(props);
    }

    @Override
    protected ObjectStorageAdapter adapter() {
        return testAdapter;
    }

    @Override
    protected long extractExpiresFromUrl(String url) {
        Matcher m = EXPIRES_QUERY.matcher(url);
        if (!m.find()) {
            throw new AssertionError("No 'expires=' in local presigned URL: " + url);
        }
        return Long.parseLong(m.group(1));
    }
}
