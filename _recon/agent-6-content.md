# Agent 6: Content Audit Report

## Content Inventory Summary

Programmatic counts verified against spec targets from CLAUDE.md. Counting scripts saved to `_recon/agent-6-count-scripts.ts`.

| Content Type | Actual | Target | Status |
|---|---|---|---|
| Bible Books (JSON files) | 66 | 66 | PASS |
| Bible Books (BIBLE_BOOKS constant) | 66 | 66 | PASS |
| Devotionals (total) | 50 (30 general + 20 seasonal) | 50 (30+20) | PASS |
| Reading Plans | 10 plans (119 total days) | 10 | PASS |
| Ambient Sounds | 24 | 24 | PASS |
| Scene Presets | 11 | 11 | PASS |
| Scripture Readings | 24 (4 collections x 6) | 24 | PASS |
| Bedtime Stories | 12 | 12 | PASS |
| Verse of the Day | 60 (40 general + 20 seasonal) | 60 | PASS |
| QOTD | 72 (60 general + 12 liturgical) | 72 (60+12) | PASS |
| Community Challenges | 5 (110 total days) | 5 | PASS |
| Guided Prayer Sessions | 8 | 8 | PASS |
| Spotify Playlists | 8 (4 worship + 4 explore) | 7 | PASS (exceeds) |
| Routine Templates | 4 | 3-4 | PASS |

All content sets meet or exceed spec targets. No missing entries.

### Reading Plan Day Breakdown

| Plan | Days | Difficulty |
|---|---|---|
| finding-peace-in-anxiety | 7 | beginner |
| walking-through-grief | 14 | - |
| the-gratitude-reset | 7 | - |
| knowing-who-you-are-in-christ | 21 | - |
| the-path-to-forgiveness | 14 | - |
| learning-to-trust-god | 7 | - |
| hope-when-its-hard | 7 | - |
| healing-from-the-inside-out | 21 | - |
| discovering-your-purpose | 14 | - |
| building-stronger-relationships | 7 | - |

Each plan has fully populated daily content (passage, reflection, prayer, action step). No stub or empty days found.

### Challenge Day Breakdown

| Challenge | Season | Days |
|---|---|---|
| pray40-lenten-journey | Lent | 40 |
| easter-joy-resurrection-hope | Easter | 7 |
| fire-of-pentecost | Pentecost | 21 |
| advent-awaits | Advent | 21 |
| new-year-new-heart | New Year | 21 |

All 110 challenge days have complete content (title, scripture, reflection, daily action, action type).

### Seasonal Devotional Breakdown

| Season | Count |
|---|---|
| Advent | 5 |
| Lent | 5 |
| Easter | 3 |
| Christmas | 3 |
| Holy Week | 2 |
| Pentecost | 2 |
| General (no season) | 30 |

---

## Content Freshness and Staleness Risk

### Daily Rotation Analysis (14-day user)

For a user returning every day for two weeks, here is what rotates versus repeats:

**Content that rotates daily:**

| Content | Pool Size | Cycle Length | Staleness Cliff |
|---|---|---|---|
| Verse of the Day (ordinary time) | 60 | 60 days | Day 61 |
| Verse of the Day (Lent, current season) | 5 | 5 days | **Day 6** |
| QOTD (ordinary time) | 72 | 72 days | Day 73 |
| QOTD (Lent) | 3 Lent-specific, then general pool | 3 days then general | Day 4 switches to general |
| Devotional (general) | 30 general cycle | 30 days | Day 31 |
| Devotional (Lent, current season) | 5 Lent entries | Prioritized during Lent | OK for Lent |
| Song of the Day | 14 unique tracks (in 30 entries) | See below | **Day 2** (explanation below) |
| Journal prompt | 18 | Rotated on mode selection | ~Day 18 |

**Song of the Day -- critical staleness problem.** The DAILY_SONGS array has 30 entries but only 14 unique Spotify track IDs. Songs 15-28 are exact duplicates of songs 1-14, and songs 29-30 duplicate songs 1-2. The rotation formula `(dayOfMonth * 7) % 30` maps into these 30 entries, but because the underlying tracks repeat, a user will hear the same 14 songs every month. Worse, the multiplication-based hash creates a pattern where the same track can appear on adjacent days (e.g., days 1 and 3 both map to track index 7; days 2 and 4 both map to track index 0). Within the first two weeks a user hears every unique song and recognizes the repetition.

