package com.worshiproom.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds {@code worshiproom.storage.*} from application.properties for the object storage adapter.
 *
 * <p>Profile-specific consumption (see {@link StorageConfig}):
 * <ul>
 *   <li>dev → {@link LocalFilesystemStorageAdapter} reads {@code localPath}, {@code devSigningSecret},
 *       {@code maxPresignHours}.</li>
 *   <li>test → {@link S3StorageAdapter} reads {@code endpointUrl}, {@code region}, {@code accessKey},
 *       {@code secretKey}, {@code bucket}, {@code maxPresignHours}. Values supplied by the
 *       MinIO Testcontainer via {@code @DynamicPropertySource}.</li>
 *   <li>prod → {@link S3StorageAdapter} reads same as test; values come from {@code STORAGE_*} env vars.
 *       {@link S3StorageAdapter#initialize()} fail-fasts at startup if any are missing.</li>
 * </ul>
 *
 * <p>POJO (not a record) per Spec 1.10e Plan-Time Divergence #3 — {@code @ConfigurationProperties}
 * relaxed binding works most cleanly with mutable bean-style accessors.
 */
@Configuration
@ConfigurationProperties(prefix = "worshiproom.storage")
public class StorageProperties {

    private String localPath = "";
    private int maxPresignHours = 1;
    private String devSigningSecret = "";
    private String bucket = "";
    private String region = "";
    private String accessKey = "";
    private String secretKey = "";
    private String endpointUrl = "";

    public String getLocalPath() { return localPath; }
    public void setLocalPath(String localPath) { this.localPath = localPath; }

    public int getMaxPresignHours() { return maxPresignHours; }
    public void setMaxPresignHours(int maxPresignHours) { this.maxPresignHours = maxPresignHours; }

    public String getDevSigningSecret() { return devSigningSecret; }
    public void setDevSigningSecret(String devSigningSecret) { this.devSigningSecret = devSigningSecret; }

    public String getBucket() { return bucket; }
    public void setBucket(String bucket) { this.bucket = bucket; }

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }

    public String getAccessKey() { return accessKey; }
    public void setAccessKey(String accessKey) { this.accessKey = accessKey; }

    public String getSecretKey() { return secretKey; }
    public void setSecretKey(String secretKey) { this.secretKey = secretKey; }

    public String getEndpointUrl() { return endpointUrl; }
    public void setEndpointUrl(String endpointUrl) { this.endpointUrl = endpointUrl; }
}
