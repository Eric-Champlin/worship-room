package com.worshiproom.auth.session;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link GeoIpResolver}. The test runs in degraded mode (no
 * GeoLite2-City.mmdb file present) and verifies the graceful-degradation
 * contract: boot succeeds, every lookup returns null, never throws.
 *
 * <p>Tests that exercise REAL GeoIP lookups (requires MAXMIND_LICENSE_KEY +
 * downloaded .mmdb) belong in a future integration test class with explicit
 * test-fixture data.
 */
@DisplayName("GeoIpResolver — degraded mode (no .mmdb present)")
class GeoIpResolverTest {

    @Test
    @DisplayName("missing .mmdb file: initialize succeeds, isAvailable() = false")
    void missingDatabaseBootsCleanlyInDegradedMode() {
        GeoIpResolver resolver = new GeoIpResolver("/nonexistent/path/to/GeoLite2-City.mmdb");
        resolver.initialize();

        assertThat(resolver.isAvailable()).isFalse();
    }

    @Test
    @DisplayName("lookupCity returns null in degraded mode (never throws)")
    void lookupCityInDegradedModeReturnsNull() {
        GeoIpResolver resolver = new GeoIpResolver("/nonexistent/path");
        resolver.initialize();

        assertThat(resolver.lookupCity("8.8.8.8")).isNull();
        assertThat(resolver.lookupCity("203.0.113.5")).isNull();
        assertThat(resolver.lookupCity("127.0.0.1")).isNull();
    }

    @Test
    @DisplayName("lookupCity with null/blank IP returns null")
    void lookupCityNullIpReturnsNull() {
        GeoIpResolver resolver = new GeoIpResolver("/nonexistent/path");
        resolver.initialize();

        assertThat(resolver.lookupCity(null)).isNull();
        assertThat(resolver.lookupCity("")).isNull();
        assertThat(resolver.lookupCity("   ")).isNull();
    }

    @Test
    @DisplayName("close() is safe to call when database never loaded")
    void closeIsSafeWhenDatabaseNeverLoaded() {
        GeoIpResolver resolver = new GeoIpResolver("/nonexistent/path");
        resolver.initialize();
        // Should not throw.
        resolver.close();
    }
}
