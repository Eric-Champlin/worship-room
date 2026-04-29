package com.worshiproom.storage;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * Dev-time {@link ObjectStorageAdapter} that writes to {@code ${HOME}/.worshiproom-dev-storage}
 * (configurable via {@code worshiproom.storage.local-path}). Sidecar {@code <key>.meta.json}
 * files store {@code contentType} + arbitrary metadata alongside the data file.
 *
 * <p>Presigned URLs point at {@code http://localhost:8080/dev-storage/{key}?expires=...&signature=...}
 * where the signature is HMAC-SHA256 of {@code key:expires} using
 * {@code worshiproom.storage.dev-signing-secret}. The dev-only {@code DevStorageController}
 * verifies and serves.
 *
 * <p>NOT production-grade: no concurrency guarantees beyond {@code ATOMIC_MOVE}, no quota,
 * no replication. Active under {@code dev} profile only.
 */
public class LocalFilesystemStorageAdapter implements ObjectStorageAdapter {

    private static final Logger log = LoggerFactory.getLogger(LocalFilesystemStorageAdapter.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String META_SUFFIX = ".meta.json";

    private final StorageProperties properties;

    public LocalFilesystemStorageAdapter(StorageProperties properties) {
        this.properties = properties;
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

        Path root = rootPath();
        Path target = root.resolve(key).normalize();

        // Defensive check: ensure resolved path stays under the root (the validator already
        // rejects '..', but layered defense is cheap).
        if (!target.startsWith(root)) {
            throw new IllegalArgumentException("Storage key resolves outside the storage root");
        }

        try {
            Files.createDirectories(target.getParent());

            Path tempPath = target.getParent().resolve("." + UUID.randomUUID() + ".tmp");
            long actualBytes;
            boolean overran;
            String md5Hex;
            try {
                MessageDigest md5 = MessageDigest.getInstance("MD5");
                try (InputStream in = data; OutputStream out = Files.newOutputStream(tempPath)) {
                    byte[] buffer = new byte[8192];
                    long total = 0;
                    int read;
                    // Stop as soon as we know the stream has more bytes than declared — saves
                    // disk on a too-long stream and keeps adapter behavior symmetric with the
                    // S3 path's contentLength-bounded read.
                    while (total <= contentLength && (read = in.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                        md5.update(buffer, 0, read);
                        total += read;
                    }
                    overran = total > contentLength;
                    actualBytes = total;
                }
                md5Hex = bytesToHex(md5.digest());
            } catch (NoSuchAlgorithmException e) {
                throw new IllegalStateException("MD5 unavailable in JVM", e);
            }

            if (overran || actualBytes != contentLength) {
                Files.deleteIfExists(tempPath);
                throw new ObjectStorageIntegrityException(
                        "Declared contentLength=" + contentLength + " but stream produced "
                                + (overran ? "at least " : "") + actualBytes + " bytes");
            }

            Files.move(tempPath, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);

            // Write sidecar.
            Path sidecar = sidecarPath(target);
            Map<String, Object> meta = Map.of(
                    "contentType", contentType == null ? "application/octet-stream" : contentType,
                    "metadata", metadata == null ? Map.of() : metadata);
            Files.write(sidecar, MAPPER.writeValueAsBytes(meta));

            log.debug("LocalFilesystem put key={} sizeBytes={}", key, actualBytes);
            return new StoredObject(key, actualBytes,
                    md5Hex,
                    contentType == null ? "application/octet-stream" : contentType);

        } catch (IOException e) {
            throw new ObjectStorageIntegrityException("Failed to put key '" + key + "': " + e.getMessage());
        }
    }

    @Override
    public Optional<StoredObjectStream> get(String key) {
        StorageKeyValidator.validate(key);
        Path target = rootPath().resolve(key).normalize();
        if (!Files.exists(target) || !Files.isRegularFile(target)) {
            return Optional.empty();
        }
        try {
            String contentType = "application/octet-stream";
            Map<String, String> metadata = Map.of();
            Path sidecar = sidecarPath(target);
            if (Files.exists(sidecar)) {
                Map<String, Object> raw = MAPPER.readValue(Files.readAllBytes(sidecar),
                        new TypeReference<Map<String, Object>>() {});
                Object ct = raw.get("contentType");
                if (ct instanceof String s && !s.isEmpty()) {
                    contentType = s;
                }
                Object md = raw.get("metadata");
                if (md instanceof Map<?, ?> m) {
                    Map<String, String> parsed = new java.util.HashMap<>();
                    m.forEach((k, v) -> parsed.put(String.valueOf(k), String.valueOf(v)));
                    metadata = Map.copyOf(parsed);
                }
            }
            long size = Files.size(target);
            InputStream stream = Files.newInputStream(target);
            log.debug("LocalFilesystem get key={} sizeBytes={}", key, size);
            return Optional.of(new StoredObjectStream(key, stream, size, contentType, metadata));
        } catch (IOException e) {
            throw new ObjectStorageIntegrityException("Failed to get key '" + key + "': " + e.getMessage());
        }
    }

    @Override
    public boolean exists(String key) {
        StorageKeyValidator.validate(key);
        Path target = rootPath().resolve(key).normalize();
        return Files.exists(target) && Files.isRegularFile(target);
    }

    @Override
    public boolean delete(String key) {
        StorageKeyValidator.validate(key);
        Path target = rootPath().resolve(key).normalize();
        Path sidecar = sidecarPath(target);
        try {
            boolean dataDeleted = Files.deleteIfExists(target);
            // Sidecar deletion is best-effort — never block the result on it.
            Files.deleteIfExists(sidecar);
            if (dataDeleted) {
                log.debug("LocalFilesystem delete key={}", key);
            }
            return dataDeleted;
        } catch (IOException e) {
            throw new ObjectStorageIntegrityException("Failed to delete key '" + key + "': " + e.getMessage());
        }
    }

    @Override
    public List<StoredObjectSummary> list(String prefix, int maxResults) {
        // Empty prefix means "list all" — skip validation for empty case since the
        // prefix validator rejects empty strings.
        if (prefix != null && !prefix.isEmpty()) {
            StorageKeyValidator.validatePrefix(prefix);
        }
        Path root = rootPath();
        if (!Files.exists(root)) {
            return List.of();
        }
        List<StoredObjectSummary> results = new ArrayList<>();
        try (Stream<Path> walk = Files.walk(root)) {
            walk
                    .filter(Files::isRegularFile)
                    .filter(p -> !p.getFileName().toString().endsWith(META_SUFFIX))
                    .map(p -> toSummary(root, p))
                    .filter(s -> prefix == null || prefix.isEmpty() || s.key().startsWith(prefix))
                    .sorted(Comparator.comparing(StoredObjectSummary::key))
                    .limit(maxResults)
                    .forEach(results::add);
        } catch (IOException e) {
            throw new ObjectStorageIntegrityException("Failed to list prefix '" + prefix + "': " + e.getMessage());
        }
        return results;
    }

    @Override
    public String generatePresignedUrl(String key, Duration expiry) {
        StorageKeyValidator.validate(key);
        if (expiry == null || expiry.isNegative() || expiry.isZero()) {
            throw new IllegalArgumentException("expiry must be positive");
        }

        Duration max = Duration.ofHours(properties.getMaxPresignHours());
        Duration capped = expiry.compareTo(max) > 0 ? max : expiry;
        long expiresAt = Instant.now().plus(capped).getEpochSecond();

        String secret = properties.getDevSigningSecret();
        if (secret == null || secret.isEmpty()) {
            throw new IllegalStateException(
                    "worshiproom.storage.dev-signing-secret is not configured");
        }

        String signature = computeHmac(key, expiresAt, secret);
        return "http://localhost:8080/dev-storage/" + key + "?expires=" + expiresAt + "&signature=" + signature;
    }

    /** Public for DevStorageController (in {@code com.worshiproom.storage.controller}) and tests. */
    public static String computeHmac(String key, long expiresAt, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] sig = mac.doFinal((key + ":" + expiresAt).getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(sig);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HMAC-SHA256 unavailable in JVM", e);
        }
    }

    private Path rootPath() {
        String localPath = properties.getLocalPath();
        if (localPath == null || localPath.isEmpty()) {
            throw new IllegalStateException(
                    "worshiproom.storage.local-path is not configured (required under dev profile)");
        }
        return Paths.get(localPath).toAbsolutePath().normalize();
    }

    private static Path sidecarPath(Path target) {
        return target.resolveSibling(target.getFileName().toString() + META_SUFFIX);
    }

    private static StoredObjectSummary toSummary(Path root, Path file) {
        try {
            String relative = root.relativize(file).toString().replace('\\', '/');
            return new StoredObjectSummary(
                    relative,
                    Files.size(file),
                    Files.getLastModifiedTime(file).toInstant());
        } catch (IOException e) {
            throw new ObjectStorageIntegrityException("Failed to stat file '" + file + "': " + e.getMessage());
        }
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
