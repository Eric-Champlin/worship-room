package com.worshiproom.activity.constants;

import com.worshiproom.activity.CelebrationTier;
import com.worshiproom.activity.dto.BadgeDefinition;
import com.worshiproom.activity.dto.BadgeVerse;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Catalog of all 58 badges. Verbatim port of
 * {@code frontend/src/constants/dashboard/badges.ts BADGE_DEFINITIONS}.
 *
 * <p>Includes welcome and challenge badges for metadata lookup, even
 * though they aren't returned by
 * {@link com.worshiproom.activity.BadgeService#checkBadges} (per Spec 2.4
 * Divergence 2 — they're granted by other code paths).
 */
public final class BadgeCatalog {

    private static final Map<String, BadgeDefinition> CATALOG = buildCatalog();

    private static Map<String, BadgeDefinition> buildCatalog() {
        LinkedHashMap<String, BadgeDefinition> m = new LinkedHashMap<>();

        // --- Streak badges (7) ---
        addStreak(m, 7,   "First Flame",        "Maintained a 7-day streak",   CelebrationTier.TOAST);
        addStreak(m, 14,  "Steady Flame",       "Maintained a 14-day streak",  CelebrationTier.TOAST);
        addStreak(m, 30,  "Burning Bright",     "Maintained a 30-day streak",  CelebrationTier.TOAST);
        addStreak(m, 60,  "Unwavering",         "Maintained a 60-day streak",  CelebrationTier.FULL_SCREEN);
        addStreak(m, 90,  "Faithful",           "Maintained a 90-day streak",  CelebrationTier.FULL_SCREEN);
        addStreak(m, 180, "Half-Year Warrior",  "Maintained a 180-day streak", CelebrationTier.FULL_SCREEN);
        addStreak(m, 365, "Year of Faith",      "Maintained a 365-day streak", CelebrationTier.FULL_SCREEN);

        // --- Level badges (6) — all FULL_SCREEN, all with verse ---
        addLevel(m, 1, "Seedling",     "Reached Level 1",
            "For we are his workmanship, created in Christ Jesus for good works.", "Ephesians 2:10");
        addLevel(m, 2, "Sprout",       "Reached Level 2",
            "I planted, Apollos watered, but God gave the increase.", "1 Corinthians 3:6");
        addLevel(m, 3, "Blooming",     "Reached Level 3",
            "The righteous shall flourish like the palm tree. He will grow like a cedar in Lebanon.", "Psalm 92:12");
        addLevel(m, 4, "Flourishing",  "Reached Level 4",
            "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith.", "Galatians 5:22");
        addLevel(m, 5, "Oak",          "Reached Level 5",
            "He will be like a tree planted by the streams of water, that produces its fruit in its season.", "Psalm 1:3");
        addLevel(m, 6, "Lighthouse",   "Reached Level 6",
            "You are the light of the world. A city located on a hill can't be hidden.", "Matthew 5:14");

        // --- Activity-milestone badges (9) ---
        put(m, "first_prayer",  "First Prayer",      "1st prayer generated",     "activity", CelebrationTier.TOAST,           false, null);
        put(m, "prayer_100",    "Prayer Warrior",    "100th prayer",             "activity", CelebrationTier.TOAST_CONFETTI,  false, null);
        put(m, "first_journal", "First Entry",       "1st journal entry saved",  "activity", CelebrationTier.TOAST,           false, null);
        put(m, "journal_50",    "Faithful Scribe",   "50th journal entry",       "activity", CelebrationTier.TOAST_CONFETTI,  false, null);
        put(m, "journal_100",   "Devoted Writer",    "100th journal entry",      "activity", CelebrationTier.TOAST_CONFETTI,  false, null);
        put(m, "first_meditate","First Meditation",  "1st meditation completed", "activity", CelebrationTier.TOAST,           false, null);
        put(m, "meditate_25",   "Mindful",           "25th meditation",          "activity", CelebrationTier.TOAST_CONFETTI,  false, null);
        put(m, "first_listen",  "First Listen",      "1st audio session",        "activity", CelebrationTier.TOAST,           false, null);
        put(m, "listen_50",     "Worship in Song",   "50th listen session",      "activity", CelebrationTier.TOAST_CONFETTI,  false, null);

        // --- Reading-plan badges (3) — note frontend declares these BEFORE bible-book and BEFORE community in BADGE_DEFINITIONS ---
        put(m, "first_plan", "First Plan",        "Completed your first reading plan",   "activity", CelebrationTier.TOAST_CONFETTI, false, null);
        put(m, "plans_3",    "Dedicated Reader",  "Completed 3 reading plans",            "activity", CelebrationTier.TOAST_CONFETTI, false, null);
        put(m, "plans_10",   "Scripture Scholar", "Completed all 10 reading plans",       "activity", CelebrationTier.FULL_SCREEN,    false,
            new BadgeVerse("Your word is a lamp to my feet, and a light for my path.", "Psalm 119:105 WEB"));

        // --- Bible-book badges (4) ---
        put(m, "bible_book_1",  "First Book",      "Read every chapter of a Bible book", "activity", CelebrationTier.TOAST_CONFETTI, false, null);
        put(m, "bible_book_5",  "Bible Explorer",  "Completed 5 Bible books",            "activity", CelebrationTier.TOAST_CONFETTI, false, null);
        put(m, "bible_book_10", "Deep Reader",     "Completed 10 Bible books",            "activity", CelebrationTier.FULL_SCREEN,    false,
            new BadgeVerse("Your word is a lamp to my feet, and a light for my path.", "Psalm 119:105 WEB"));
        put(m, "bible_book_66", "Bible Master",    "Read the entire Bible — all 66 books", "activity", CelebrationTier.FULL_SCREEN, false,
            new BadgeVerse(
                "Every Scripture is God-breathed and profitable for teaching, for reproof, for correction, and for instruction in righteousness.",
                "2 Timothy 3:16 WEB"));

        // --- Full Worship Day (1) — REPEATABLE ---
        put(m, "full_worship_day", "Full Worship Day", "All daily activities completed in a single day",
            "special", CelebrationTier.SPECIAL_TOAST, true, null);

        // --- Community badges (6) — note first_prayerwall has category "activity", not "community" ---
        put(m, "first_prayerwall", "First Prayer Wall", "1st prayer wall post or reaction", "activity",  CelebrationTier.TOAST,           false, null);
        put(m, "first_friend",     "First Friend",      "1st mutual friend added",          "community", CelebrationTier.TOAST,           false, null);
        put(m, "friends_10",       "Inner Circle",      "10 mutual friends",                "community", CelebrationTier.TOAST_CONFETTI,  false, null);
        put(m, "encourage_10",     "Encourager",        "10 encouragements sent",           "community", CelebrationTier.TOAST,           false, null);
        put(m, "encourage_50",     "Cheerleader",       "50 encouragements sent",           "community", CelebrationTier.TOAST_CONFETTI,  false, null);
        put(m, "local_support_5",  "Local Support Seeker",
            "You've visited 5 local support locations. Your faith is lived, not just digital.",
            "community", CelebrationTier.TOAST_CONFETTI, false, null);

        // --- Challenge badges (7) — IN catalog for metadata, NOT in checkBadges ---
        put(m, "challenge_lent",      "Lenten Warrior",     "Completed the Lenten Journey challenge",  "challenge", CelebrationTier.FULL_SCREEN,    false, null);
        put(m, "challenge_easter",    "Easter Champion",    "Completed the Easter Joy challenge",      "challenge", CelebrationTier.FULL_SCREEN,    false, null);
        put(m, "challenge_pentecost", "Spirit-Filled",      "Completed the Pentecost challenge",       "challenge", CelebrationTier.FULL_SCREEN,    false, null);
        put(m, "challenge_advent",    "Advent Faithful",    "Completed the Advent challenge",          "challenge", CelebrationTier.FULL_SCREEN,    false, null);
        put(m, "challenge_newyear",   "New Year Renewed",   "Completed the New Year challenge",        "challenge", CelebrationTier.FULL_SCREEN,    false, null);
        put(m, "challenge_first",     "Challenge Accepted", "Completed your first community challenge","challenge", CelebrationTier.TOAST_CONFETTI, false, null);
        put(m, "challenge_master",    "Challenge Master",   "Completed all 5 community challenges",    "challenge", CelebrationTier.FULL_SCREEN,    false, null);

        // --- Meditation milestones (3) ---
        put(m, "meditate_10",  "Peaceful Beginner",   "10 sessions of stillness. Your mind is learning to rest in God.",
            "meditation", CelebrationTier.TOAST_CONFETTI, false, null);
        put(m, "meditate_50",  "Contemplative Heart", "50 moments of meditation. God meets you in the silence.",
            "meditation", CelebrationTier.SPECIAL_TOAST, false, null);
        put(m, "meditate_100", "Master of Stillness", "100 meditations. You've built a practice that will carry you for a lifetime.",
            "meditation", CelebrationTier.FULL_SCREEN, false, null);

        // --- Prayer-wall milestones (3) ---
        put(m, "prayerwall_first_post",        "First Prayer Shared", "You shared your heart with the community. That takes courage.",
            "prayer-wall", CelebrationTier.TOAST_CONFETTI, false, null);
        put(m, "prayerwall_10_posts",          "Prayer Warrior",      "You've shared 10 prayers. You're building a community of faith.",
            "prayer-wall", CelebrationTier.TOAST_CONFETTI, false, null);
        put(m, "prayerwall_25_intercessions",  "Intercessor",         "You've lifted 25 people in prayer. Heaven notices.",
            "prayer-wall", CelebrationTier.SPECIAL_TOAST, false, null);

        // --- Bible-reading milestones (3) ---
        put(m, "bible_first_chapter",  "First Chapter",     "Your first chapter! The Word is a lamp to your feet.",
            "bible", CelebrationTier.TOAST, false, null);
        put(m, "bible_10_chapters",    "Bible Explorer",    "10 chapters explored. You're discovering the depth of God's Word.",
            "bible", CelebrationTier.TOAST_CONFETTI, false, null);
        put(m, "bible_25_chapters",    "Scripture Scholar", "25 chapters. You're building a foundation that will never crack.",
            "bible", CelebrationTier.SPECIAL_TOAST, false, null);

        // --- Gratitude milestones (3) ---
        put(m, "gratitude_7_streak",   "Thankful Heart",   "A week of gratitude. Your perspective is shifting.",
            "gratitude", CelebrationTier.TOAST_CONFETTI, false, null);
        put(m, "gratitude_30_days",    "Gratitude Habit",  "30 days of counting blessings. Gratitude is becoming part of who you are.",
            "gratitude", CelebrationTier.TOAST_CONFETTI, false, null);
        put(m, "gratitude_100_days",   "Overflowing Cup",  "100 days of gratitude. Your cup truly overflows.",
            "gratitude", CelebrationTier.FULL_SCREEN, false, null);

        // --- Local support first visit (1) ---
        put(m, "local_first_visit", "Community Seeker", "You took a step into your local community. That matters.",
            "local-support", CelebrationTier.TOAST_CONFETTI, false, null);

        // --- Listening (1) ---
        put(m, "listen_10_hours", "Worship Listener", "10 hours of worship and peace. Music is your companion in faith.",
            "listening", CelebrationTier.TOAST_CONFETTI, false, null);

        // --- Welcome (1) — IN catalog for metadata, NOT in checkBadges ---
        put(m, "welcome", "Welcome to Worship Room", "Joined the Worship Room community",
            "special", CelebrationTier.TOAST, false, null);

        return Collections.unmodifiableMap(m);
    }

    private static void addStreak(Map<String, BadgeDefinition> m, int days, String name, String desc, CelebrationTier tier) {
        put(m, "streak_" + days, name, desc, "streak", tier, false, null);
    }

    private static void addLevel(Map<String, BadgeDefinition> m, int level, String name, String desc,
                                 String verseText, String verseRef) {
        put(m, "level_" + level, name, desc, "level", CelebrationTier.FULL_SCREEN, false,
            new BadgeVerse(verseText, verseRef));
    }

    private static void put(Map<String, BadgeDefinition> m, String id, String name, String desc,
                            String category, CelebrationTier tier, boolean repeatable, BadgeVerse verse) {
        m.put(id, new BadgeDefinition(id, name, desc, category, tier, repeatable,
            verse == null ? Optional.empty() : Optional.of(verse)));
    }

    public static Optional<BadgeDefinition> lookup(String badgeId) {
        if (badgeId == null) return Optional.empty();
        return Optional.ofNullable(CATALOG.get(badgeId));
    }

    public static Map<String, BadgeDefinition> all() {
        return CATALOG;
    }

    private BadgeCatalog() {}
}
