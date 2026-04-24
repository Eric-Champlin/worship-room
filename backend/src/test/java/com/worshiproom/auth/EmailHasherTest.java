package com.worshiproom.auth;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EmailHasherTest {

    @Test
    void hashHasEmailPrefixAndSixteenHexChars() {
        String hashed = EmailHasher.hash("sarah@example.com");
        assertThat(hashed).startsWith("email_");
        assertThat(hashed).hasSize("email_".length() + 16);
        assertThat(hashed.substring("email_".length())).matches("[0-9a-f]{16}");
    }

    @Test
    void hashIsCaseInsensitive() {
        assertThat(EmailHasher.hash("Sarah@Example.com"))
            .isEqualTo(EmailHasher.hash("sarah@example.com"));
    }

    @Test
    void hashTrimsWhitespace() {
        assertThat(EmailHasher.hash("  sarah@example.com  "))
            .isEqualTo(EmailHasher.hash("sarah@example.com"));
    }

    @Test
    void differentEmailsProduceDifferentHashes() {
        assertThat(EmailHasher.hash("a@example.com"))
            .isNotEqualTo(EmailHasher.hash("b@example.com"));
    }

    @Test
    void nullEmailReturnsSentinel() {
        assertThat(EmailHasher.hash(null)).isEqualTo("email_null");
    }
}
