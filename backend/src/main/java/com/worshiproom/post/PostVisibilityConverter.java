package com.worshiproom.post;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class PostVisibilityConverter implements AttributeConverter<PostVisibility, String> {

    @Override
    public String convertToDatabaseColumn(PostVisibility attribute) {
        return attribute == null ? null : attribute.value();
    }

    @Override
    public PostVisibility convertToEntityAttribute(String dbData) {
        return dbData == null ? null : PostVisibility.fromValue(dbData);
    }
}
