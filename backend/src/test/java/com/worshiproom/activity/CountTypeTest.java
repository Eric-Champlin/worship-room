package com.worshiproom.activity;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class CountTypeTest {

    @ParameterizedTest
    @EnumSource(CountType.class)
    void everyCountType_hasNonNullWireValue(CountType type) {
        assertThat(type.wireValue()).isNotNull().isNotBlank();
    }

    @ParameterizedTest
    @CsvSource({
        "pray, PRAY",
        "journal, JOURNAL",
        "meditate, MEDITATE",
        "listen, LISTEN",
        "prayerWall, PRAYER_WALL",
        "readingPlan, READING_PLAN",
        "gratitude, GRATITUDE",
        "reflection, REFLECTION",
        "encouragementsSent, ENCOURAGEMENTS_SENT",
        "fullWorshipDays, FULL_WORSHIP_DAYS",
        "challengesCompleted, CHALLENGES_COMPLETED",
        "intercessionCount, INTERCESSION_COUNT",
        "bibleChaptersRead, BIBLE_CHAPTERS_READ",
        "prayerWallPosts, PRAYER_WALL_POSTS"
    })
    void fromWireValue_resolvesAllFourteenWireStrings(String wire, CountType expected) {
        assertThat(CountType.fromWireValue(wire)).contains(expected);
    }

    @Test
    void fromWireValue_returnsEmptyForUnknownString() {
        assertThat(CountType.fromWireValue("nonexistent")).isEmpty();
    }

    @Test
    void fromWireValue_returnsEmptyForNullInput() {
        assertThat(CountType.fromWireValue(null)).isEmpty();
    }

    @ParameterizedTest
    @EnumSource(CountType.class)
    void roundTrip_wireValueResolvesBackToSameEnum(CountType type) {
        Optional<CountType> resolved = CountType.fromWireValue(type.wireValue());
        assertThat(resolved).contains(type);
    }

    @Test
    void jacksonSerialization_emitsWireString() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        assertThat(mapper.writeValueAsString(CountType.PRAYER_WALL)).isEqualTo("\"prayerWall\"");
        assertThat(mapper.writeValueAsString(CountType.PRAY)).isEqualTo("\"pray\"");
        assertThat(mapper.writeValueAsString(CountType.PRAYER_WALL_POSTS)).isEqualTo("\"prayerWallPosts\"");
    }

    @Test
    void enumHasExactly14Values() {
        assertThat(CountType.values()).hasSize(14);
    }
}
