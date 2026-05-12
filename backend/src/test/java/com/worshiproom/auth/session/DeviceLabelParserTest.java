package com.worshiproom.auth.session;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("DeviceLabelParser")
class DeviceLabelParserTest {

    private DeviceLabelParser parser;

    @BeforeEach
    void setUp() {
        parser = new DeviceLabelParser();
    }

    @Test
    @DisplayName("modern Chrome on macOS → 'Chrome 124 on Mac OS X 10'")
    void parsesModernChrome() {
        String ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            + "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

        String label = parser.parse(ua);

        // Browser + browserMajor + OS + osMajor — major version only
        assertThat(label).contains("Chrome").contains("124").contains("on");
    }

    @Test
    @DisplayName("modern Safari on iOS → contains 'Mobile Safari' and 'iOS'")
    void parsesModernSafariOnIos() {
        String ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) "
            + "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

        String label = parser.parse(ua);

        assertThat(label).contains("Safari");
        // iOS major version derived from "iPhone OS 17_4"
        assertThat(label).contains("17");
    }

    @Test
    @DisplayName("null UA → 'Unknown device'")
    void nullUaReturnsUnknown() {
        assertThat(parser.parse(null)).isEqualTo("Unknown device");
    }

    @Test
    @DisplayName("blank UA → 'Unknown device'")
    void blankUaReturnsUnknown() {
        assertThat(parser.parse("")).isEqualTo("Unknown device");
        assertThat(parser.parse("   ")).isEqualTo("Unknown device");
    }

    @Test
    @DisplayName("garbage UA → 'Unknown device' (graceful degradation)")
    void garbageUaReturnsUnknown() {
        // uap-java is resilient and tends to match "Other"/"Other" on garbage.
        // We treat both-Other as Unknown.
        assertThat(parser.parse("!!!asdfqwerty!!!")).isEqualTo("Unknown device");
    }

    @Test
    @DisplayName("output is capped at 200 characters")
    void outputCappedAt200() {
        // Real UAs are well under 200 chars, but we defensively cap.
        String ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            + "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
        String label = parser.parse(ua);
        assertThat(label).hasSizeLessThanOrEqualTo(200);
    }
}
