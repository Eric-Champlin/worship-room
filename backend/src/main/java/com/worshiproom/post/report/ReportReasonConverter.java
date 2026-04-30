package com.worshiproom.post.report;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * JPA converter for {@link ReportReason}. Persists as lowercase in the
 * {@code post_reports.reason} column to match the OpenAPI wire format.
 *
 * <p>Read path is case-insensitive as a defensive measure for any legacy
 * mixed-case rows that may exist.
 */
@Converter(autoApply = false)
public class ReportReasonConverter implements AttributeConverter<ReportReason, String> {

    @Override
    public String convertToDatabaseColumn(ReportReason attribute) {
        return attribute == null ? null : attribute.name().toLowerCase();
    }

    @Override
    public ReportReason convertToEntityAttribute(String dbData) {
        return dbData == null ? null : ReportReason.valueOf(dbData.toUpperCase());
    }
}
