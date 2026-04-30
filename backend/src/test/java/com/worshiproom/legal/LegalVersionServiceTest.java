package com.worshiproom.legal;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LegalVersionServiceTest {

    private final LegalVersionService service = new LegalVersionService();

    @Test
    void constantsAreNonNull() {
        assertThat(LegalVersionService.TERMS_VERSION).isNotNull().isNotBlank();
        assertThat(LegalVersionService.PRIVACY_VERSION).isNotNull().isNotBlank();
        assertThat(LegalVersionService.COMMUNITY_GUIDELINES_VERSION).isNotNull().isNotBlank();
    }

    @Test
    void isTermsVersionCurrentAcceptsExactMatch() {
        assertThat(service.isTermsVersionCurrent(LegalVersionService.TERMS_VERSION)).isTrue();
    }

    @Test
    void isTermsVersionCurrentRejectsOlder() {
        assertThat(service.isTermsVersionCurrent("2026-04-28")).isFalse();
    }

    @Test
    void isTermsVersionCurrentRejectsFuture() {
        assertThat(service.isTermsVersionCurrent("2027-01-01")).isFalse();
    }

    @Test
    void isTermsVersionCurrentRejectsNull() {
        assertThat(service.isTermsVersionCurrent(null)).isFalse();
    }
}
