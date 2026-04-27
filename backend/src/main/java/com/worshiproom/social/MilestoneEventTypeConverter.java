package com.worshiproom.social;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class MilestoneEventTypeConverter
        implements AttributeConverter<MilestoneEventType, String> {

    @Override
    public String convertToDatabaseColumn(MilestoneEventType attribute) {
        return attribute == null ? null : attribute.value();
    }

    @Override
    public MilestoneEventType convertToEntityAttribute(String dbData) {
        return dbData == null ? null : MilestoneEventType.fromValue(dbData);
    }
}
