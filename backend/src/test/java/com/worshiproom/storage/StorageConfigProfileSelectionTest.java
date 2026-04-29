package com.worshiproom.storage;

import com.worshiproom.storage.controller.DevStorageController;
import com.worshiproom.support.TestContainers;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.NoSuchBeanDefinitionException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Verifies that {@link StorageConfig} registers the correct {@link ObjectStorageAdapter}
 * implementation under each profile, AND that {@link DevStorageController} only exists under
 * the dev profile.
 */
class StorageConfigProfileSelectionTest {

    @Nested
    @SpringBootTest
    @ActiveProfiles("dev")
    class DevProfile {

        @DynamicPropertySource
        static void configure(DynamicPropertyRegistry registry) {
            // Dev profile uses LocalFilesystem — point at a temp-ish path.
            registry.add("worshiproom.storage.local-path", () -> "/tmp/wr-storage-test-dev-profile");
            registry.add("worshiproom.storage.dev-signing-secret", () -> "dev-secret-32-chars-minimum-xxxxxx");
            registry.add("worshiproom.storage.max-presign-hours", () -> "1");
            // Stub backing infrastructure.
            registry.add("jwt.secret", () -> "dev-jwt-secret-32-chars-minimum-for-hs256-algorithm-xxxxxx");
            TestContainers.registerJdbcProperties(registry);
            registry.add("spring.liquibase.contexts", () -> "test");
            registry.add("spring.datasource.hikari.maximum-pool-size", () -> "3");
            registry.add("spring.datasource.hikari.minimum-idle", () -> "1");
        }

        @Autowired
        ApplicationContext ctx;

        @Test
        void onlyLocalFilesystemAdapterRegistered() {
            ObjectStorageAdapter bean = ctx.getBean(ObjectStorageAdapter.class);
            assertThat(bean).isInstanceOf(LocalFilesystemStorageAdapter.class);
            assertThat(ctx.getBeansOfType(S3StorageAdapter.class)).isEmpty();
        }

        @Test
        void devStorageControllerIsRegistered() {
            assertThat(ctx.getBeansOfType(DevStorageController.class)).isNotEmpty();
        }
    }

    @Nested
    @SpringBootTest
    @ActiveProfiles("test")
    class TestProfile {

        @DynamicPropertySource
        static void configure(DynamicPropertyRegistry registry) {
            // Test profile wires up S3StorageAdapter — supply dummy connection params (we
            // don't actually exercise the adapter here, just verify bean wiring).
            registry.add("worshiproom.storage.endpoint-url", () -> "http://127.0.0.1:9999");
            registry.add("worshiproom.storage.region", () -> "us-east-1");
            registry.add("worshiproom.storage.access-key", () -> "dummy");
            registry.add("worshiproom.storage.secret-key", () -> "dummy");
            registry.add("worshiproom.storage.bucket", () -> "test-bucket");
            registry.add("worshiproom.storage.max-presign-hours", () -> "1");
            registry.add("jwt.secret", () -> "test-jwt-secret-32-chars-minimum-for-hs256-algorithm-xxxxxx");
            TestContainers.registerJdbcProperties(registry);
            registry.add("spring.liquibase.contexts", () -> "test");
            registry.add("spring.datasource.hikari.maximum-pool-size", () -> "3");
            registry.add("spring.datasource.hikari.minimum-idle", () -> "1");
        }

        @Autowired
        ApplicationContext ctx;

        @Test
        void onlyS3AdapterRegistered() {
            ObjectStorageAdapter bean = ctx.getBean(ObjectStorageAdapter.class);
            assertThat(bean).isInstanceOf(S3StorageAdapter.class);
            assertThat(ctx.getBeansOfType(LocalFilesystemStorageAdapter.class)).isEmpty();
        }

        @Test
        void devStorageControllerNotRegistered() {
            assertThat(ctx.getBeansOfType(DevStorageController.class)).isEmpty();
            assertThatThrownBy(() -> ctx.getBean(DevStorageController.class))
                    .isInstanceOf(NoSuchBeanDefinitionException.class);
        }
    }
}
