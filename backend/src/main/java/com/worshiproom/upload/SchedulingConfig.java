package com.worshiproom.upload;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Enables Spring's {@code @Scheduled} annotation processing.
 *
 * <p>4.6b is the first spec in the codebase to introduce a scheduled task
 * ({@link PendingUploadCleanupTask}). The annotation lives on its own class so
 * future scheduled tasks have a stable seam to register against.
 *
 * <p>Class is intentionally empty — the {@code @EnableScheduling} meta-annotation
 * is the only contribution.
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
