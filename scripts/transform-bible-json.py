#!/usr/bin/env python3
"""
One-shot script: Transform existing Bible JSON files from the flat chapter-array
format in src/data/bible/books/json/ into the nested book-object format expected
by BB-4's loadChapter.ts, written to src/data/bible/web/.

For 5 single-chapter books with incomplete data (Obadiah, Philemon, 2 John,
3 John, Jude), fetches complete verse data from bible-api.com and normalizes
"Yahweh" → "LORD"/"GOD" to match the existing WEB British Edition rendering.
"""

import json
import os
import sys
import urllib.request
import time

# ─── Configuration ───────────────────────────────────────────────────────────

SOURCE_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src', 'data', 'bible', 'books', 'json')
TARGET_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src', 'data', 'bible', 'web')

# Canonical 66-book metadata (slug, display name, testament, expected chapters)
BOOKS = [
    ("genesis", "Genesis", "OT", 50),
    ("exodus", "Exodus", "OT", 40),
    ("leviticus", "Leviticus", "OT", 27),
    ("numbers", "Numbers", "OT", 36),
    ("deuteronomy", "Deuteronomy", "OT", 34),
    ("joshua", "Joshua", "OT", 24),
    ("judges", "Judges", "OT", 21),
    ("ruth", "Ruth", "OT", 4),
    ("1-samuel", "1 Samuel", "OT", 31),
    ("2-samuel", "2 Samuel", "OT", 24),
    ("1-kings", "1 Kings", "OT", 22),
    ("2-kings", "2 Kings", "OT", 25),
    ("1-chronicles", "1 Chronicles", "OT", 29),
    ("2-chronicles", "2 Chronicles", "OT", 36),
    ("ezra", "Ezra", "OT", 10),
    ("nehemiah", "Nehemiah", "OT", 13),
    ("esther", "Esther", "OT", 10),
    ("job", "Job", "OT", 42),
    ("psalms", "Psalms", "OT", 150),
    ("proverbs", "Proverbs", "OT", 31),
    ("ecclesiastes", "Ecclesiastes", "OT", 12),
    ("song-of-solomon", "Song of Solomon", "OT", 8),
    ("isaiah", "Isaiah", "OT", 66),
    ("jeremiah", "Jeremiah", "OT", 52),
    ("lamentations", "Lamentations", "OT", 5),
    ("ezekiel", "Ezekiel", "OT", 48),
    ("daniel", "Daniel", "OT", 12),
    ("hosea", "Hosea", "OT", 14),
    ("joel", "Joel", "OT", 3),
    ("amos", "Amos", "OT", 9),
    ("obadiah", "Obadiah", "OT", 1),
    ("jonah", "Jonah", "OT", 4),
    ("micah", "Micah", "OT", 7),
    ("nahum", "Nahum", "OT", 3),
    ("habakkuk", "Habakkuk", "OT", 3),
    ("zephaniah", "Zephaniah", "OT", 3),
    ("haggai", "Haggai", "OT", 2),
    ("zechariah", "Zechariah", "OT", 14),
    ("malachi", "Malachi", "OT", 4),
    ("matthew", "Matthew", "NT", 28),
    ("mark", "Mark", "NT", 16),
    ("luke", "Luke", "NT", 24),
    ("john", "John", "NT", 21),
    ("acts", "Acts", "NT", 28),
    ("romans", "Romans", "NT", 16),
    ("1-corinthians", "1 Corinthians", "NT", 16),
    ("2-corinthians", "2 Corinthians", "NT", 13),
    ("galatians", "Galatians", "NT", 6),
    ("ephesians", "Ephesians", "NT", 6),
    ("philippians", "Philippians", "NT", 4),
    ("colossians", "Colossians", "NT", 4),
    ("1-thessalonians", "1 Thessalonians", "NT", 5),
    ("2-thessalonians", "2 Thessalonians", "NT", 3),
    ("1-timothy", "1 Timothy", "NT", 6),
    ("2-timothy", "2 Timothy", "NT", 4),
    ("titus", "Titus", "NT", 3),
    ("philemon", "Philemon", "NT", 1),
    ("hebrews", "Hebrews", "NT", 13),
    ("james", "James", "NT", 5),
    ("1-peter", "1 Peter", "NT", 5),
    ("2-peter", "2 Peter", "NT", 3),
    ("1-john", "1 John", "NT", 5),
    ("2-john", "2 John", "NT", 1),
    ("3-john", "3 John", "NT", 1),
    ("jude", "Jude", "NT", 1),
    ("revelation", "Revelation", "NT", 22),
]

# Books with incomplete data — fetched from bible-api.com (WEB translation)
# and saved to /tmp/bible-fetch/ before this script runs.
# Map: slug → expected verse count
INCOMPLETE_BOOKS = {
    "obadiah": 21,
    "philemon": 25,
    "2-john": 13,
    "3-john": 14,
    "jude": 25,
}

