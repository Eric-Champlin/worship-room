package com.worshiproom.post.report;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Spec 3.8 — unit tests for {@link ReportStatusConverter}. Mirrors the shape
 * of {@link ReportReasonConverterTest}: enum &harr; lowercase-string mapping
 * matching the {@code post_reports_status_check} CHECK values, with a
 * case-insensitive read path for defensive symmetry.
 */
class ReportStatusConverterTest {

    private final ReportStatusConverter converter = new ReportStatusConverter();

    @Test
    void convertToDatabaseColumn_mapsEnumToLowercaseString() {
        assertThat(converter.convertToDatabaseColumn(ReportStatus.PENDING)).isEqualTo("pending");
        assertThat(converter.convertToDatabaseColumn(ReportStatus.REVIEWED)).isEqualTo("reviewed");
        assertThat(converter.convertToDatabaseColumn(ReportStatus.DISMISSED)).isEqualTo("dismissed");
        assertThat(converter.convertToDatabaseColumn(ReportStatus.ACTIONED)).isEqualTo("actioned");
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
    }

    @Test
    void convertToEntityAttribute_isCaseInsensitive() {
        assertThat(converter.convertToEntityAttribute("pending")).isEqualTo(ReportStatus.PENDING);
        assertThat(converter.convertToEntityAttribute("PENDING")).isEqualTo(ReportStatus.PENDING);
        assertThat(converter.convertToEntityAttribute("Dismissed")).isEqualTo(ReportStatus.DISMISSED);
        assertThat(converter.convertToEntityAttribute(null)).isNull();
    }
}
