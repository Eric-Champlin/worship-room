package com.worshiproom.post;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class PostTypeConverter implements AttributeConverter<PostType, String> {

    @Override
    public String convertToDatabaseColumn(PostType attribute) {
        return attribute == null ? null : attribute.value();
    }

    @Override
    public PostType convertToEntityAttribute(String dbData) {
        return dbData == null ? null : PostType.fromValue(dbData);
    }
}
