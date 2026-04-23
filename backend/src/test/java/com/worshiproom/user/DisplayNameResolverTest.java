package com.worshiproom.user;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class DisplayNameResolverTest {

    @Test
    void firstOnlyReturnsJustFirstName() {
        assertThat(DisplayNameResolver.resolve("Sarah", "Johnson", null, DisplayNamePreference.FIRST_ONLY))
            .isEqualTo("Sarah");
    }

    @Test
    void firstLastInitialReturnsFirstPlusInitial() {
        assertThat(DisplayNameResolver.resolve("Sarah", "Johnson", null, DisplayNamePreference.FIRST_LAST_INITIAL))
            .isEqualTo("Sarah J.");
    }

    @Test
    void firstLastReturnsFullName() {
        assertThat(DisplayNameResolver.resolve("Sarah", "Johnson", null, DisplayNamePreference.FIRST_LAST))
            .isEqualTo("Sarah Johnson");
    }

    @Test
    void customWithValueReturnsCustom() {
        assertThat(DisplayNameResolver.resolve("Sarah", "Johnson", "Sari", DisplayNamePreference.CUSTOM))
            .isEqualTo("Sari");
    }

    @Test
    void customWithNullFallsBackToFirstName() {
        assertThat(DisplayNameResolver.resolve("Sarah", "Johnson", null, DisplayNamePreference.CUSTOM))
            .isEqualTo("Sarah");
    }
}
