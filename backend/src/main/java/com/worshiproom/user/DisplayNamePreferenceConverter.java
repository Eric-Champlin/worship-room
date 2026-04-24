package com.worshiproom.user;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Converts {@link DisplayNamePreference} enum to/from the lowercase snake_case
 * VARCHAR values enforced by the users.display_name_preference CHECK constraint.
 *
 * Liquibase changeset 2026-04-23-001-create-users-table.xml constrains the column to
 * ('first_only', 'first_last_initial', 'first_last', 'custom'). Default JPA
 * EnumType.STRING would write 'FIRST_ONLY' and fail the CHECK constraint.
 */
@Converter(autoApply = false)
public class DisplayNamePreferenceConverter
        implements AttributeConverter<DisplayNamePreference, String> {

    @Override
    public String convertToDatabaseColumn(DisplayNamePreference attribute) {
        return attribute == null ? null : attribute.dbValue();
    }

    @Override
    public DisplayNamePreference convertToEntityAttribute(String dbData) {
        return DisplayNamePreference.fromDbValue(dbData);
    }
}
