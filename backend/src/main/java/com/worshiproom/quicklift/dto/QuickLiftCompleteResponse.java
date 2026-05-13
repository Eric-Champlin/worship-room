package com.worshiproom.quicklift.dto;

import com.worshiproom.activity.dto.NewBadge;

import java.util.List;

public record QuickLiftCompleteResponse(
    boolean activityRecorded,
    int pointsAwarded,
    List<NewBadge> badgesUnlocked
) {}
