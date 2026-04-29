package com.worshiproom.storage;

import com.worshiproom.support.TestContainers;
import org.junit.jupiter.api.BeforeAll;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MinIOContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Runs the full {@link AbstractObjectStorageContractTest} suite against
 * {@link S3StorageAdapter} backed by a MinIO Testcontainer. This is the spec's load-bearing
 * verification that the S3 code path matches the LocalFilesystem behavior end-to-end.
 *
 * <p>Activated under the {@code test} profile so {@link StorageConfig} wires up
 * {@link S3StorageAdapter}.
 *
 * <p><b>Plan deviation:</b> Plan Step 13 said "do NOT extend {@code AbstractIntegrationTest}".
 * Java single-inheritance prevents extending both {@code AbstractObjectStorageContractTest}
 * AND {@code AbstractIntegrationTest}, so this class extends the contract base and registers
 * the singleton PostgreSQL container's JDBC properties directly via
 * {@code TestContainers.registerJdbcProperties}. Same singleton container the rest of the
 * suite uses — no extra container startup cost. Plus the Liquibase context override and Hikari
 * pool cap that {@code AbstractIntegrationTest} normally provides.
 *
 * <p>MinIO container is per-class — only this test class needs it.
 */
@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
@SuppressWarnings("resource") // MinIO container lifetime == test class; Ryuk cleans up at JVM exit.
class S3StorageAdapterIntegrationTest extends AbstractObjectStorageContractTest {

    private static final String MINIO_IMAGE = "minio/minio:RELEASE.2024-12-18T13-15-44Z";
    private static final String MINIO_USER = "testuser";
    private static final String MINIO_PASS = "testpassword12345";
    private static final String TEST_BUCKET = "test-bucket";

    @Container
    static MinIOContainer minio = new MinIOContainer(MINIO_IMAGE)
            .withUserName(MINIO_USER)
            .withPassword(MINIO_PASS);

    @DynamicPropertySource
    static void registerStorageProperties(DynamicPropertyRegistry registry) {
        registry.add("worshiproom.storage.endpoint-url", minio::getS3URL);
        registry.add("worshiproom.storage.region", () -> "us-east-1");
        registry.add("worshiproom.storage.access-key", minio::getUserName);
        registry.add("worshiproom.storage.secret-key", minio::getPassword);
        registry.add("worshiproom.storage.bucket", () -> TEST_BUCKET);
        registry.add("worshiproom.storage.max-presign-hours", () -> "1");
        registry.add("jwt.secret", () -> "test-jwt-secret-for-s3-adapter-32-chars-minimum-xxxxxx");
    }

    @DynamicPropertySource
    static void registerPostgresProperties(DynamicPropertyRegistry registry) {
        // The S3 adapter test does not query the database, but the Spring context needs JPA
        // bootstrap to succeed. Reuse the JVM-singleton PostgreSQL container.
        TestContainers.registerJdbcProperties(registry);
        registry.add("spring.liquibase.contexts", () -> "test");
        registry.add("spring.datasource.hikari.maximum-pool-size", () -> "3");
        registry.add("spring.datasource.hikari.minimum-idle", () -> "1");
    }

    @BeforeAll
    static void createBucket() {
        try (S3Client adminClient = S3Client.builder()
                .region(Region.US_EAST_1)
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(MINIO_USER, MINIO_PASS)))
                .endpointOverride(URI.create(minio.getS3URL()))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .build()) {
            try {
                adminClient.createBucket(CreateBucketRequest.builder().bucket(TEST_BUCKET).build());
            } catch (S3Exception e) {
                // 409 BucketAlreadyOwnedByYou is fine — bucket exists from a prior test run.
                if (e.statusCode() != 409) {
                    throw e;
                }
            }
        }
    }

    @Autowired
    private ObjectStorageAdapter wiredAdapter;

    @Override
    protected ObjectStorageAdapter adapter() {
        return wiredAdapter;
    }

    /**
     * S3 presigned URLs encode expiry as {@code X-Amz-Date} (an ISO-8601 instant) plus
     * {@code X-Amz-Expires} (seconds-from-X-Amz-Date). Compute the absolute Unix-seconds
     * expiry by parsing both.
     */
    @Override
    protected long extractExpiresFromUrl(String url) {
        Matcher dateMatcher = Pattern.compile("X-Amz-Date=([^&]+)").matcher(url);
        Matcher expiresMatcher = Pattern.compile("X-Amz-Expires=(\\d+)").matcher(url);
        if (!dateMatcher.find() || !expiresMatcher.find()) {
            throw new AssertionError("S3 presigned URL missing X-Amz-Date or X-Amz-Expires: " + url);
        }
        String amzDate = URLDecoder.decode(dateMatcher.group(1), StandardCharsets.UTF_8);
        long expiresSeconds = Long.parseLong(expiresMatcher.group(1));
        // X-Amz-Date format: YYYYMMDD'T'HHMMSS'Z'
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'")
                .withZone(ZoneOffset.UTC);
        Instant signedAt = Instant.from(fmt.parse(amzDate));
        return signedAt.getEpochSecond() + expiresSeconds;
    }
}
