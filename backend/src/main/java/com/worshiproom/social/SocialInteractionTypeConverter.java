package com.worshiproom.social;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class SocialInteractionTypeConverter
        implements AttributeConverter<SocialInteractionType, String> {

    @Override
    public String convertToDatabaseColumn(SocialInteractionType attribute) {
        return attribute == null ? null : attribute.value();
    }

    @Override
    public SocialInteractionType convertToEntityAttribute(String dbData) {
        return dbData == null ? null : SocialInteractionType.fromValue(dbData);
    }
}
