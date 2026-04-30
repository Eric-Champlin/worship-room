package com.worshiproom.post.report;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * JPA converter for {@link ReportStatus}. Persists as lowercase in the
 * {@code post_reports.status} column to match the
 * {@code post_reports_status_check} CHECK constraint values.
 */
@Converter(autoApply = false)
public class ReportStatusConverter implements AttributeConverter<ReportStatus, String> {

    @Override
    public String convertToDatabaseColumn(ReportStatus attribute) {
        return attribute == null ? null : attribute.name().toLowerCase();
    }

    @Override
    public ReportStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : ReportStatus.valueOf(dbData.toUpperCase());
    }
}
