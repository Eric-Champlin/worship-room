package com.worshiproom.activity;

import com.worshiproom.activity.constants.PointValues;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PointValuesTest {

    @Test
    void quickLiftIsTwentyPoints() {
        assertThat(PointValues.POINTS.get(ActivityType.QUICK_LIFT)).isEqualTo(20);
    }
}