# Pre-fetched API responses directory
API_CACHE_DIR = "/tmp/bible-fetch"


def normalize_yahweh(text: str) -> str:
    """
    Normalize the standard WEB "Yahweh" rendering to the WEB British Edition
    "LORD"/"GOD" rendering used by the rest of the existing Bible data.

    Rules:
    - "Lord Yahweh" → "Lord GOD" (Hebrew: Adonai YHWH)
    - "Yahweh" (standalone) → "LORD" (Hebrew: YHWH alone)
    """
    # First: "Lord Yahweh" → "Lord GOD" (must come before standalone replacement)
    text = text.replace("Lord Yahweh", "Lord GOD")
    # Then: remaining standalone "Yahweh" → "LORD"
    text = text.replace("Yahweh", "the LORD")
    # Fix double-article: "the the LORD" → "the LORD"
    text = text.replace("the the LORD", "the LORD")
    # Fix "from the LORD" patterns where original already had "from"
    # Actually the simple replacement works because bible-api uses bare "Yahweh"
    # and context words like "from", "to" are already in the source text
    return text


def clean_verse_text(text: str) -> str:
    """Strip trailing whitespace/newlines from verse text."""
    return text.strip()


def load_api_book(slug: str) -> list:
    """Load pre-fetched API data for a single-chapter book and normalize text."""
    cache_path = os.path.join(API_CACHE_DIR, f"{slug}.json")
    print(f"  Loading pre-fetched data from {cache_path}")

    with open(cache_path) as f:
        data = json.load(f)

    verses = []
    for v in data["verses"]:
        text = clean_verse_text(normalize_yahweh(v["text"]))
        verses.append({"number": v["verse"], "text": text})

    return verses


def transform_existing_book(slug: str, source_data: list) -> list:
    """Transform existing flat chapter array into the chapters format."""
    chapters = []
    for ch_data in source_data:
        verses = []
        for v in ch_data["verses"]:
            text = clean_verse_text(v["text"])
            verses.append({"number": v["number"], "text": text})
        chapters.append({
            "number": ch_data["chapter"],
            "verses": verses,
            "paragraphs": []
        })
    return chapters


def main():
    os.makedirs(TARGET_DIR, exist_ok=True)

    total_chapters = 0
    total_verses = 0
    issues = []

    for slug, name, testament, expected_chapters in BOOKS:
        source_path = os.path.join(SOURCE_DIR, f"{slug}.json")
        target_path = os.path.join(TARGET_DIR, f"{slug}.json")

        if not os.path.exists(source_path):
            issues.append(f"MISSING SOURCE: {source_path}")
            continue

        with open(source_path) as f:
            source_data = json.load(f)

        # Check if this is one of the incomplete books
        if slug in INCOMPLETE_BOOKS:
            print(f"[FILL] {name} ({slug}) — loading complete data from pre-fetched API cache...")
            try:
                api_verses = load_api_book(slug)
                expected_verse_count = INCOMPLETE_BOOKS[slug]
                if len(api_verses) != expected_verse_count:
                    issues.append(f"VERSE COUNT MISMATCH: {slug} expected={expected_verse_count} got={len(api_verses)}")
                chapters = [{
                    "number": 1,
                    "verses": api_verses,
                    "paragraphs": []
                }]
            except Exception as e:
                issues.append(f"LOAD FAILED: {slug}: {e}")
                chapters = transform_existing_book(slug, source_data)
        else:
            print(f"[TRANSFORM] {name} ({slug}) — {len(source_data)} chapters")
            chapters = transform_existing_book(slug, source_data)

        # Validate chapter count
        if len(chapters) != expected_chapters:
            issues.append(f"CHAPTER COUNT: {slug} expected={expected_chapters} actual={len(chapters)}")

        # Build output object
        output = {
            "book": name,
            "slug": slug,
            "testament": testament,
            "chapters": chapters
        }

        # Count totals
        for ch in chapters:
            total_chapters += 1
            total_verses += len(ch["verses"])

        # Write output
        with open(target_path, 'w') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

    # Summary
    print(f"\n{'='*60}")
    print(f"Transform complete!")
    print(f"  Books: {len(BOOKS)}")
    print(f"  Chapters: {total_chapters}")
    print(f"  Verses: {total_verses}")
    print(f"  Output: {TARGET_DIR}")

    if issues:
        print(f"\n⚠️  Issues ({len(issues)}):")
        for issue in issues:
            print(f"  - {issue}")
        sys.exit(1)
    else:
        print(f"\n✅ No issues found!")

    # Report paragraph data status
    print(f"\n📋 Paragraph data: EMPTY (paragraphs: [] for all chapters)")
    print(f"   BB-4 should render verses as continuous text blocks.")
    print(f"   Paragraph data can be added later from USFM source if needed.")


if __name__ == "__main__":
    main()
