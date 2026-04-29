package com.worshiproom.storage;

import com.worshiproom.auth.PublicPaths;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Contract test: {@code /dev-storage/**} must be in
 * {@link PublicPaths#OPTIONAL_AUTH_PATTERNS} so that anonymous GET requests
 * are permitted by Spring Security. The DevStorageController itself
 * verifies the HMAC signature; without the OPTIONAL_AUTH_PATTERNS entry,
 * unauthenticated requests would be rejected by the security filter
 * chain before reaching the controller.
 */
class PublicPathsDevStorageTest {

    @Test
    void devStorageInOptionalAuthPatterns() {
        assertThat(PublicPaths.OPTIONAL_AUTH_PATTERNS)
                .as("/dev-storage/** must be in OPTIONAL_AUTH_PATTERNS so dev presigned URLs work")
                .contains("/dev-storage/**");
    }

    @Test
    void devStorageNotInPatterns() {
        // Documenting the deliberate choice: it lives in OPTIONAL_AUTH_PATTERNS, not PATTERNS.
        // PATTERNS would skip the JWT filter entirely; OPTIONAL_AUTH_PATTERNS still runs the filter
        // (which is fine — anonymous requests yield null principal, valid tokens are ignored by the
        // dev controller). See plan Step 10 § "Why OPTIONAL_AUTH_PATTERNS over PATTERNS".
        assertThat(PublicPaths.PATTERNS)
                .as("/dev-storage/** is intentionally NOT in PATTERNS — see plan Step 10")
                .doesNotContain("/dev-storage/**");
    }
}
