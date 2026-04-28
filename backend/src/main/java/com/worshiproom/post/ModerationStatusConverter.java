package com.worshiproom.post;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class ModerationStatusConverter implements AttributeConverter<ModerationStatus, String> {

    @Override
    public String convertToDatabaseColumn(ModerationStatus attribute) {
        return attribute == null ? null : attribute.value();
    }

    @Override
    public ModerationStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : ModerationStatus.fromValue(dbData);
    }
}
