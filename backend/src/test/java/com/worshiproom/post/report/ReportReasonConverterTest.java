package com.worshiproom.post.report;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Spec 3.8 — unit tests for {@link ReportReasonConverter}.
 * Verifies enum &harr; lowercase-string mapping and case-insensitive read.
 */
class ReportReasonConverterTest {

    private final ReportReasonConverter converter = new ReportReasonConverter();

    @Test
    void convertToDatabaseColumn_mapsEnumToLowercaseString() {
        assertThat(converter.convertToDatabaseColumn(ReportReason.SPAM)).isEqualTo("spam");
        assertThat(converter.convertToDatabaseColumn(ReportReason.HARASSMENT)).isEqualTo("harassment");
        assertThat(converter.convertToDatabaseColumn(ReportReason.HATE)).isEqualTo("hate");
        assertThat(converter.convertToDatabaseColumn(ReportReason.SELF_HARM)).isEqualTo("self_harm");
        assertThat(converter.convertToDatabaseColumn(ReportReason.SEXUAL)).isEqualTo("sexual");
        assertThat(converter.convertToDatabaseColumn(ReportReason.OTHER)).isEqualTo("other");
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
    }

    @Test
    void convertToEntityAttribute_isCaseInsensitive() {
        assertThat(converter.convertToEntityAttribute("spam")).isEqualTo(ReportReason.SPAM);
        assertThat(converter.convertToEntityAttribute("SPAM")).isEqualTo(ReportReason.SPAM);
        assertThat(converter.convertToEntityAttribute("Self_Harm")).isEqualTo(ReportReason.SELF_HARM);
        assertThat(converter.convertToEntityAttribute(null)).isNull();
    }
}
