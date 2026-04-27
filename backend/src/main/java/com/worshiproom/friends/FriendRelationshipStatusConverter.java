package com.worshiproom.friends;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class FriendRelationshipStatusConverter
        implements AttributeConverter<FriendRelationshipStatus, String> {

    @Override
    public String convertToDatabaseColumn(FriendRelationshipStatus attribute) {
        return attribute == null ? null : attribute.value();
    }

    @Override
    public FriendRelationshipStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : FriendRelationshipStatus.fromValue(dbData);
    }
}
