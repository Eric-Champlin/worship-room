package com.worshiproom.friends;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class FriendRequestStatusConverter
        implements AttributeConverter<FriendRequestStatus, String> {

    @Override
    public String convertToDatabaseColumn(FriendRequestStatus attribute) {
        return attribute == null ? null : attribute.value();
    }

    @Override
    public FriendRequestStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : FriendRequestStatus.fromValue(dbData);
    }
}