**Verse of the Day during Lent (current season):** Only 5 verses tagged `season: 'lent'`. These cycle with `dayInSeason % 5`, so a Lent user sees the same verse every 5 days. Over 38 days of Lent, each verse appears 7-8 times. The user sees their first repeat on **day 6**.

**QOTD during Lent:** Only 3 Lent-specific questions. After day 3, falls to the general 72-question pool, which is a healthy cycle.

**Content that is static (does not rotate):**

- Ambient sound catalog (24 sounds) -- static selection, user-driven
- Scene presets (11) -- static selection
- Scripture readings (24) -- user browses, not rotated
- Bedtime stories (12) -- user browses
- Guided prayer sessions (8) -- user selects
- Reading plans (10) -- multi-day, user-paced
- Challenge content -- tied to calendar, user-paced
- AI Bible Chat responses (16 topic buckets) -- keyword-matched, not rotated
- Mock prayers (9 topic-matched) -- same prayer for same topic every time

### Staleness Cliffs Summary

| Content | Staleness Cliff | Severity |
|---|---|---|
| Song of the Day | Day 2 (adjacent-day repeats possible) | **HIGH** |
| Lent Verse of the Day | Day 6 (5-verse cycle) | **MEDIUM** |
| Devotionals | Day 31 (30-entry general pool) | LOW |
| QOTD | Day 73 | LOW |
| General VOTD | Day 61 | LOW |
| Mock AI prayers | Immediate (same topic = same prayer) | **HIGH** [PLANNED FIX - Phase 3] |
| Journal reflections | Random from 8 | MEDIUM [PLANNED FIX - Phase 3] |

### March 28, 2026 Verification

Easter 2026 falls on April 5. Ash Wednesday is February 18. Palm Sunday is March 29. March 28, 2026 is the **last day of Lent** (day 37, the day before Palm Sunday transitions to Holy Week).

**Liturgical calendar:** Correctly computes Lent for this date. The `getSeasonRangesForDate` function sets Lent's end as `easter - 8` (March 28), and Holy Week starts at `easter - 7` (March 29). March 28 correctly falls in Lent.

**VOTD for March 28, 2026:** Lent seasonal verse at index `37 % 5 = 2`, which is Matthew 5:4 ("Blessed are those who mourn, for they shall be comforted."). Appropriate for late Lent.

**QOTD for March 28, 2026:** Day 37 of Lent exceeds the 3 Lent-specific questions, so falls to the general pool using day-of-year rotation (`87 % 72 = 15`), which is QOTD question 16: "What does your morning quiet time look like?" (practical theme). Works correctly.

---

## Hardcoded and Mock Data Issues

### Mock Statistics That Would Look Obviously Fake

1. **Weekly recap group stats** (`useWeeklyRecap.ts` line 14): Hardcoded `MOCK_GROUP_STATS = { prayers: 23, journals: 15, meditations: 8, worshipHours: 12 }` and `MOCK_GROUP_ACTIVITY_TOTAL = 64`. These never change -- a returning user will see "Your friend group prayed 23 times" every single week. [PLANNED FIX - Phase 3]

2. **Mock prayer wall activity:** All prayer request timestamps use relative `hoursAgo()` / `daysAgo()` helpers, so they stay fresh relative to current time. However, the same 18+ prayer requests with the same text appear every session. A returning user will notice the same prayers from the same people. [PLANNED FIX - Phase 3]

3. **Mock friends data:** 10 friends with static streaks and point totals that never change. "Sarah M." always has a 45-day streak, "Maria L." always has a 90-day streak. A user who checks after a week will see the same numbers. [PLANNED FIX - Phase 3]

4. **Leaderboard data:** Static mock entries. User's own real points update, but competitors stay frozen. [PLANNED FIX - Phase 3]

5. **AI Bible Chat:** 16 hardcoded topic responses. Same question always produces the same answer verbatim. A user asking about anxiety twice gets identical text. The `fallback` response is generic but acceptable. [PLANNED FIX - Phase 3]

6. **Mock prayer generation:** 9 topic-matched prayers. Typing "I'm anxious" always generates the exact same prayer. No variation. [PLANNED FIX - Phase 3]

