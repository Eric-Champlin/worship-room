package com.worshiproom.storage;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;

/**
 * Profile-gated wiring for {@link ObjectStorageAdapter}. Spring registers exactly ONE adapter
 * bean per profile activation:
 *
 * <ul>
 *   <li>{@code dev} → {@link LocalFilesystemStorageAdapter} (writes to
 *       {@code ${HOME}/.worshiproom-dev-storage})</li>
 *   <li>{@code test} → {@link S3StorageAdapter} (against MinIO Testcontainer; values bound
 *       via {@code @DynamicPropertySource} in {@code S3StorageAdapterIntegrationTest})</li>
 *   <li>{@code prod} → {@link S3StorageAdapter} (against Cloudflare R2 — fails fast at boot
 *       on missing {@code STORAGE_*} env vars)</li>
 * </ul>
 *
 * <p>Consumers inject {@code ObjectStorageAdapter} directly — never the implementation class.
 *
 * <p>NB: there is deliberately NO default bean. If the active profile set contains none of
 * dev / test / prod, the application context fails to start with "No qualifying bean of type
 * ObjectStorageAdapter" — better than silently falling back to LocalFilesystem in a
 * misconfigured environment.
 */
@Configuration
public class StorageConfig {

    @Bean
    @Profile("dev")
    public ObjectStorageAdapter localFilesystemAdapter(StorageProperties properties) {
        return new LocalFilesystemStorageAdapter(properties);
    }

    @Bean
    @Profile({"test", "prod"})
    public ObjectStorageAdapter s3Adapter(StorageProperties properties, Environment environment) {
        return new S3StorageAdapter(properties, environment);
    }
}
