package com.worshiproom.post;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class HelpTagTest {

    @Test
    void fromWireValue_meals_returnsMeals() {
        assertThat(HelpTag.fromWireValue("meals")).isEqualTo(HelpTag.MEALS);
    }

    @Test
    void fromWireValue_uppercaseJustPrayer_throws_caseSensitive() {
        assertThrows(InvalidHelpTagException.class,
                () -> HelpTag.fromWireValue("JUST_PRAYER"));
    }

    @Test
    void fromWireValue_unknownValue_throws() {
        InvalidHelpTagException ex = assertThrows(InvalidHelpTagException.class,
                () -> HelpTag.fromWireValue("pizza"));
        assertThat(ex.getInvalidValue()).isEqualTo("pizza");
    }

    @Test
    void fromWireValue_null_throws() {
        assertThrows(InvalidHelpTagException.class,
                () -> HelpTag.fromWireValue(null));
    }

    @Test
    void fromWireValue_empty_throws() {
        assertThrows(InvalidHelpTagException.class,
                () -> HelpTag.fromWireValue(""));
    }
}