7. **Journal AI reflections:** Pool of 8 generic reflections. Randomly selected, but a frequent journaler will see repeats quickly. [PLANNED FIX - Phase 3]

### Hardcoded Strings That Should Be Dynamic

1. **Settings default email:** `user@example.com` in `services/settings-storage.ts:14` -- appears as the user's email in settings. Clearly a placeholder. Harmless until Phase 3 auth, but could confuse users.

2. **Local support website URLs:** 25 instances of `https://example.com/...` in `mocks/local-support-mock-data.ts`. If a user clicks "Visit Website" for any church/counselor, they hit example.com. These are mock data and expected. [PLANNED FIX - Phase 3]

3. **Prayer wall avatar URLs:** 55 references to `i.pravatar.cc` for mock user avatars. These are randomized placeholder avatars from a free service. The service itself is a third-party dependency -- if it goes down, prayer wall shows broken avatar images. Low risk since these are mock users. [PLANNED FIX - Phase 3]

4. **Playlist names with year:** `top-christian-songs-2025` in `playlists.ts` -- will look stale after 2025. The `2026` playlists are current. The 2025 playlist entry could age poorly if left beyond early 2026.

---

## Translation Consistency

**Result: CLEAN.** Grep for "NIV", "ESV", "KJV", "NASB", "NLT", "NKJV", "MSG" across all frontend source files returned zero matches. All scripture text uses the WEB (World English Bible) translation consistently. The use of "Yahweh" (characteristic of WEB) is consistent throughout all verse pools, devotionals, scripture readings, guided prayer scripts, and challenge content.

