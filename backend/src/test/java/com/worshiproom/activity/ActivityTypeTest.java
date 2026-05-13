package com.worshiproom.activity;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ActivityTypeTest {

    @Test
    void quickLiftWireValueIsCamelCase() {
        assertThat(ActivityType.QUICK_LIFT.wireValue()).isEqualTo("quickLift");
    }

    @Test
    void fromWireValueQuickLift() {
        assertThat(ActivityType.fromWireValue("quickLift")).isEqualTo(ActivityType.QUICK_LIFT);
    }
}
