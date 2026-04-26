package com.worshiproom.activity;

import com.worshiproom.activity.constants.BadgeCatalog;
import com.worshiproom.activity.constants.BadgeThresholds;
import com.worshiproom.activity.constants.BibleBooks;
import com.worshiproom.activity.dto.BadgeDefinition;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BadgeCatalogTest {

    private static final Set<String> VALID_CATEGORIES = Set.of(
        "streak", "level", "activity", "community", "special", "challenge",
        "meditation", "prayer-wall", "bible", "gratitude", "local-support", "listening"
    );

    @Nested
    @DisplayName("BadgeCatalog — size and shape")
    class SizeAndShape {

        @Test
        void catalog_hasExactly58Badges() {
            assertThat(BadgeCatalog.all()).hasSize(58);
        }

        @Test
        void everyBadge_hasNonNullCelebrationTier() {
            BadgeCatalog.all().values().forEach(b ->
                assertThat(b.celebrationTier())
                    .as("Badge %s missing celebrationTier", b.id())
                    .isNotNull()
            );
        }

        @Test
        void everyBadge_hasOneOfTwelveValidCategories() {
            BadgeCatalog.all().values().forEach(b ->
                assertThat(VALID_CATEGORIES)
                    .as("Badge %s has invalid category %s", b.id(), b.category())
                    .contains(b.category())
            );
        }

        @Test
        void exactlyOneBadge_isRepeatable() {
            long count = BadgeCatalog.all().values().stream().filter(BadgeDefinition::repeatable).count();
            assertThat(count).isEqualTo(1L);
        }

        @Test
        void fullWorshipDay_isTheRepeatableBadge() {
            assertThat(BadgeCatalog.lookup("full_worship_day").orElseThrow().repeatable()).isTrue();
        }

        @Test
        void exactlyNineBadges_haveVerses() {
            long count = BadgeCatalog.all().values().stream().filter(b -> b.verse().isPresent()).count();
            assertThat(count).isEqualTo(9L);
        }

        @Test
        void verseBadgeIds_areExactlyTheExpectedNine() {
            Set<String> withVerse = BadgeCatalog.all().values().stream()
                .filter(b -> b.verse().isPresent())
                .map(BadgeDefinition::id)
                .collect(Collectors.toUnmodifiableSet());
            assertThat(withVerse).containsExactlyInAnyOrder(
                "level_1", "level_2", "level_3", "level_4", "level_5", "level_6",
                "plans_10", "bible_book_10", "bible_book_66"
            );
        }
    }

    @Nested
    @DisplayName("BadgeCatalog — lookup behavior")
    class LookupBehavior {

        @Test
        void lookup_knownId_returnsPresent() {
            assertThat(BadgeCatalog.lookup("streak_7")).isPresent();
        }

        @Test
        void lookup_unknownId_returnsEmpty() {
            assertThat(BadgeCatalog.lookup("does_not_exist")).isEmpty();
        }

        @Test
        void lookup_null_returnsEmpty() {
            assertThat(BadgeCatalog.lookup(null)).isEmpty();
        }

        @Test
        void all_returnsImmutableMap() {
            assertThatThrownBy(() -> BadgeCatalog.all().put("foo", null))
                .isInstanceOf(UnsupportedOperationException.class);
        }

        @Test
        void level1_hasExpectedVerseReference() {
            BadgeDefinition def = BadgeCatalog.lookup("level_1").orElseThrow();
            assertThat(def.verse()).isPresent();
            assertThat(def.verse().get().reference()).isEqualTo("Ephesians 2:10");
        }

        @Test
        void plans10_hasWebSuffixInReference() {
            BadgeDefinition def = BadgeCatalog.lookup("plans_10").orElseThrow();
            assertThat(def.verse()).isPresent();
            assertThat(def.verse().get().reference()).isEqualTo("Psalm 119:105 WEB");
        }

        @Test
        void firstPrayerwall_hasActivityCategoryNotCommunity() {
            BadgeDefinition def = BadgeCatalog.lookup("first_prayerwall").orElseThrow();
            assertThat(def.category()).isEqualTo("activity");
        }
    }

    @Nested
    @DisplayName("BadgeCatalog — Divergence 2 verification")
    class DivergenceTwo {

        @Test
        void welcomeBadge_isInCatalog() {
            assertThat(BadgeCatalog.lookup("welcome")).isPresent();
        }

        @Test
        void allSevenChallengeBadges_areInCatalog() {
            assertThat(BadgeCatalog.lookup("challenge_lent")).isPresent();
            assertThat(BadgeCatalog.lookup("challenge_easter")).isPresent();
            assertThat(BadgeCatalog.lookup("challenge_pentecost")).isPresent();
            assertThat(BadgeCatalog.lookup("challenge_advent")).isPresent();
            assertThat(BadgeCatalog.lookup("challenge_newyear")).isPresent();
            assertThat(BadgeCatalog.lookup("challenge_first")).isPresent();
            assertThat(BadgeCatalog.lookup("challenge_master")).isPresent();
        }
    }

    @Nested
    @DisplayName("BibleBooks catalog sanity")
    class BibleBooksSanity {

        @Test
        void allBooks_count66() {
            assertThat(BibleBooks.ALL).hasSize(66);
        }

        @Test
        void totalChapters_equals1189() {
            int total = BibleBooks.ALL.stream().mapToInt(BibleBooks.Book::chapters).sum();
            assertThat(total).isEqualTo(1189);
        }

        @Test
        void firstBook_isGenesisWith50Chapters() {
            BibleBooks.Book first = BibleBooks.ALL.get(0);
            assertThat(first.slug()).isEqualTo("genesis");
            assertThat(first.chapters()).isEqualTo(50);
        }

        @Test
        void lastBook_isRevelationWith22Chapters() {
            BibleBooks.Book last = BibleBooks.ALL.get(65);
            assertThat(last.slug()).isEqualTo("revelation");
            assertThat(last.chapters()).isEqualTo(22);
        }
    }

    @Nested
    @DisplayName("BadgeThresholds sanity")
    class BadgeThresholdsSanity {

        @Test
        void streakThresholds_areExactSevenValues() {
            assertThat(BadgeThresholds.STREAK).containsExactly(7, 14, 30, 60, 90, 180, 365);
        }

        @Test
        void listen10HoursSeconds_equals36000() {
            assertThat(BadgeThresholds.LISTEN_10_HOURS_SECONDS).isEqualTo(36000);
        }

        @Test
        void activityMilestones_hasFiveActivityKeys() {
            assertThat(BadgeThresholds.ACTIVITY_MILESTONES).hasSize(5);
        }
    }
}