Classic prayers correctly attribute WEB where applicable (e.g., "Matthew 6:9-13 (WEB)" for The Lord's Prayer, "Psalm 23 (WEB)").

---

## Third-Party Reference Health

### Spotify Embed URLs and Playlist IDs

**8 unique Spotify playlist IDs** referenced in `data/music/playlists.ts`:

| ID | Name | Risk |
|---|---|---|
| `5Ux99VLE8cG7W656CjR2si` | Top Christian Hits 2026 | LOW -- also referenced in `constants/daily-experience.ts` |
| `6UCFGE9G29utaD959LeWcp` | Top Christian Songs 2025 | **MEDIUM** -- year-specific, will age |
| `4chwiyywlgWUkGysVlkkVC` | Top Worship Hits 2026 | LOW |
| `47xeosl4bqNSsvartwZzMv` | Top Christian Pop 2026 | LOW |
| `7wyQnm63MRwAdRbBdK4mAH` | Top Christian Indie 2026 | LOW |
| `6SUR3uQFcxhBuw37iDa06m` | Top Christian Rap 2026 | LOW |
| `1P9YTdeqQjJnPY35KyyKji` | Top Christian Afrobeats 2026 | LOW |
| `6FvRhVisEFfmdpUBbS3ZFH` | Top Christian Lofi 2026 | LOW |

**14 unique Spotify track IDs** in `DAILY_SONGS` for Song of the Day embed. These reference real Spotify tracks (Lauren Daigle, Eric Champlin, Echo Worship, etc.). Track IDs are generally stable unless the artist or label removes them from Spotify.

**Embed pattern:** Uses `https://open.spotify.com/embed/playlist/{id}` and `https://open.spotify.com/embed/track/{id}` -- standard Spotify oEmbed format. No API key required for embeds.

**Note:** The `followers: 117155` field on the first playlist is hardcoded and will become stale. Not displayed prominently, but inaccurate over time.

### Map Tile CDN

`ResultsMap.tsx` uses `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` for Leaflet tiles. This is Carto's free basemap service -- reliable and no API key needed for light usage. No Google Maps API dependency found in the codebase.

### Google Maps Directions

`ListingCard.tsx:244` links to `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` for driving directions. This is a standard Google Maps URL (not an API call) and requires no API key.

### Avatar Service

`i.pravatar.cc` is used for 55 mock prayer wall user avatars. This is a free, open-source placeholder avatar service. Availability is not guaranteed. If it goes down, avatars will show as broken images. Since these are mock users to be replaced in Phase 3, this is acceptable.

### Audio Files

All audio file references (`ambient/*.mp3`, `scripture/*.mp3`, `stories/*.mp3`) point to `AUDIO_BASE_URL` which defaults to `/audio/` locally. The `public/audio/` directory is gitignored and contains placeholder silent MP3s. Real audio will come from Cloudflare R2 CDN via `VITE_AUDIO_BASE_URL`. No broken CDN references exist -- the system gracefully falls back to the local path.

### Crisis Resource URLs

Three external crisis URLs are hardcoded in `constants/crisis-resources.ts`:
- `https://988lifeline.org` -- verified as the official 988 Suicide & Crisis Lifeline website
- `https://www.crisistextline.org` -- verified as the official Crisis Text Line website
- `https://www.samhsa.gov/find-help/national-helpline` -- verified as the official SAMHSA helpline page

These are stable government/nonprofit URLs unlikely to change. Crisis resources are referenced in 6 files including the dashboard mood check-in, prayer wall composer, and comment input.

---

## Critical Findings

### HIGH: Song of the Day Has Only 14 Unique Tracks in a 30-Entry Pool

`DAILY_SONGS` in `mocks/daily-experience-mock-data.ts` contains 30 entries, but songs 15-28 are exact duplicates of songs 1-14, and songs 29-30 duplicate songs 1-2. The `getSongOfTheDay()` function rotates through all 30 entries using `(dayOfMonth * 7) % 30`, but since half the pool is duplicated, users encounter repetition quickly. The multiplication-based hash also creates patterns where the same underlying track appears on nearby days.

**Recommendation:** Either add 16 more unique Spotify track IDs to fill the pool, or reduce the array to 14 entries and adjust the rotation formula. The Worship Room Spotify playlist (`5Ux99VLE8cG7W656CjR2si`) presumably has enough tracks to source from.

### HIGH: Mock AI Prayers Are 1:1 Topic-Mapped with Zero Variation

The 9 mock prayers in `MOCK_PRAYERS` are matched to topics via keyword detection. A user who types "I'm anxious" will always get the exact same 1-paragraph prayer. Typing "I'm anxious about work" and "I'm anxious about school" produce identical output. This is the most obvious "this isn't real AI" signal in the product. [PLANNED FIX - Phase 3]

### MEDIUM: Lent VOTD Cycle is Only 5 Verses for a 38-Day Season

Five Lent-tagged verses cycle every 5 days during a season that lasts 38 days. A daily Lent user sees each verse 7-8 times. Consider adding 5-10 more Lent-tagged verses to reduce repetition during the longest liturgical season.

### MEDIUM: Weekly Recap Stats Never Change

The `MOCK_GROUP_STATS` object is hardcoded with static numbers. Every Monday, the weekly recap card says "Your friend group prayed 23 times last week" regardless of actual activity. A returning user will notice immediately. [PLANNED FIX - Phase 3]

### LOW: Playlist Year Labels Will Age

`Top Christian Songs 2025` will look dated by mid-2026. The other 7 playlists are labeled "2026" which is current. The 2025 playlist should be replaced or re-labeled when it becomes stale.

---

## Content Architecture Observations

1. **Liturgical calendar integration is solid.** The Computus algorithm correctly computes Easter, and all season-dependent content (VOTD, QOTD, devotionals, challenges) properly filters and rotates based on the current liturgical season. Edge cases (last day of Lent, Epiphany single-day) are handled.

2. **Bible content is complete.** All 66 books have JSON files, all are registered in `BOOK_LOADERS` for lazy loading, and all 66 are in the `BIBLE_BOOKS` constant with correct chapter counts. The `BOOKS_WITH_FULL_TEXT` set matches the loader keys.

3. **Content separation is well-structured.** Data files, constants, and mock data occupy distinct directories with clear ownership. Content arrays export both flat arrays and lookup maps (`*_BY_ID`). This makes Phase 3 migration (localStorage to API) straightforward.

4. **Challenge content is the richest asset.** 110 fully-written days across 5 challenges, each with scripture (full WEB text), multi-paragraph reflections, and actionable daily steps. This content alone could sustain engagement for 110 days.

5. **No content errors found in devotional pool.** All 50 devotionals have complete fields (id, title, theme, quote, passage with verse text, multi-paragraph reflection, prayer, reflection question). Seasonal devotionals correctly reference their liturgical season.
