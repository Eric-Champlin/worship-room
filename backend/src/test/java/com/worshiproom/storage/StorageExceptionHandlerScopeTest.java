package com.worshiproom.storage;

import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that {@link StorageExceptionHandler} is annotated with a basePackages-scoped
 * {@link RestControllerAdvice}. This is a hard requirement of the project's domain-scoping
 * pattern (see {@code 03-backend-standards.md} § "@RestControllerAdvice Scoping") — without
 * the scoping, the {@code IllegalArgumentException} handler in this advice would intercept
 * IAEs thrown from sibling-package controllers (post, friends, etc.) and reshape their
 * responses to the storage error format.
 *
 * <p>Behavioral verification (IAE from storage controller catches; IAE from post controller
 * does not) is covered end-to-end by {@code DevStorageControllerSignatureTest} (Step 9) and
 * the existing post-domain integration suite.
 */
class StorageExceptionHandlerScopeTest {

    @Test
    void scopedToStorageBasePackage() {
        RestControllerAdvice advice = StorageExceptionHandler.class
                .getAnnotation(RestControllerAdvice.class);
        assertThat(advice).as("StorageExceptionHandler must be annotated @RestControllerAdvice").isNotNull();
        assertThat(advice.basePackages())
                .as("StorageExceptionHandler must be scoped to com.worshiproom.storage")
                .containsExactly("com.worshiproom.storage");
    }
}
