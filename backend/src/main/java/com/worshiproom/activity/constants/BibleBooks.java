package com.worshiproom.activity.constants;

import java.util.List;

/**
 * The 66-book Bible catalog. Verbatim port of
 * {@code frontend/src/constants/bible.ts BIBLE_BOOKS} — slug and chapter
 * count only. Other frontend fields (name, testament, category, hasFullText)
 * are not used by {@link com.worshiproom.activity.BadgeService} so they're
 * dropped from this port.
 *
 * <p>Used by Bible-book-completion eligibility (category 8 in Spec 2.4
 * recon B). A book is "completed" when the user has read &gt;= {@code chapters}
 * unique chapter numbers from that book (per
 * {@code BibleProgressSnapshot.chaptersByBook}).
 */
public final class BibleBooks {

    public record Book(String slug, int chapters) {}

    public static final List<Book> ALL = List.of(
        // === OLD TESTAMENT (39 books) ===
        // Pentateuch (5)
        new Book("genesis", 50),
        new Book("exodus", 40),
        new Book("leviticus", 27),
        new Book("numbers", 36),
        new Book("deuteronomy", 34),
        // Historical (12)
        new Book("joshua", 24),
        new Book("judges", 21),
        new Book("ruth", 4),
        new Book("1-samuel", 31),
        new Book("2-samuel", 24),
        new Book("1-kings", 22),
        new Book("2-kings", 25),
        new Book("1-chronicles", 29),
        new Book("2-chronicles", 36),
        new Book("ezra", 10),
        new Book("nehemiah", 13),
        new Book("esther", 10),
        // Wisdom & Poetry (5)
        new Book("job", 42),
        new Book("psalms", 150),
        new Book("proverbs", 31),
        new Book("ecclesiastes", 12),
        new Book("song-of-solomon", 8),
        // Major Prophets (5)
        new Book("isaiah", 66),
        new Book("jeremiah", 52),
        new Book("lamentations", 5),
        new Book("ezekiel", 48),
        new Book("daniel", 12),
        // Minor Prophets (12)
        new Book("hosea", 14),
        new Book("joel", 3),
        new Book("amos", 9),
        new Book("obadiah", 1),
        new Book("jonah", 4),
        new Book("micah", 7),
        new Book("nahum", 3),
        new Book("habakkuk", 3),
        new Book("zephaniah", 3),
        new Book("haggai", 2),
        new Book("zechariah", 14),
        new Book("malachi", 4),
        // === NEW TESTAMENT (27 books) ===
        // Gospels (4)
        new Book("matthew", 28),
        new Book("mark", 16),
        new Book("luke", 24),
        new Book("john", 21),
        // History (1)
        new Book("acts", 28),
        // Pauline Epistles (13)
        new Book("romans", 16),
        new Book("1-corinthians", 16),
        new Book("2-corinthians", 13),
        new Book("galatians", 6),
        new Book("ephesians", 6),
        new Book("philippians", 4),
        new Book("colossians", 4),
        new Book("1-thessalonians", 5),
        new Book("2-thessalonians", 3),
        new Book("1-timothy", 6),
        new Book("2-timothy", 4),
        new Book("titus", 3),
        new Book("philemon", 1),
        // General Epistles (8)
        new Book("hebrews", 13),
        new Book("james", 5),
        new Book("1-peter", 5),
        new Book("2-peter", 3),
        new Book("1-john", 5),
        new Book("2-john", 1),
        new Book("3-john", 1),
        new Book("jude", 1),
        // Prophecy (1)
        new Book("revelation", 22)
    );

    private BibleBooks() {}
}
