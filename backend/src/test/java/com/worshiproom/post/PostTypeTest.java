package com.worshiproom.post;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;

class PostTypeTest {

    @Test
    void isValid_returnsTrue_forEachValidValue() {
        assertThat(PostType.isValid("prayer_request")).isTrue();
        assertThat(PostType.isValid("testimony")).isTrue();
        assertThat(PostType.isValid("question")).isTrue();
        assertThat(PostType.isValid("discussion")).isTrue();
        assertThat(PostType.isValid("encouragement")).isTrue();
    }

    @Test
    void isValid_returnsFalse_forUnknownStrings() {
        assertThat(PostType.isValid("")).isFalse();
        assertThat(PostType.isValid("PRAYER_REQUEST")).isFalse();
        assertThat(PostType.isValid("prayer")).isFalse();
        assertThat(PostType.isValid("comment")).isFalse();
    }

    @Test
    void isValid_returnsFalse_forNull() {
        assertThat(PostType.isValid(null)).isFalse();
    }
}
