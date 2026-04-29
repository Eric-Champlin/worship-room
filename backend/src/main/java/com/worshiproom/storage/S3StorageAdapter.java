package com.worshiproom.storage;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * Production-side {@link ObjectStorageAdapter} for AWS S3 / Cloudflare R2 / MinIO / any
 * S3-API-compatible provider. Active under {@code test} (against MinIO Testcontainer) and
 * {@code prod} (against Cloudflare R2) profiles.
 *
 * <p>{@link #initialize()} runs at {@code @PostConstruct} time and:
 * <ul>
 *   <li>Under {@code prod} profile, fails fast with {@link IllegalStateException} naming the
 *       missing {@code STORAGE_*} env vars if any are absent — boot is aborted before traffic
 *       arrives.</li>
 *   <li>Builds the {@link S3Client} and {@link S3Presigner} from {@link StorageProperties}.</li>
 * </ul>
 *
 * <p>The adapter wraps every S3 operation in a bounded exponential-backoff retry: up to 3
 * retries after the initial attempt — for a total of up to 4 attempts — with 100ms / 300ms /
 * 1000ms backoff between consecutive attempts. 4xx other than 408 / 429 fail immediately; 5xx
 * and 408 / 429 retry.
 *
 * <p><b>Memory discipline:</b> {@link #put} reads the input stream into a bounded byte array
 * sized {@code contentLength + 1}. A stream that produces more bytes than declared is detected
 * and rejected before the SDK call fires; an attacker- or bug-supplied stream cannot drive an
 * unbounded allocation. {@link #MAX_PUT_BYTES} is the hard ceiling on the in-memory PUT path;
 * uploads larger than that are rejected at the adapter boundary. When Spec 4.6b lands the
 * large-image path, swap to {@code S3TransferManager} for streaming multipart uploads and bump
 * or remove this cap.
 *
 * <p>Logging discipline (per Spec 1.10e § Logging discipline):
 * <ul>
 *   <li>DEBUG on success: key + size + duration. Never the secret key.</li>
 *   <li>WARN on retry: attempt + key + status. Never the secret key.</li>
 *   <li>ERROR on final failure: key + error class + status. Never the secret key.</li>
 * </ul>
 */
public class S3StorageAdapter implements ObjectStorageAdapter {

    private static final Logger log = LoggerFactory.getLogger(S3StorageAdapter.class);

    private static final Duration[] RETRY_DELAYS = {
            Duration.ofMillis(100),
            Duration.ofMillis(300),
            Duration.ofMillis(1000)
    };

    /**
     * Hard ceiling on the in-memory PUT path. Any {@code contentLength} above this is rejected
     * at the adapter boundary so a buggy or malicious caller can't drive an OOM by declaring a
     * huge length and shipping a matching stream. The contract test's largest fixture is 6 MB,
     * so 16 MB gives plenty of headroom for the current test suite and any small-image use
     * case before Spec 4.6b switches the large-image path to {@code S3TransferManager}
     * (streaming multipart, no in-memory buffer).
     */
    static final long MAX_PUT_BYTES = 16L * 1024 * 1024;

    private final StorageProperties properties;
    private final Environment environment;

    private S3Client s3Client;
    private S3Presigner s3Presigner;

    public S3StorageAdapter(StorageProperties properties, Environment environment) {
        this.properties = properties;
        this.environment = environment;
    }

    @PostConstruct
    void initialize() {
        boolean isProd = Arrays.asList(environment.getActiveProfiles()).contains("prod");
        if (isProd) {
            validateRequiredEnvVars();
        }
        this.s3Client = buildClient();
        this.s3Presigner = buildPresigner();
    }

    /**
     * Releases the {@link S3Client} and {@link S3Presigner} HTTP clients and thread pools at
     * Spring context shutdown. Matters most for tests that load multiple application contexts
     * in one JVM run and for graceful shutdown of long-running deploys.
     */
    @PreDestroy
    void shutdown() {
        if (s3Client != null) {
            try {
                s3Client.close();
            } catch (Exception ex) {
                log.warn("S3Client close failed: {}", ex.getClass().getSimpleName());
            }
        }
        if (s3Presigner != null) {
            try {
                s3Presigner.close();
            } catch (Exception ex) {
                log.warn("S3Presigner close failed: {}", ex.getClass().getSimpleName());
            }
        }
    }

    private void validateRequiredEnvVars() {
        List<String> missing = new ArrayList<>();
        if (isBlank(properties.getBucket())) missing.add("STORAGE_BUCKET");
        if (isBlank(properties.getRegion())) missing.add("STORAGE_REGION");
        if (isBlank(properties.getAccessKey())) missing.add("STORAGE_ACCESS_KEY");
        if (isBlank(properties.getSecretKey())) missing.add("STORAGE_SECRET_KEY");
        if (isBlank(properties.getEndpointUrl())) missing.add("STORAGE_ENDPOINT_URL");
        if (!missing.isEmpty()) {
            throw new IllegalStateException(
                    "S3StorageAdapter is required in production but missing env vars: "
                            + String.join(", ", missing)
                            + ". Set these in Railway Variables. See backend/docs/runbook-storage.md.");
        }
    }

    private S3Client buildClient() {
        return S3Client.builder()
                .region(Region.of(properties.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(properties.getAccessKey(), properties.getSecretKey())))
                .endpointOverride(URI.create(properties.getEndpointUrl()))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .build();
    }

    private S3Presigner buildPresigner() {
        return S3Presigner.builder()
                .region(Region.of(properties.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(properties.getAccessKey(), properties.getSecretKey())))
                .endpointOverride(URI.create(properties.getEndpointUrl()))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .build();
    }

    @Override
    public StoredObject put(
            String key,
            InputStream data,
            long contentLength,
            String contentType,
            Map<String, String> metadata) {

        StorageKeyValidator.validate(key);
        if (contentLength < 0) {
            throw new IllegalArgumentException("contentLength must be non-negative");
        }
        if (contentLength > MAX_PUT_BYTES) {
            throw new ObjectStorageIntegrityException(
                    "contentLength=" + contentLength + " exceeds the in-memory PUT cap of "
                            + MAX_PUT_BYTES + " bytes. Large uploads will route through "
                            + "S3TransferManager when Spec 4.6b ships.");
        }
        long start = System.currentTimeMillis();

        // Bounded read: cap at contentLength + 1 so a stream producing more bytes than declared
        // is detected without unbounded allocation. readNBytes returns up to maxRead bytes —
        // shorter streams return shorter arrays, longer streams return exactly maxRead.
        int maxRead = (int) (contentLength + 1);
        byte[] bytes;
        try {
            bytes = data.readNBytes(maxRead);
        } catch (IOException e) {
            throw new ObjectStorageIntegrityException(
                    "Failed to read input stream for key '" + key + "': " + e.getMessage());
        }

        if (bytes.length != contentLength) {
            // Covers both directions: stream short of declared length, OR stream longer
            // (in which case readNBytes filled the cap and bytes.length == contentLength + 1).
            throw new ObjectStorageIntegrityException(
                    "Declared contentLength=" + contentLength + " but stream produced "
                            + (bytes.length > contentLength ? "at least " : "")
                            + bytes.length + " bytes");
        }

        // Normalize content type so dev-LocalFilesystem and prod-S3 return identical values
        // when the caller passes null/empty. Without this, get() on S3 would reflect the
        // provider default ("binary/octet-stream"), diverging from the LocalFilesystem path.
        String resolvedContentType =
                (contentType == null || contentType.isEmpty()) ? "application/octet-stream" : contentType;

        PutObjectRequest.Builder reqBuilder = PutObjectRequest.builder()
                .bucket(properties.getBucket())
                .key(key)
                .contentType(resolvedContentType);
        if (metadata != null && !metadata.isEmpty()) {
            reqBuilder.metadata(metadata);
        }
        PutObjectRequest req = reqBuilder.build();

        PutObjectResponse resp = withRetry(() ->
                s3Client.putObject(req, RequestBody.fromBytes(bytes)));

        long duration = System.currentTimeMillis() - start;
        log.debug("S3 put key={} sizeBytes={} durationMs={}", key, bytes.length, duration);
        return new StoredObject(key, bytes.length, resp.eTag(), resolvedContentType);
    }

    @Override
    public Optional<StoredObjectStream> get(String key) {
        StorageKeyValidator.validate(key);
        long start = System.currentTimeMillis();

        try {
            ResponseInputStream<GetObjectResponse> response = withRetry(() ->
                    s3Client.getObject(GetObjectRequest.builder()
                            .bucket(properties.getBucket())
                            .key(key)
                            .build()));
            GetObjectResponse meta = response.response();
            long duration = System.currentTimeMillis() - start;
            log.debug("S3 get key={} sizeBytes={} durationMs={}",
                    key, meta.contentLength(), duration);
            return Optional.of(new StoredObjectStream(
                    key,
                    response,
                    meta.contentLength() == null ? 0L : meta.contentLength(),
                    meta.contentType() == null ? "application/octet-stream" : meta.contentType(),
                    meta.metadata() == null ? Map.of() : Map.copyOf(meta.metadata())));
        } catch (NoSuchKeyException e) {
            return Optional.empty();
        }
    }

    @Override
    public boolean exists(String key) {
        StorageKeyValidator.validate(key);
        try {
            withRetry(() -> s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(properties.getBucket())
                    .key(key)
                    .build()));
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (S3Exception e) {
            if (e.statusCode() == 404) {
                return false;
            }
            throw e;
        }
    }

    @Override
    public boolean delete(String key) {
        StorageKeyValidator.validate(key);
        boolean existed = exists(key);
        if (!existed) {
            return false;
        }
        withRetry(() -> s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(properties.getBucket())
                .key(key)
                .build()));
        log.debug("S3 delete key={}", key);
        return true;
    }

    @Override
    public List<StoredObjectSummary> list(String prefix, int maxResults) {
        if (prefix != null && !prefix.isEmpty()) {
            StorageKeyValidator.validatePrefix(prefix);
        }
        ListObjectsV2Request.Builder reqBuilder = ListObjectsV2Request.builder()
                .bucket(properties.getBucket())
                .maxKeys(maxResults);
        if (prefix != null && !prefix.isEmpty()) {
            reqBuilder.prefix(prefix);
        }

        ListObjectsV2Response resp = withRetry(() -> s3Client.listObjectsV2(reqBuilder.build()));

        List<StoredObjectSummary> summaries = new ArrayList<>(resp.contents().size());
        resp.contents().stream()
                .sorted((a, b) -> a.key().compareTo(b.key()))
                .limit(maxResults)
                .forEach(o -> summaries.add(new StoredObjectSummary(
                        o.key(),
                        o.size() == null ? 0L : o.size(),
                        o.lastModified())));
        return summaries;
    }

    @Override
    public String generatePresignedUrl(String key, Duration expiry) {
        StorageKeyValidator.validate(key);
        if (expiry == null || expiry.isNegative() || expiry.isZero()) {
            throw new IllegalArgumentException("expiry must be positive");
        }
        Duration max = Duration.ofHours(properties.getMaxPresignHours());
        Duration capped = expiry.compareTo(max) > 0 ? max : expiry;

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(capped)
                .getObjectRequest(GetObjectRequest.builder()
                        .bucket(properties.getBucket())
                        .key(key)
                        .build())
                .build();
        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    /**
     * Bounded retry wrapper. On retriable failures (HTTP status &gt;= 500, 408, or 429), the
     * operation is retried up to 3 times after the initial attempt — for a total of up to
     * <b>4 attempts</b> — with 100ms / 300ms / 1000ms sleeps between consecutive attempts.
     * Other 4xx statuses bubble up immediately without retry. {@link NoSuchKeyException}
     * carries status 404 and is therefore NOT retried; call sites that need to convert it to
     * {@code Optional.empty()} catch it explicitly outside this wrapper.
     */
    private <T> T withRetry(Supplier<T> operation) {
        int attempt = 0;
        while (true) {
            try {
                return operation.get();
            } catch (S3Exception ex) {
                int status = ex.statusCode();
                boolean retriable = status >= 500 || status == 408 || status == 429;
                attempt++;
                if (!retriable || attempt > RETRY_DELAYS.length) {
                    throw ex;
                }
                Duration delay = RETRY_DELAYS[attempt - 1];
                log.warn("S3 transient failure attempt={} status={}", attempt, status);
                try {
                    Thread.sleep(delay.toMillis());
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw ex;
                }
            }
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
