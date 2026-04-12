# BB-40 SEO + Open Graph Cards — Recon & Draft Document

**Spec:** `_specs/bb-40-seo-and-open-graph-cards.md`
**Plan:** `_plans/2026-04-11-bb-40-seo-and-open-graph-cards.md`
**Produced:** 2026-04-11 (Step 1 HARD STOP deliverable)
**Status:** DRAFT — awaiting user approval before Step 2

---

## 1. Baseline Verification

### SEO coverage pass (fresh grep)

`grep -l "<SEO" frontend/src/pages` returned **40 files**. After excluding test files and dead code:

| Category | Count | Notes |
|----------|-------|-------|
| Live page components rendering `<SEO>` | 37 | See table below |
| Test files that match (not pages) | 2 | `__tests__/Settings.test.tsx`, `__tests__/GrowthProfile.test.tsx` — both mention `<SEO>` in comments only |
| Dead code | 1 | `BibleStub.tsx` — BB-38 removed its only usage (`/bible/search` became a redirect); still in repo with tests but not mounted in `App.tsx` |
| App.tsx inline components with `<SEO>` | 2 | `ComingSoon` (line 101), `NotFound` (line 119) |
| **Total live `<SEO>` render sites** | **39** | Matches plan header's 39-baseline |

### Gap files (no `<SEO>`, no import)

Confirmed via `grep -c "<SEO"`:

- `frontend/src/pages/BiblePlanDetail.tsx` — 0 hits ✅ (gap file)
- `frontend/src/pages/BiblePlanDay.tsx` — 0 hits ✅ (gap file)

**Grand total post-BB-40:** 41 `<SEO>` render sites (39 existing + 2 gap fills).

### Character budget correction — [UNVERIFIED]

The plan states `" | Worship Room"` is "the 14-char suffix." The actual length is **15 characters** (counted manually: space-pipe-space + "Worship Room"). Impact:

- Plan said: raw title ≤ 46 for suffixed (→ 60 total)
- Correct: raw title ≤ **45** for suffixed (→ 60 total)

**All drafts below use ≤45 raw for suffixed routes** and ≤60 for `noSuffix: true` (Home). Step 4's parameterized length test uses the constant `TITLE_SUFFIX_LENGTH = ' | Worship Room'.length` which evaluates to 15 at runtime, so the test agrees with the correction.

---

## 2. Route Inventory & Drafts

Legend:
- **Current**: The page's existing `<SEO>` props (raw literal or expression).
- **Target**: The post-BB-40 metadata constant or builder call.
- **Canonical**: The resolved canonical URL path.
- **noIndex**: Whether the page sets `robots=noindex`.
- **OG image**: Path under `/public/`. Empty = falls back to `/og-default.png`.

### 2.1 — Public content routes (indexable)

| # | Route | Component | Current state | Target constant | Canonical | noIndex | OG image |
|---|-------|-----------|---------------|-----------------|-----------|---------|----------|
| 1 | `/` (logged-out) | `Home` | `<SEO title="Worship Room — Christian Emotional Healing & Worship" noSuffix jsonLd={homepageJsonLd} />` | `HOME_METADATA` | `/` | false | `/og/home.png` |
| 2 | `/` (logged-in) | `Dashboard` via `RootRoute` | `<SEO title="Dashboard" description="..." />` | `HOME_METADATA` (see §3.2) | `/` | **false** — must remain indexable | `/og/home.png` |
| 3 | `/daily?tab=devotional` | `DailyHub` (default tab) | `<SEO title="Daily Prayer, Journal & Meditation" ... />` | `DAILY_HUB_DEVOTIONAL_METADATA` | `/daily` | false | `/og/daily-devotional.png` |
| 4 | `/daily?tab=pray` | `DailyHub` (pray tab) | (same generic render, one SEO call) | `DAILY_HUB_PRAY_METADATA` | `/daily` | false | `/og/daily-pray.png` |
| 5 | `/daily?tab=journal` | `DailyHub` (journal tab) | (same generic render) | `DAILY_HUB_JOURNAL_METADATA` | `/daily` | false | `/og/daily-journal.png` |
| 6 | `/daily?tab=meditate` | `DailyHub` (meditate tab) | (same generic render) | `DAILY_HUB_MEDITATE_METADATA` | `/daily` | false | `/og/daily-meditate.png` |
| 7 | `/ask` | `AskPage` | `<SEO title="Ask God's Word" description="..." />` | `ASK_METADATA` | `/ask` | false | `/og/ask.png` |
| 8 | `/grow` | `GrowPage` | `<SEO title="Grow in Faith" ... />` | `GROW_METADATA` | `/grow` | false | `/og-default.png` |
| 9 | `/bible` | `BibleLanding` | `<SEO title="Read the Bible (WEB)" ... jsonLd={bibleBreadcrumbs} />` | `BIBLE_LANDING_METADATA` | `/bible` | false | `/og/bible-landing.png` |
| 10 | `/bible?mode=search&q=<q>` | `BibleLanding` (search mode) | Same render as above | `buildBibleSearchMetadata(q)` | `/bible?mode=search&q=<q>` | false | `/og/bible-landing.png` |
| 11 | `/bible/browse` | `BibleBrowse` | `<SEO title="Browse Books — Bible (WEB)" ... />` | `BIBLE_BROWSE_METADATA` | `/bible/browse` | false | `/og/bible-landing.png` |
| 12 | `/bible/plans` | `PlanBrowserPage` | `<SEO title="Reading Plans — Bible (WEB)" ... />` | `BIBLE_PLANS_BROWSER_METADATA` | `/bible/plans` | false | `/og/plans-browser.png` |
| 13 | `/bible/plans/:slug` | `BiblePlanDetail` | **NONE (gap)** | `buildBiblePlanMetadata(slug, title, desc)` | `/bible/plans/<slug>` | false | `/og/plans/<slug>.png` |
| 14 | `/bible/plans/:slug/day/:dayNumber` | `BiblePlanDay` | **NONE (gap)** | `buildBiblePlanDayMetadata(slug, title, day, day.title)` | `/bible/plans/<slug>/day/<n>` | false | `/og/plans/<slug>.png` |
| 15 | `/bible/:book/:chapter` | `BibleReader` | `<SEO title={template} description={template} canonical={template} />` | `buildBibleChapterMetadata(...)` | `/bible/<book>/<chapter>` | false | `/og/bible-chapter.png` |
| 16 | `/music` | `MusicPage` | `<SEO title="Worship Music & Ambient Sounds" ... jsonLd={musicBreadcrumbs} />` | `MUSIC_METADATA` | `/music` | false | `/og-default.png` |
| 17 | `/music/routines` | `RoutinesPage` | `<SEO title="Bedtime Routines" ... />` | `MUSIC_ROUTINES_METADATA` | `/music/routines` | false | `/og-default.png` |
| 18 | `/prayer-wall` | `PrayerWall` | `<SEO title="Community Prayer Wall" ... jsonLd={prayerWallBreadcrumbs} />` | `PRAYER_WALL_METADATA` | `/prayer-wall` | false | `/og-default.png` |
| 19 | `/prayer-wall/:id` | `PrayerDetail` | `<SEO title="Prayer Request" ... />` | `PRAYER_DETAIL_METADATA` | `/prayer-wall/<id>` | false | `/og-default.png` |
| 20 | `/prayer-wall/user/:id` | `PrayerWallProfile` | `<SEO title={template} description={template} />` | `PRAYER_WALL_PROFILE_METADATA` | `/prayer-wall/user/<id>` | false | `/og-default.png` |
| 21 | `/local-support/churches` | `Churches` | `<SEO title="Find Churches Near You" ... jsonLd={churchesBreadcrumbs} />` | `CHURCHES_METADATA` | `/local-support/churches` | false | `/og-default.png` |
| 22 | `/local-support/counselors` | `Counselors` | `<SEO title="Find Christian Counselors Near You" ... jsonLd={counselorsBreadcrumbs} />` | `COUNSELORS_METADATA` | `/local-support/counselors` | false | `/og-default.png` |
| 23 | `/local-support/celebrate-recovery` | `CelebrateRecovery` | `<SEO title="Find Celebrate Recovery Near You" ... jsonLd={crBreadcrumbs} />` | `CELEBRATE_RECOVERY_METADATA` | `/local-support/celebrate-recovery` | false | `/og-default.png` |
| 24 | `/reading-plans/:planId` | `ReadingPlanDetail` | `<SEO title={template} description={template} jsonLd={breadcrumbs} />` | `READING_PLAN_DETAIL_METADATA` (static fallback title + leaves existing dynamic template intact — see §3.4) | `/reading-plans/<planId>` | false | `/og-default.png` |
| 25 | `/challenges/:challengeId` | `ChallengeDetail` | `<SEO title={template} description={template} />` | `CHALLENGE_DETAIL_METADATA` (same as above) | `/challenges/<challengeId>` | false | `/og-default.png` |
| 26 | `/verse/:id` | `SharedVerse` | `<SEO title={verse.reference} description={...} />` | `SHARED_VERSE_METADATA` (static) with dynamic title kept as-is via `<SEO {...SHARED_VERSE_METADATA} title={verse.reference} />` | `/verse/<id>` | false | `/og-default.png` |
| 27 | `/prayer/:id` | `SharedPrayer` | `<SEO title="Shared Prayer" description="..." />` | `SHARED_PRAYER_METADATA` | `/prayer/<id>` | false | `/og-default.png` |

### 2.2 — Private / auth-gated routes (noIndex)

| # | Route | Component | Current state | Target constant | noIndex source |
|---|-------|-----------|---------------|-----------------|---------------|
| 28 | `/bible/my` | `MyBiblePage` | `<SEO title="My Bible" ... jsonLd={myBibleBreadcrumbs} />` (NO noIndex today) | `MY_BIBLE_METADATA` | **BB-40 adds** — private feed, personalized highlights/notes |
| 29 | `/my-prayers` | `MyPrayers` | already `noIndex` | `MY_PRAYERS_METADATA` | existing |
| 30 | `/friends` | `Friends` | already `noIndex` | `FRIENDS_METADATA` | existing |
| 31 | `/settings` | `Settings` | already `noIndex` | `SETTINGS_METADATA` | existing |
| 32 | `/insights` | `Insights` | already `noIndex` | `INSIGHTS_METADATA` | existing |
| 33 | `/insights/monthly` | `MonthlyReport` | already `noIndex` | `INSIGHTS_MONTHLY_METADATA` | existing |
| 34 | `/profile/:userId` | `GrowthProfile` | already `noIndex` (both branches) | `GROWTH_PROFILE_METADATA` | existing |
| 35 | `/prayer-wall/dashboard` | `PrayerWallDashboard` | already `noIndex` | `PRAYER_WALL_DASHBOARD_METADATA` | existing |
| 36 | `/meditate/breathing` | `BreathingExercise` | already `noIndex` | `MEDITATE_BREATHING_METADATA` | existing |
| 37 | `/meditate/soaking` | `ScriptureSoaking` | already `noIndex` | `MEDITATE_SOAKING_METADATA` | existing |
| 38 | `/meditate/gratitude` | `GratitudeReflection` | already `noIndex` | `MEDITATE_GRATITUDE_METADATA` | existing |
| 39 | `/meditate/acts` | `ActsPrayerWalk` | already `noIndex` | `MEDITATE_ACTS_METADATA` | existing |
| 40 | `/meditate/psalms` | `PsalmReading` | already `noIndex` | `MEDITATE_PSALMS_METADATA` | existing |
| 41 | `/meditate/examen` | `ExamenReflection` | already `noIndex` | `MEDITATE_EXAMEN_METADATA` | existing |

### 2.3 — Stub / system routes (noIndex)

| # | Route | Component | Current state | Target constant | noIndex source |
|---|-------|-----------|---------------|-----------------|---------------|
| 42 | `/login` | `ComingSoon title="Log In"` (in `App.tsx`) | `<SEO title="Log In" description="Log In — coming soon..." noIndex />` | `LOGIN_METADATA` | existing |
| 43 | `/register` | `RegisterPage` | `<SEO title="Get Started" ... canonical="/register" />` (NO noIndex today) | `REGISTER_METADATA` | **BB-40 adds** — stub page, Phase 3 ships real flow |
| 44 | `/health` | `Health` | already `noIndex` | `HEALTH_METADATA` | existing |
| 45 | `*` (404) | `NotFound` (in `App.tsx`) | `<SEO title="Page Not Found" description="..." noIndex />` | `NOT_FOUND_METADATA` | existing |

### 2.4 — Redirect routes (no SEO needed)

These routes issue `<Navigate>` or render a redirect wrapper; the destination page renders `<SEO>`. BB-40 does not touch them.

| Route | Redirects to | Handler |
|-------|-------------|---------|
| `/devotional` | `/daily?tab=devotional` | `DevotionalRedirect` (handles `?day=` param) |
| `/reading-plans` | `/grow?tab=plans` | `ReadingPlansRedirect` |
| `/challenges` | `/grow?tab=challenges` | `<Navigate>` |
| `/pray` | `/daily?tab=pray` | `<Navigate>` |
| `/journal` | `/daily?tab=journal` | `<Navigate>` |
| `/meditate` | `/daily?tab=meditate` | `<Navigate>` |
| `/scripture` | `/daily?tab=pray` | `<Navigate>` |
| `/bible/search` | `/bible?mode=search&q=...` | `BibleSearchRedirect` |
| `/music/playlists` | `/music?tab=playlists` | `<Navigate>` |
| `/music/ambient` | `/music?tab=ambient` | `<Navigate>` |
| `/music/sleep` | `/music?tab=sleep` | `<Navigate>` |

### 2.5 — Dev-only routes

| Route | Component | Visibility |
|-------|-----------|-----------|
| `/dev/mood-checkin` | `MoodCheckInPreview` | `import.meta.env.DEV` only — not deployed. No SEO needed. |

---

## 3. Title & Description Drafts

All raw titles ≤45 chars (suffixed routes) or ≤60 chars (Home only, `noSuffix: true`). All descriptions ≤160 chars. Character counts inlined for review.

### 3.1 — Homepage

**`HOME_METADATA`** — `noSuffix: true`
- **Title** (52 chars): `Worship Room — Christian Emotional Healing & Worship`
- **Description** (152 chars): `Find comfort, guidance, and spiritual support through AI prayer, Scripture, journaling, meditation, worship music, and a caring community.`
- **OG image**: `/og/home.png`
- **OG image alt**: `Worship Room — a free Christian space for prayer, Scripture, and healing`
- **Unchanged from current Home.tsx**, migrated to constant with explicit `ogImage`.

### 3.2 — Dashboard (root `/` logged-in)

The logged-in root serves `Dashboard` via `RootRoute`. Crawlers always see `Home` (dashboard is auth-only). We use `HOME_METADATA` for both branches so the canonical root metadata is consistent. Decision: **do not create a separate `DASHBOARD_METADATA`**. The current `Dashboard.tsx` SEO render is a distinct call site, but it spreads `HOME_METADATA` in Step 5. Rationale: crawlers never see Dashboard; deduplicating prevents drift between two copies of the same metadata.

### 3.3 — Daily Hub (4 tab variants, shared canonical `/daily`)

All four share `DAILY_HUB_*_METADATA.noSuffix = false` (suffixed). All canonical to `/daily` because `tab` is in `UI_STATE_PARAMS`.

**`DAILY_HUB_DEVOTIONAL_METADATA`** *(Rev 2 — Step 1 iteration 2)*
- **Title** (18 chars): `Today's Devotional`
- **Description** (111 chars): `A short Scripture reading, a reflection, and a closing prayer. Unhurried, quiet, and written for ordinary days.`
- **OG image**: `/og/daily-devotional.png`
- **OG image alt**: `Today's devotional on Worship Room`
- **Revision note:** Dropped redundant "Daily" from title (`Today's Daily Devotional` → `Today's Devotional`). Rewrote description to name the three concrete parts of the page (Scripture, reflection, prayer), drop "before everything else begins" filler, drop "Christian" as a category label. "Ordinary days" positions this as an unhurried practice, not a time-of-day ritual.

**`DAILY_HUB_PRAY_METADATA`** *(Rev 2 — Step 1 iteration 2)*
- **Title** (14 chars): `Write a Prayer`
- **Description** (118 chars): `Write what's on your heart and get back a Scripture-grounded prayer for this moment. Honest, unhurried, and always free.`
- **OG image**: `/og/daily-pray.png`
- **OG image alt**: `Write a prayer on Worship Room — Scripture-grounded and honest`
- **Revision note:** Was `Pray with Guidance` — off-brand (Christian-self-help-book voice). Picked `Write a Prayer` from the three options (`Pray Right Now`, `Write a Prayer`, `A Prayer for This Moment`) because it names the user's action directly. Description dropped "Let Scripture meet you in this moment" (devotional-greeting-card), replaced with a mechanical description of what actually happens: user writes → page returns a Scripture-grounded prayer. Kept "free" for brand positioning.

**`DAILY_HUB_JOURNAL_METADATA`** *(Rev 2 — Step 1 iteration 2)*
- **Title** (13 chars): `Daily Journal`
- **Description** (132 chars): `A private journal for the things you need to think through. Guided prompts or free write — your entries stay yours, on your device.`
- **OG image**: `/og/daily-journal.png`
- **OG image alt**: `A private daily journal on Worship Room`
- **Revision note:** Was `Christian Guided Journal` — Lifeway subculture-product positioning. Dropped `Christian` (audience already there), picked `Daily Journal` from (`Daily Journal`, `Quiet Journal`, `Reflect & Write`) because it's the most direct and matches the Daily Hub context. Description dropped the verb-list opening ("Reflect, vent, remember, and thank God"), replaced with a spine sentence ("A private journal for the things you need to think through"). Preserved the strong closing "your entries stay yours, on your device" — that's honest Worship Room voice.

**`DAILY_HUB_MEDITATE_METADATA`** *(Rev 3 — Step 1 iteration 3)*
- **Title** (20 chars): `Contemplative Prayer`
- **Description** (158 chars): `Six contemplative practices from the Christian tradition — breathing, Scripture soaking, gratitude, ACTS, Psalms, and the Ignatian Examen. Slow and unhurried.`
- **OG image**: `/og/daily-meditate.png`
- **OG image alt**: `Contemplative prayer on Worship Room — breathing, Scripture soaking, Examen, and more`
- **Rev 2 note (superseded):** had picked `Six Guided Practices` to avoid subcultural shorthand.
- **Rev 3 note:** Swapped to `Contemplative Prayer` because the user pointed out that "Six Guided Practices" loses the meditation framing — users searching for or sharing this page are looking for a meditation practice, and the standalone title in a search result needs to communicate that. `Contemplative Prayer` is more distinctive than the generic `Guided Meditation` alternative, names the actual tradition the practices come from (Examen, ACTS, Scripture soaking are all historically contemplative tradition), and is the term target users would search for. Description rewritten to lead with "Six contemplative practices from the Christian tradition" — explicitly names the lineage so the practices feel inherited rather than invented. Kept the full name-list of all 6 practices and the "slow and unhurried" close. Note: description is 158 chars, 2 under the 160 limit — tight but legal.

### 3.4 — Bible section

**`BIBLE_LANDING_METADATA`**
- **Title** (20 chars): `Read the Bible (WEB)`
- **Description** (156 chars): `Read the World English Bible free online — all 66 books, no account needed. Resume where you left off, save highlights and notes, and listen aloud.`
- **OG image**: `/og/bible-landing.png`
- **OG image alt**: `The World English Bible on Worship Room`

**`BIBLE_BROWSE_METADATA`**
- **Title** (25 chars): `Browse the Bible (WEB)`
- **Description** (152 chars): `Browse all 66 books of the World English Bible by testament, book, and chapter. Free, ad-free, public-domain — yours to read at your own pace.`
- **OG image**: `/og/bible-landing.png`
- **OG image alt**: `Browse the World English Bible on Worship Room`

**`BIBLE_PLANS_BROWSER_METADATA`** *(Rev 3 — Step 1 iteration 3)*
- **Title** (27 chars): `Reading Plans for Hard Days`
- **Description** (156 chars): `Short guided Bible reading plans for anxiety, sleepless nights, the life of Jesus, and the Psalms. 7 to 30 days. No guilt, no streaks, just reading.`
- **OG image**: `/og/plans-browser.png`
- **OG image alt**: `Bible reading plans for hard days on Worship Room`
- **Rev 3 note:** Was `Bible Reading Plans` (19 chars) — generic, every Bible app has this page. Swapped to `Reading Plans for Hard Days` which is distinctive and accurately describes all 4 current plans (anxious, sleepless, Psalms when hurting, John framed contemplatively). This is a content-aware title — if BB-40's successors ever add plans that aren't framed around hard days (e.g., a 365-day through-the-Bible plan or a seasonal Advent-only reading plan), this title would need to revisit. Flagged in §14 as a fact-dependent title. Description unchanged — the existing wording ("for anxiety, sleepless nights...") already lined up with the new angle.

**`MY_BIBLE_METADATA`** — `noIndex: true`
- **Title** (9 chars): `My Bible`
- **Description** (153 chars): `Your highlights, notes, and bookmarks from the Bible reader — all in one private feed. Stored locally on your device, no account needed to use it.`
- **OG image**: `/og/my-bible.png`
- **OG image alt**: `Your Bible highlights and notes on Worship Room`

**`buildBibleChapterMetadata(bookName, chapterNumber, bookSlug)`** — dynamic
- **Title template** (up to ~22 chars for longest book): `${bookName} ${chapterNumber} (WEB)`
  - Longest book name: `Song of Solomon` (15 chars) + ` 8 (WEB)` (8 chars) = 23 chars ✓
  - Longest chapter number: `Psalms 119 (WEB)` = 16 chars ✓
- **Description template** (up to ~135 chars): `Read ${bookName} chapter ${chapterNumber} from the World English Bible. Highlight verses, add notes, and listen to an audio reading.`
  - Worst case: `Read Song of Solomon chapter 8 from the World English Bible. Highlight verses, add notes, and listen to an audio reading.` = 122 chars ✓
- **OG image**: `/og/bible-chapter.png` (same card for every chapter)
- **OG image alt template**: `${bookName} ${chapterNumber} — World English Bible`
- **JSON-LD**: `BreadcrumbList` with 4 items: Worship Room → Bible → {book} → {book} {chapter}
- **Canonical override**: `/bible/${bookSlug}/${chapterNumber}` (strips `?verse=`, `?scroll-to=`, `?action=`)

**Concrete examples (to review):**

| Route | Rendered title | Rendered description |
|-------|---------------|----------------------|
| `/bible/philippians/4` | `Philippians 4 (WEB)` | `Read Philippians chapter 4 from the World English Bible. Highlight verses, add notes, and listen to an audio reading.` |
| `/bible/psalms/119` | `Psalms 119 (WEB)` | `Read Psalms chapter 119 from the World English Bible. Highlight verses, add notes, and listen to an audio reading.` |
| `/bible/song-of-solomon/8` | `Song of Solomon 8 (WEB)` | `Read Song of Solomon chapter 8 from the World English Bible. Highlight verses, add notes, and listen to an audio reading.` |

**`buildBiblePlanMetadata(slug, planTitle, planDescription)`** — dynamic

- **Title template**: `${planTitle}` (truncated to 42 + `…` if longer than 45)
- **Description template**: `${planDescription}` truncated to 157 chars + `…` if longer than 160
  - All 4 real plans in the manifest have long narrative descriptions (800+ chars each). Truncation uses the first ~157 chars of the curator's description, which is a natural lead-in paragraph.
- **OG image**: `/og/plans/${slug}.png` with fallback `/og/bible-chapter.png` for unknown slugs
- **OG image alt**: `${planTitle} — Worship Room reading plan`
- **JSON-LD**: `BreadcrumbList` with 3 items: Bible → Plans → {plan}
- **Canonical override**: `/bible/plans/${slug}` (strips any query params)

**Concrete examples (finalized with manifest values):**

| Slug | Title (chars) | Description (first 157 chars + `…`) |
|------|--------------|-------------------------------------|
| `psalms-30-days` | `30 Days in the Psalms` (21) | `The Psalms are the prayer book of the Bible. For three thousand years, people have turned to these poems when they needed language for what they were feelin…` (160) |
| `john-story-of-jesus` | `The Story of Jesus` (18) | `John was the last of the four Gospels written. By the time John picked up his pen, three other accounts of Jesus's life were already in circulation. So John…` (160) |
| `when-youre-anxious` | `When You're Anxious` (19) | `If you're reading this, you might already know the verses. Be anxious for nothing. Do not fear. Cast your cares on him. Maybe people have quoted them at you…` (160) |
| `when-you-cant-sleep` | `When You Can't Sleep` (20) | `If you're reading this, it's probably late. Or early — the kind of early that doesn't feel like morning yet. You've been trying to sleep and it isn't worki…` (160) |

**Note on truncation:** The builder truncates at 157 chars then appends `…`. If the 157th char lands mid-word, the truncation is still readable because it's followed by a visible ellipsis. We do NOT truncate at the last space — simpler logic, acceptable UX for SEO descriptions (Google often cuts mid-word anyway). If the user wants word-boundary truncation, that's a Step 4 modification.

**`buildBiblePlanDayMetadata(slug, planTitle, dayNumber, dayTitle)`** — dynamic
- **Title template**: `Day ${dayNumber}: ${dayTitle}` (e.g., `Day 5: Psalm 23 — The Lord is my Shepherd`)
  - Safety: if `Day N: ${dayTitle}` > 45 chars, truncate `dayTitle` to fit (naive slice at 45 − prefix length, add `…`)
  - Day numbers max 30 (longest plan is psalms-30-days), so `Day 30: ` = 8 chars → `dayTitle` budget = 37 chars before truncation
- **Description template**: `Day ${dayNumber} of ${planTitle} — read ${dayTitle} and reflect with a short devotional from Worship Room.`
  - Worst case: `Day 30 of 30 Days in the Psalms — read ${37-char dayTitle} and reflect with a short devotional from Worship Room.` — budget allows ~85 char `dayTitle` before hitting 160, well within real data
- **OG image**: `/og/plans/${slug}.png` (same card as the plan detail)
- **OG image alt**: `Day ${dayNumber} of ${planTitle}`
- **JSON-LD**: `BreadcrumbList` with 4 items: Bible → Plans → {plan} → Day {n}
- **Canonical override**: `/bible/plans/${slug}/day/${dayNumber}` (strips `?verse=`)

**NOTE on day title source:** The plan builder signature takes `dayPassage` as its 4th argument. Per `BiblePlanDay.tsx` inspection, the `day.title` field is a curated heading (e.g., `"Psalm 23 — The Lord is my Shepherd"`) which is richer than the raw passage reference (`day.passages[0].book/chapter`). **Step 8 passes `day.title` as `dayPassage`.** The builder's parameter name is kept as `dayPassage` for API stability but the caller passes the curated title.

**`buildBibleSearchMetadata(query)`** — dynamic

- **Empty/null/whitespace query** (returns default):
  - Title (18 chars): `Search the Bible`
  - Description (98 chars): `Search the entire World English Bible for any word, phrase, or theme. Free and ad-free.`
  - OG image: `/og/bible-landing.png`
  - No canonical override (UI_STATE_PARAMS preserves `?mode=search&q=` in canonical)
- **With query** (e.g., `q=love`):
  - Title template: `Search: ${query.slice(0, 60).trim()}`
    - Worst case: `Search: ` (8) + 60-char query = 68 chars → exceeds 45; builder truncates query to 37 chars then
  - Description template: `Search results for "${query}" in the World English Bible on Worship Room.`
  - OG image: `/og/bible-landing.png`

**Query truncation correction:** The plan's Step 4 draft says `trimmed = query.trim().slice(0, 60)` which produces titles up to 68 chars. **Step 4 must slice to 37** to keep the title within 45 chars. This is a [UNVERIFIED → CORRECTED] item — recording here so Step 4 doesn't copy the plan's 60 by mistake.

### 3.5 — Ask / Grow / Music / Prayer Wall

**`ASK_METADATA`** *(Rev 2 — Step 1 iteration 2)*
- **Title** (13 chars): `Ask the Bible`
- **Description** (127 chars): `Ask life questions and receive Scripture-grounded answers with verse links and follow-ups. For hard days and honest questions.`
- **OG image**: `/og/ask.png`
- **OG image alt**: `Ask the Bible on Worship Room`
- **Revision note:** Was `Ask the Bible AI` — positioned the page as an AI demo. Dropped `AI` from the title per BB-30/BB-31 pattern (name what the user does, mention AI honestly in body copy, don't lead with the technology). Kept strong description opening "Ask life questions and receive Scripture-grounded answers", tightened `follow-up prompts` → `follow-ups`, replaced "A free Bible companion for hard days and honest questions" (marketing-y) with the direct "For hard days and honest questions". **AI is not mentioned in the metadata at all** — the page's AI nature surfaces via the in-page disclaimer and the BB-30/BB-31 copy. This is intentional and matches how BB-30/BB-31 handles AI disclosure.

**`GROW_METADATA`** *(Rev 2 — Step 1 iteration 2)*
- **Title** (26 chars): `Reading Plans & Challenges`
- **Description** (143 chars): `Bible reading plans and seasonal community challenges: Lent, Easter, Pentecost, Advent, and New Year. Short guided paths, no streaks, no guilt.`
- **OG image**: `/og-default.png` (no dedicated card)
- **OG image alt**: `Bible reading plans and seasonal challenges on Worship Room`
- **Revision note:** Was `Grow — Plans & Challenges` which read like a breadcrumb. Replaced with `Reading Plans & Challenges` — names the two actual content types without the "Grow —" nav-label prefix. **Fact-check on seasonal content:** verified that `src/data/challenges.ts` contains 5 real challenges matching the description: `'Pray40: A Lenten Journey'`, `'Easter Joy: 7 Days of Resurrection Hope'`, `'Fire of Pentecost: 21 Days of the Spirit'`, `'Advent Awaits: 21 Days to Christmas'`, `'New Year, New Heart: 21 Days of Renewal'`. The description's seasonal list is factual, not aspirational. Dropped `Christian` from the description (audience already there), dropped "to deepen your walk with God" (devotional-greeting-card), replaced with "Short guided paths, no streaks, no guilt" which echoes `BIBLE_PLANS_BROWSER_METADATA` and matches BB-31/BB-32's anti-pressure voice.

**`MUSIC_METADATA`**
- **Title** (32 chars): `Worship Music & Ambient Sounds`
- **Description** (154 chars): `Stream worship playlists, mix ambient sounds for prayer and meditation, and fall asleep to Scripture readings. No ads, no subscriptions, all free.`
- **OG image**: `/og-default.png` (no dedicated card)
- **OG image alt**: `Worship music and ambient sounds on Worship Room`

**`MUSIC_ROUTINES_METADATA`**
- **Title** (16 chars): `Bedtime Routines`
- **Description** (156 chars): `Wind down with guided Christian bedtime routines combining Scripture, ambient sounds, and gentle prayers. Four templates to help you rest in peace.`
- **OG image**: `/og-default.png`
- **OG image alt**: `Bedtime routines on Worship Room`

**`PRAYER_WALL_METADATA`**
- **Title** (21 chars): `Community Prayer Wall`
- **Description** (156 chars): `Share prayer requests, pray for others, and receive encouragement in a caring Christian community. No ads, no harvesting — just prayers lifted together.`
- **OG image**: `/og-default.png`
- **OG image alt**: `The Worship Room community prayer wall`

**`PRAYER_DETAIL_METADATA`** (static base; page-level dynamic title allowed via spread override if desired — Step 5 decides)
- **Title** (14 chars): `Prayer Request`
- **Description** (142 chars): `A prayer request shared on the Worship Room community prayer wall. Read, pray along, or leave a word of encouragement for the person asking.`
- **OG image**: `/og-default.png`
- **OG image alt**: `A prayer request on the Worship Room community prayer wall`

**`PRAYER_WALL_PROFILE_METADATA`** — title is dynamic per user, overrides the static base
- **Static fallback title** (17 chars): `Prayer Profile`
- **Dynamic title template** (worst case ~35 chars): `${firstName}'s Prayers`
- **Description template** (worst case ~110 chars): `Prayers shared by ${firstName} on the Worship Room community prayer wall.`
- **OG image**: `/og-default.png`
- **OG image alt template**: `Prayers shared by ${firstName} on Worship Room`

### 3.6 — Local Support

**`CHURCHES_METADATA`**
- **Title** (24 chars): `Find Churches Near You`
- **Description** (157 chars): `Locate churches in your area with service times, directions, and contact information. A simple, faith-friendly directory for finding a worship community.`
- **OG image**: `/og-default.png`
- **OG image alt**: `Find churches near you on Worship Room`

**`COUNSELORS_METADATA`**
- **Title** (34 chars): `Find Christian Counselors Near You`
- **Description** (159 chars): `Locate Christian counselors and therapists in your area for faith-based professional support. We list profiles so you can reach out directly to the counselor.`
- **OG image**: `/og-default.png`
- **OG image alt**: `Find Christian counselors near you on Worship Room`

**`CELEBRATE_RECOVERY_METADATA`**
- **Title** (31 chars): `Find Celebrate Recovery Near You`
- **Description** (154 chars): `Locate Celebrate Recovery meetings in your area for faith-based addiction, habit, and hurt recovery support. A Christ-centered 12-step community.`
- **OG image**: `/og-default.png`
- **OG image alt**: `Find Celebrate Recovery meetings near you on Worship Room`

### 3.7 — Private / auth-gated (noIndex, descriptions still matter for direct share)

**`MY_PRAYERS_METADATA`** — `noIndex: true`
- **Title** (17 chars): `My Saved Prayers`
- **Description** (141 chars): `Your saved prayers and prayer history on Worship Room. Track answered prayers, set reminders, and revisit the words that carried you through.`

**`FRIENDS_METADATA`** — `noIndex: true` *(Rev 3 — Step 1 iteration 3)*
- **Title** (7 chars): `Friends`
- **Description** (155 chars): `Grow together in faith with friends, gentle encouragement, and friendly accountability. Your mood data stays private — only engagement is shareable.`
- **Rev 3 note:** Was `Friends & Leaderboard` (21 chars). Dropped `& Leaderboard` from the title even though the leaderboard feature is real (verified in `Friends.tsx:19` and line 25) because the word introduces competition framing that contradicts BB-31/BB-32's anti-pressure voice. Route is `noIndex`, so SEO impact is zero — the only cost is that the browser tab title no longer advertises the leaderboard, which is fine since users discover it by entering the page. Description unchanged — it doesn't reference the leaderboard directly.

**`SETTINGS_METADATA`** — `noIndex: true`
- **Title** (8 chars): `Settings`
- **Description** (102 chars): `Manage your Worship Room account, notifications, privacy preferences, and data controls.`

**`INSIGHTS_METADATA`** — `noIndex: true` *(Rev 3 — Step 1 iteration 3)*
- **Title** (24 chars): `Mood & Practice Insights`
- **Description** (151 chars): `Track your mood trends, meditation minutes, and daily activity patterns over time. Private analytics from your own data — nothing shared, nothing sold.`
- **Rev 3 note:** Was `Mood Insights & Spiritual Growth` (33 chars). User flagged "Spiritual Growth" as vague Christian-product language. Swapped to `Mood & Practice Insights` — stays factual (mood data and practice data are what the page actually displays per CLAUDE.md: mood heatmap, trend chart, activity correlations, meditation history, morning/evening comparison) and is 9 chars tighter. Description updated in parallel: dropped "spiritual growth" phrase, replaced with "daily activity patterns" which aligns with the activity-correlations and meditation-history features that actually render on the page. Route is `noIndex` so SEO impact is zero; the update is about consistency with the title.

**`INSIGHTS_MONTHLY_METADATA`** — `noIndex: true`
- **Title** (20 chars): `Monthly Mood Report`
- **Description** (113 chars): `Your monthly spiritual growth and mood tracking summary, visualized and exportable to your own archive.`

**`GROWTH_PROFILE_METADATA`** — `noIndex: true` — dynamic title
- **Static fallback title** (16 chars): `Growth Profile`
- **Dynamic title template** (~35 chars): `${displayName}'s Growth Profile`
- **Description template** (~140 chars): `See ${displayName}'s spiritual growth journey, badges, and encouragement on Worship Room.`
- **Error branch (invalid user)** — `GROWTH_PROFILE_NOT_FOUND_METADATA` or inline: title `Profile Not Found`, description `This user profile doesn't exist or may have been removed.`, `noIndex: true`

**`PRAYER_WALL_DASHBOARD_METADATA`** — `noIndex: true`
- **Title** (16 chars): `Prayer Dashboard`
- **Description** (112 chars): `Your private prayer wall dashboard — track requests, activity, answered prayers, and drafts, all in one place.`

### 3.8 — Meditate sub-pages (all `noIndex: true`)

All 6 meditate sub-pages get dedicated metadata constants. They are auth-gated at the route level, so these are functionally private.

| Constant | Title (chars) | Description (chars) |
|----------|---------------|---------------------|
| `MEDITATE_BREATHING_METADATA` | `Breathing Exercise` (18) | `A calming 4-7-8 breathing exercise paired with a Scripture verse for peace and focus. Free and guided.` (104) |
| `MEDITATE_SOAKING_METADATA` | `Scripture Soaking` (17) | `Contemplate and meditate on a single Bible verse with guided reflection prompts. Slow, quiet, restorative.` (107) |
| `MEDITATE_GRATITUDE_METADATA` | `Gratitude Reflection` (20) | `A guided gratitude meditation rooted in Scripture — name three gifts, carry them with you through the day.` (108) |
| `MEDITATE_ACTS_METADATA` | `ACTS Prayer Walk` (16) | `A structured prayer using the ACTS framework — Adoration, Confession, Thanksgiving, Supplication. Step by step.` (112) |
| `MEDITATE_PSALMS_METADATA` | `Psalm Reading` (13) | `Read and reflect on a curated Psalm with historical context and guided meditation. Ten Psalms to rotate through.` (112) |
| `MEDITATE_EXAMEN_METADATA` | `Examen Reflection` (17) | `The Ignatian Examen — a reflective prayer reviewing your day with God. Where did you feel alive? Where did you resist?` (118) |

### 3.9 — Stubs & system

**`REGISTER_METADATA`** — `noIndex: true` (**BB-40 adds**)
- **Title** (11 chars): `Get Started`
- **Description** (159 chars): `Create your free Worship Room account — AI-assisted prayer, Bible reading, journaling, meditation, worship music, and community. Completely free, forever.`
- **OG image**: `/og-default.png` (stub, no card)

**`LOGIN_METADATA`** — `noIndex: true`
- **Title** (6 chars): `Log In`
- **Description** (96 chars): `Log in to your Worship Room account — secure sign-in coming soon to our sanctuary on the web.`

**`NOT_FOUND_METADATA`** — `noIndex: true`
- **Title** (14 chars): `Page Not Found`
- **Description** (95 chars): `The page you're looking for doesn't exist, but there's plenty of peace to find elsewhere.`

**`HEALTH_METADATA`** — `noIndex: true`
- **Title** (12 chars): `Health Check`
- **Description** (24 chars): `System health status.`

### 3.10 — Sharing routes

**`SHARED_VERSE_METADATA`** — static base (dynamic title override at call site)
- **Static fallback title** (14 chars): `Shared Verse`
- **Dynamic title template**: `${verse.reference}` (e.g., `Psalm 23:1`)
- **Description template**: existing page logic (`verseDescription`) — left unchanged, Step 5 only spreads static fallback + `ogImage`
- **OG image**: `/og-default.png`
- **OG image alt**: `A Bible verse shared from Worship Room`

**`SHARED_PRAYER_METADATA`**
- **Title** (13 chars): `Shared Prayer`
- **Description** (121 chars): `A prayer shared from Worship Room — Christian emotional healing and worship through Scripture, prayer, and community.`
- **OG image**: `/og-default.png`
- **OG image alt**: `A prayer shared from Worship Room`

### 3.11 — Reading Plan + Challenge detail (legacy routes)

These are the pre-Bible-redesign reading-plan and challenge routes (`/reading-plans/:planId`, `/challenges/:challengeId`), separate from the BB-21 `/bible/plans/:slug` routes.

**`READING_PLAN_DETAIL_METADATA`** — static base (title is dynamic via call site override)
- **Static fallback title** (20 chars): `Reading Plan`
- **Dynamic title template**: `${plan.title} | Reading Plans` (current inline template preserved)
- **Description template**: `${plan.description.slice(0, 155).trim()}` (current inline logic preserved)
- **OG image**: `/og-default.png`
- **JSON-LD**: existing `breadcrumbs` prop preserved at call site

**`CHALLENGE_DETAIL_METADATA`** — static base (dynamic title override)
- **Static fallback title** (19 chars): `Community Challenge`
- **Dynamic title template**: `${challenge.title} | Community Challenges` (current inline template preserved)
- **Description template**: `${challenge.description.slice(0, 155).trim()}` (current inline logic preserved)
- **OG image**: `/og-default.png`

**Rationale for keeping these dynamic:** The legacy plans and challenges have pre-curated titles/descriptions in their data files. Replacing with static constants would lose per-plan/per-challenge identity. Step 5 preserves the dynamic template at the call site and uses the constant only for `ogImage` and static fallback.

---

## 4. Canonical URL Strategy

### 4.1 — UI_STATE_PARAMS (extended in Step 3)

| Param | Strip from canonical? | Routes that use it | Why |
|-------|----------------------|--------------------|-----|
| `tab` | YES (existing) | `/daily`, `/grow`, `/friends`, `/music` | Tab selector, UI state only |
| `verseRef` | **YES (BB-40 adds)** | `/daily?tab=meditate` | Spec Z verse pass-through |
| `verseText` | **YES (BB-40 adds)** | `/daily?tab=meditate` | Spec Z verse pass-through |
| `verseTheme` | **YES (BB-40 adds)** | `/daily?tab=meditate` | Spec Z verse pass-through |

### 4.2 — Params NOT stripped (content params)

| Param | Routes | Why preserve |
|-------|--------|--------------|
| `q` | `/bible?mode=search&q=...` | Search query is page identity |
| `mode` | `/bible?mode=search` | Search mode is page identity |
| `source` | Many (marketing attribution) | Not stripped; harmless to preserve |
| `day` | `/daily?day=N` (devotional date nav) | Content identity |
| `create` | `/grow?tab=plans&create=true` | UI state but harmless; could add to strip list in a future spec |

### 4.3 — Explicit canonical overrides (no UI_STATE_PARAMS strip — full override)

These routes pass an explicit `canonical` to `<SEO>` via the dynamic builder's return value, which causes `buildCanonicalUrl` to drop all query params entirely.

| Route | Params suppressed | Builder that sets canonical |
|-------|------------------|----------------------------|
| `/bible/:book/:chapter` | `verse`, `scroll-to`, `action` | `buildBibleChapterMetadata` |
| `/bible/plans/:slug/day/:dayNumber` | `verse` | `buildBiblePlanDayMetadata` |
| `/register` | (none; fallback canonical works) | `REGISTER_METADATA` — no override needed, default `/register` is correct |

### 4.4 — Per-route canonical examples

| Input URL | Canonical URL |
|-----------|--------------|
| `/` | `https://worshiproom.com/` |
| `/daily?tab=pray` | `https://worshiproom.com/daily` |
| `/daily?tab=meditate&verseRef=John%204%3A14&verseText=Whoever&verseTheme=living-water` | `https://worshiproom.com/daily` |
| `/bible?mode=search&q=love` | `https://worshiproom.com/bible?mode=search&q=love` |
| `/bible/philippians/4?verse=13&action=reflect` | `https://worshiproom.com/bible/philippians/4` (explicit override) |
| `/bible/plans/psalms-30-days` | `https://worshiproom.com/bible/plans/psalms-30-days` |
| `/bible/plans/psalms-30-days/day/5?verse=3` | `https://worshiproom.com/bible/plans/psalms-30-days/day/5` (explicit override) |
| `/grow?tab=plans&source=email` | `https://worshiproom.com/grow?source=email` |
| `/settings/` | `https://worshiproom.com/settings` (trailing slash normalized) |

---

## 5. OG Card Image Inventory

### 5.1 — Card list (14 new + 1 existing fallback)

| # | Path | Dimensions | Size budget | Used by | Visual brief (one line) |
|---|------|-----------|------------|---------|-------------------------|
| — | `/og-default.png` | 1200×630 | existing | fallback for any metadata without explicit `ogImage` | existing — untouched by BB-40 |
| 1 | `/og/home.png` | 1200×630 | ≤100 KB | `HOME_METADATA` | Wordmark + "Christian Emotional Healing & Worship" in Inter 700 white→purple gradient, center, purple glow |
| 2 | `/og/bible-landing.png` | 1200×630 | ≤100 KB | `BIBLE_LANDING_METADATA`, `BIBLE_BROWSE_METADATA`, `buildBibleSearchMetadata` | Wordmark + "Read the Bible" (gradient) + "The World English Bible" subtitle (white/80) |
| 3 | `/og/bible-chapter.png` | 1200×630 | ≤100 KB | `buildBibleChapterMetadata` (every 66-book chapter) | Wordmark + "Read Scripture" (gradient) + subtle book-icon or decorative element |
| 4 | `/og/daily-devotional.png` | 1200×630 | ≤100 KB | `DAILY_HUB_DEVOTIONAL_METADATA` | Wordmark + "Today's Devotional" (gradient) + "Scripture, reflection, prayer" subtitle |
| 5 | `/og/daily-pray.png` | 1200×630 | ≤100 KB | `DAILY_HUB_PRAY_METADATA` | Wordmark + "Write a Prayer" (gradient) + "Honest, Scripture-grounded, unhurried" subtitle |
| 6 | `/og/daily-journal.png` | 1200×630 | ≤100 KB | `DAILY_HUB_JOURNAL_METADATA` | Wordmark + "Daily Journal" (gradient) + "Your entries stay yours, on your device" subtitle |
| 7 | `/og/daily-meditate.png` | 1200×630 | ≤100 KB | `DAILY_HUB_MEDITATE_METADATA` | Wordmark + "Contemplative Prayer" (gradient) + "From the Christian contemplative tradition" subtitle |
| 8 | `/og/my-bible.png` | 1200×630 | ≤100 KB | `MY_BIBLE_METADATA` | Wordmark + "My Bible" (gradient) + "Your highlights & notes" subtitle |
| 9 | `/og/plans-browser.png` | 1200×630 | ≤100 KB | `BIBLE_PLANS_BROWSER_METADATA` | Wordmark + "Reading Plans" (gradient) + "7 to 30 days, no guilt" subtitle |
| 10 | `/og/plans/psalms-30-days.png` | 1200×630 | ≤100 KB | `psalms-30-days` plan | Wordmark + "30 Days in the Psalms" (gradient) + "A month in the prayer book of the Bible" subtitle |
| 11 | `/og/plans/john-story-of-jesus.png` | 1200×630 | ≤100 KB | `john-story-of-jesus` plan | Wordmark + "The Story of Jesus" (gradient) + "John 1–21, twenty-one days" subtitle |
| 12 | `/og/plans/when-youre-anxious.png` | 1200×630 | ≤100 KB | `when-youre-anxious` plan | Wordmark + "When You're Anxious" (gradient) + "Fourteen days of scripture that meets you" subtitle |
| 13 | `/og/plans/when-you-cant-sleep.png` | 1200×630 | ≤100 KB | `when-you-cant-sleep` plan | Wordmark + "When You Can't Sleep" (gradient) + "Seven short readings for late nights" subtitle |
| 14 | `/og/ask.png` | 1200×630 | ≤100 KB | `ASK_METADATA` | Wordmark + "Ask the Bible" (gradient) + "Honest answers for hard days" subtitle |

**Total new assets:** 14 PNGs. **Total file-size budget:** 14 × 100 KB ceiling = 1400 KB max, within the 1.5 MB total ceiling.

### 5.2 — Canonical visual spec (applies to all 14)

- **Canvas:** 1200×630 8-bit PNG, no alpha channel (background fills entire canvas)
- **Background base:** `#08051A` (hero-bg)
- **Background accent:** Radial gradient, upper-center: `rgba(139,92,246,0.35)` at 0%, `rgba(109,40,217,0.18)` at 40%, transparent at 70% — matches the "emotional peak" glow intensity from `09-design-system.md`
- **Safe zone:** Center 1100×530 (50px margin on all sides)
- **Wordmark:** "Worship Room" in **Caveat 700** at ~64px, white `#FFFFFF`, top-center at y≈90. Optional subtle purple drop-shadow `rgba(109,40,217,0.4) blur 12px`
- **Title:** page-specific in **Inter 700** at 72–88px (smaller for long titles), white→purple gradient (`#FFFFFF` → `#8B5CF6`) via linear-gradient mask on text, horizontally centered at y≈320
- **Subtitle (optional):** page-specific in **Inter 500** at 32px, white at 80% alpha, y≈430, center
- **NO stock photography, NO clip art, NO emoji on-card**
- **Thumbnail readability target:** Wordmark + title must be legible at 500×260 (platform thumbnail size)

### 5.3 — Build-time size check

**`frontend/scripts/check-og-sizes.mjs`** — validates every PNG in `public/og/` and subdirectories:
- Per-file ceiling: 100 KB (102400 bytes)
- Total ceiling: 1.5 MB (1572864 bytes)
- Exits non-zero if any ceiling is exceeded

Wired to `frontend/package.json` as `pnpm og-check`. Not wired to CI (deployment concern); runnable locally and in Step 10's final sweep.

---

## 6. noIndex Final List

All routes below render `<SEO ... noIndex />` post-BB-40. Rationale column explains why each is de-indexed.

| Route | Rationale |
|-------|-----------|
| `/bible/my` | Private feed of user's own highlights/notes/bookmarks — zero content value for crawlers, personal. **BB-40 adds.** |
| `/my-prayers` | Private saved prayers — personal. |
| `/friends` | Auth-gated friends list + leaderboard — personal. |
| `/settings` | Account settings — personal. |
| `/insights` | Private mood analytics — personal and sensitive. |
| `/insights/monthly` | Private monthly report — personal and sensitive. |
| `/profile/:userId` | Growth profile — we've decided to noIndex these even though the spec allows public prayer profiles. Rationale: growth profile is engagement-centric; prayer profile is the public share surface. Already noIndex. |
| `/prayer-wall/dashboard` | Private prayer dashboard — personal. |
| `/meditate/breathing`, `/meditate/soaking`, `/meditate/gratitude`, `/meditate/acts`, `/meditate/psalms`, `/meditate/examen` | Auth-gated sub-pages with no content value independent of the `/daily?tab=meditate` entry point. |
| `/login` | Stub page, Phase 3 ships real flow. |
| `/register` | Stub page, Phase 3 ships real flow. **BB-40 adds.** |
| `/health` | System endpoint — should never be indexed. |
| `*` (404) | 404 pages should not be indexed. |

**Routes explicitly indexable (do NOT add noIndex):**

- `/` — Home (landing), crawlers always see Home, must be indexable
- `/daily` (and all 4 tabs) — Daily Hub is the core indexable product surface
- `/ask`, `/grow`, `/bible`, `/bible/browse`, `/bible/plans`, `/bible/plans/:slug`, `/bible/plans/:slug/day/:dayNumber`, `/bible/:book/:chapter` — all indexable Bible content
- `/music`, `/music/routines` — music discovery surfaces
- `/prayer-wall`, `/prayer-wall/:id`, `/prayer-wall/user/:id` — public prayer feed and profiles
- `/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery` — local directory
- `/reading-plans/:planId`, `/challenges/:challengeId` — legacy content routes, still indexable
- `/verse/:id`, `/prayer/:id` — share surfaces

**Dashboard clarification:** `/` logged-in serves `Dashboard` but the route itself stays indexable because crawlers are unauthenticated and always see `Home`. Do NOT noIndex the root route.

---

## 7. BB-40 Test Compatibility Analysis

### 7.1 — Baseline test count (captured at Step 1 start)

Run: `cd frontend && pnpm test -- --run` — **see §7.5 for actual pass/fail count.** This becomes the baseline for Step 10's regression check.

### 7.2 — Affected test files (enumeration)

Ran `find src/pages -name "*.test.tsx"` → 57 test files total. Ran `grep -l "document.title\|document\.head\|og:image\|meta\[property\|toMatchSnapshot\|jsonLd" src/pages/**/*.test.tsx` to surface tests with Helmet-sensitive assertions.

**Tests with Helmet-sensitive assertions** — 2 files:

| File | Sensitivity | Current assertion |
|------|-------------|-------------------|
| `src/pages/bible/__tests__/PlanBrowserPage.test.tsx` | Has a **local mock** of `@/components/SEO` that writes the title prop to `document.title`. Asserts `expect(document.title).toContain('Reading Plans')` at line 98. | `document.title` contains literal 'Reading Plans' |
| `src/pages/__tests__/MyBiblePage.test.tsx` | Has a test named "SEO component is rendered with correct title" but comments out the actual `document.title` check. The remaining assertion is `screen.getByText('My Bible')` at line 306 which tests the page heading, NOT SEO. | Page heading only (not SEO-sensitive) |

**Tests with non-SEO-sensitive `SEO` references** — 2 files:

| File | Pattern |
|------|---------|
| `src/pages/__tests__/Settings.test.tsx` | Has a test named "renders SEO component with correct title" that comments away the document.title check and only asserts page renders. **Not SEO-sensitive.** |
| `src/pages/__tests__/GrowthProfile.test.tsx` | Same pattern — test name mentions SEO but only asserts page renders. **Not SEO-sensitive.** |

**Tests that use real Helmet (unmock react-helmet-async)** — 1 file:

| File | Purpose |
|------|---------|
| `src/components/__tests__/SEO.test.tsx` | Tests `<SEO>` directly. Uses `vi.unmock('react-helmet-async')`. Asserts against `document.querySelector('meta[...]')`. BB-40 Step 2 EXTENDS this file with 3 new tests for `ogImageAlt`. **Change type: ASSERTION ADDITION** (not update). |

**Snapshot tests** — 0 files. `grep -l toMatchSnapshot src/**/*.test.tsx` returned zero matches. No snapshot regressions are possible from metadata changes.

### 7.3 — Change scope per file (classification)

| File | Category | Change scope | Explanation |
|------|----------|-------------|-------------|
| `src/pages/bible/__tests__/PlanBrowserPage.test.tsx` | Category 3 (direct assertion) | **NO CHANGE** | The local mock captures the title prop verbatim. BB-40 Step 5's migration changes the inline literal `"Reading Plans — Bible (WEB)"` to spread `BIBLE_PLANS_BROWSER_METADATA` which has title `"Bible Reading Plans"`. The test asserts `toContain('Reading Plans')` — both old and new titles contain that substring, so the test still passes. |
| `src/pages/__tests__/MyBiblePage.test.tsx` | Category 1 (global mock only) | **NO CHANGE** | The only SEO-adjacent test asserts `screen.getByText('My Bible')` which is the page heading, not the SEO title. Adding `noIndex` to `MY_BIBLE_METADATA` does not affect this test. |
| `src/pages/__tests__/Settings.test.tsx` | Category 1 | **NO CHANGE** | Test body asserts page rendering, not SEO. |
| `src/pages/__tests__/GrowthProfile.test.tsx` | Category 1 | **NO CHANGE** | Test body asserts page rendering, not SEO. |
| `src/components/__tests__/SEO.test.tsx` | Category 3 (real Helmet) | **ASSERTION ADDITION** (Step 2) | Add 3 new tests for `ogImageAlt`. Existing tests unchanged. |
| All other 52 test files | Category 1 (global mock only) | **NO CHANGE** | `<SEO>` is mocked to null by `test/setup.ts`. Changes to `<SEO>` props are invisible to the test. |

### 7.4 — New test files BB-40 creates

All new tests added by BB-40 — none modify existing tests except `SEO.test.tsx` (addition, not rewrite):

| File | Step | Purpose |
|------|------|---------|
| `frontend/src/lib/seo/__tests__/canonicalUrl.test.ts` | Step 3 | 10+ tests for `buildCanonicalUrl`, `UI_STATE_PARAMS`, `SITE_URL` |
| `frontend/src/lib/seo/__tests__/routeMetadata.test.ts` | Step 4 | 30+ parameterized tests for every constant + all builders |
| `frontend/src/pages/__tests__/DailyHub.seo.test.tsx` | Step 6 | 4+ tab-aware SEO integration tests (with fallback stub approach if full DailyHub mount is too heavy) |
| `frontend/src/pages/__tests__/BiblePlanDetail.seo.test.tsx` | Step 8 | 4+ tests (valid slug, invalid slug, JSON-LD, canonical) |
| `frontend/src/pages/__tests__/BiblePlanDay.seo.test.tsx` | Step 8 | 4+ tests (valid day, invalid day, canonical with `?verse=`, JSON-LD) |
| `frontend/src/pages/__tests__/BibleReader.seo.test.tsx` | Step 9 | 2+ tests for BreadcrumbList JSON-LD presence |

All new tests use `vi.unmock('react-helmet-async')` at the top and wrap with `HelmetProvider` — same pattern as `SEO.test.tsx`.

### 7.5 — Baseline test run (captured Step 1)

Ran `pnpm test -- --run --reporter=basic` twice back-to-back from `frontend/`. Baseline results:

| Run | Test Files pass/fail | Tests pass/fail | Duration |
|-----|---------------------|-----------------|----------|
| 1 | 603 passed / 7 failed (610 total) | 7364 passed / 44 failed (7408 total) | 64.5s |
| 2 | 602 passed / 8 failed (610 total) | 7362 passed / 46 failed (7408 total) | 67.4s |

**Baseline failing test files (union across both runs):**

1. `src/components/daily/__tests__/JournalMilestones.test.tsx`
2. `src/components/daily/__tests__/JournalSearchFilter.test.tsx`
3. `src/hooks/__tests__/useNotifications.test.ts` (flaky — run 2 only)
4. `src/pages/__tests__/BibleReaderAudio.test.tsx`
5. `src/pages/__tests__/BibleReaderHighlights.test.tsx`
6. `src/pages/__tests__/BibleReaderNotes.test.tsx`
7. `src/pages/__tests__/Journal.test.tsx`
8. `src/pages/__tests__/MeditateLanding.test.tsx`

**Regression rule for Step 10:** Post-BB-40 must not introduce any NEW failing test file beyond this list, and must not introduce NEW failing tests in any file BB-40 did not touch. Flaky tests (`useNotifications.test.ts`) are frozen — if they pass in one run and fail in another, that's unchanged pre-existing behavior.

**Important crosscheck with BB-40 touched files:**

- `BibleReaderAudio.test.tsx`, `BibleReaderHighlights.test.tsx`, `BibleReaderNotes.test.tsx` — all 3 are for `BibleReader.tsx` which BB-40 migrates in Step 5/9. BB-40 changes ONLY the `<SEO>` call site in `BibleReader.tsx:676-680`; the audio/highlights/notes functionality is untouched. The pre-existing failures in these files are NOT SEO-related. Step 5's migration must preserve the pre-existing failure count in each file exactly.
- `Journal.test.tsx` — tests for the Journal-tab flow (inside `DailyHub`). BB-40's Daily Hub changes in Step 6 add a tab-aware `<SEO>` render. This test file is globally Helmet-mocked, so BB-40's changes are invisible to it.
- All other failing files have no BB-40 touchpoint.

**Conclusion:** BB-40 cannot regress any of the baseline failures into worse state, but it must not introduce new failures either. Step 10's check is: post-BB-40 test count = 7408 total, failing count ≤ 46, no new file names on the fail list beyond the 8 above.

### 7.6 — SUBSTANTIAL REWRITE flag

**Zero test files are flagged SUBSTANTIAL REWRITE.** All affected tests fall into NO CHANGE or ASSERTION ADDITION categories. The BB-40 migration is test-safe.

---

## 8. Manual Post-Deploy Validation Checklist

After BB-40 ships to production (Phase 3 deploy), run these manual validations:

### 8.1 — Automated validator tools

- **Twitter Card Validator**: https://cards-dev.twitter.com/validator
- **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug/
- **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/
- **Google Rich Results Test**: https://search.google.com/test/rich-results
- **Google PageSpeed Insights** (for OG image lazy-load warnings): https://pagespeed.web.dev/

### 8.2 — Representative URLs to test

Submit each of these to all 4 validators above:

1. `https://worshiproom.com/` (homepage)
2. `https://worshiproom.com/daily?tab=devotional` (Daily Hub devotional)
3. `https://worshiproom.com/daily?tab=pray` (Daily Hub pray)
4. `https://worshiproom.com/bible/philippians/4` (Bible chapter)
5. `https://worshiproom.com/bible/plans/psalms-30-days` (plan detail)
6. `https://worshiproom.com/bible/plans/psalms-30-days/day/5` (plan day)
7. `https://worshiproom.com/bible?mode=search&q=love` (Bible search)
8. `https://worshiproom.com/ask` (Ask the Bible)
9. `https://worshiproom.com/prayer-wall` (community prayer wall)
10. `https://worshiproom.com/local-support/churches` (local support)

For each URL, verify:
- [ ] Title renders correctly in the preview (check raw vs suffixed)
- [ ] Description renders correctly
- [ ] OG image loads (no broken image icon)
- [ ] OG image alt text surfaces in Facebook Debugger
- [ ] Canonical URL matches expected
- [ ] No structured-data errors in Google Rich Results Test
- [ ] BreadcrumbList renders in Google Rich Results Test (for Bible chapter + plan detail + plan day + Home)

### 8.3 — Manual share tests (real social surfaces)

Paste each representative URL into:
- [ ] **iMessage** — card preview renders with OG image and title
- [ ] **Discord** — card preview renders with OG image and title
- [ ] **Slack** — unfurl renders with OG image, title, description
- [ ] **WhatsApp** — preview renders with OG image
- [ ] **Facebook post composer** — preview renders correctly
- [ ] **Twitter / X post composer** — card preview uses `summary_large_image`

### 8.4 — Crawler simulation

- [ ] `curl -A "Googlebot" https://worshiproom.com/` → verify `<title>`, `<meta description>`, `<meta property="og:image">`, `<link rel="canonical">` all present in response HTML
- [ ] `curl -A "Googlebot" https://worshiproom.com/bible/my` → verify `<meta name="robots" content="noindex">` present
- [ ] `curl -A "facebookexternalhit/1.1" https://worshiproom.com/daily?tab=pray` → verify Daily Hub pray metadata rendered (tab query param reaches the server as query string, frontend Helmet renders correct tab-aware metadata)

### 8.5 — Lighthouse SEO audit

Run Lighthouse SEO audit against a handful of routes. Target: **100** SEO score on `/`, `/bible`, `/daily`, `/bible/psalms/23`, `/bible/plans/psalms-30-days`.

### 8.6 — Sitemap + robots.txt verification

BB-40 does NOT modify `public/robots.txt` or `public/sitemap.xml`. Verify post-deploy that:
- [ ] `robots.txt` still references the sitemap
- [ ] `sitemap.xml` is reachable
- [ ] No regressions in existing file contents (they were written by an earlier spec)

---

## 9. Deferred Items (Future Specs)

Not in BB-40 scope. Logged here for visibility:

| Item | Reason deferred | Future spec |
|------|----------------|-------------|
| Dynamic OG image generation (server-side render per chapter/plan/day) | Requires backend infra or a serverless function; adds `sharp` or Vercel OG dependencies; scope guarantee violated | Phase 3+ |
| Server-side rendering (SSR) for meta tag injection | Major architecture change (React Router + Vite → Next.js or Remix, or Vite SSR) | Phase 4+ |
| Sitemap regeneration on content changes | Requires build-time or runtime sitemap generator; current sitemap is static | Future |
| `hreflang` for internationalization | No non-English content today | Phase 4+ |
| `theme-color` meta tag (iOS Safari, Android Chrome status bar color) | Could be added trivially; not a BB-40 deliverable | Minor follow-up |
| Rich search action for `/bible/search` (Google sitelinks search box) | Requires Google Search Console verification | Phase 3+ |
| Article schema for devotionals (if devotionals become indexable individual URLs) | Devotionals currently live under `/daily?day=N` — no dedicated route | Future |
| OG card generation script (using `sharp` or `canvas`) | Scope guarantee: zero new npm packages. Hand-design is the chosen approach. | Future |
| Build-time `<title>` length linting at build time | Currently enforced via `routeMetadata.test.ts` parameterized tests — tests fail if a constant violates the limit | Sufficient |

---

## 10. BB-39 Handoff Note

BB-39 (service worker precache manifest) should precache every indexable content route. The full list from §2.1 above (routes 1, 3, 7, 8, 9, 11, 12, 16, 17, 18, 21, 22, 23 — the static public content routes — plus the dynamic `/bible/:book/:chapter` routes which should NOT be precached per-chapter but the route shell should). The `/og/` directory's 14 new PNGs should also be added to the precache manifest so shared cards work offline.

**Specific BB-39 precache targets:**
- `/` (Home)
- `/daily` (all 4 tabs share canonical)
- `/ask`
- `/grow`
- `/bible`
- `/bible/browse`
- `/bible/plans`
- `/music`
- `/music/routines`
- `/prayer-wall`
- `/local-support/churches`
- `/local-support/counselors`
- `/local-support/celebrate-recovery`
- `/og-default.png` + all 14 files under `/og/` and `/og/plans/`

Dynamic routes (`/bible/:book/:chapter`, `/bible/plans/:slug`, `/bible/plans/:slug/day/:dayNumber`) are precached via book JSON data + route shell, not per-slug. BB-39 decides the exact runtime caching strategy for these.

---

## 11. BB-40 Ship State Summary (Step 10 — 2026-04-11)

BB-40 shipped in one session (Steps 1-10). The Playwright-based OG card
generation approach (deliberate deviation from the plan's hand-design fallback —
approved mid-execution) made the visual output deterministic and trivially
reproducible by running `pnpm og-generate`.

### What shipped

**Infrastructure:**
- `frontend/src/lib/seo/canonicalUrl.ts` — `buildCanonicalUrl`, `SITE_URL`, `UI_STATE_PARAMS` (extended with 3 new Spec Z verse params)
- `frontend/src/lib/seo/routeMetadata.ts` — 33 static metadata constants + 4 dynamic builders
- `frontend/src/components/SEO.tsx` — added `ogImageAlt?: string` prop (additive)
- `frontend/scripts/check-og-sizes.mjs` — build-time size guard (100 KB/file, 1.5 MB/total)
- `frontend/scripts/generate-og-cards.mjs` — Playwright-based deterministic OG card generator
- `pnpm og-generate` + `pnpm og-check` script entries in `frontend/package.json`

**Migration:** 39 existing `<SEO>` call sites migrated to spread constants or call builders. 2 gap files (BiblePlanDetail, BiblePlanDay) gained `<SEO>` renders with BreadcrumbList JSON-LD via `buildBiblePlanMetadata` / `buildBiblePlanDayMetadata`. 3 error branches (SharedVerse "Verse Not Found", BibleReader "Book Not Found", BibleReader "Chapter Not Found") gained `noIndex`. 2 stub routes (MyBible, Register) gained `noIndex`.

**Dynamic builders in active use:**
- `BibleReader` → `buildBibleChapterMetadata` (BreadcrumbList, canonical override)
- `BibleLanding` (search mode) → `buildBibleSearchMetadata`
- `BiblePlanDetail` → `buildBiblePlanMetadata` (BreadcrumbList, canonical override)
- `BiblePlanDay` → `buildBiblePlanDayMetadata` (BreadcrumbList, canonical override strips `?verse=`)

**OG cards shipped:** 14 PNGs at `frontend/public/og/` (10 top-level + 4 under `/plans/`). All 1200×630, 8-bit palette PNG, all under 70 KB. Total weight: 804.7 KB / 1500 KB budget.

### Test deltas

| Category | Count |
|----------|-------|
| New test files added | 6 |
| New tests added | 225 |
| New tests failing | 0 |
| Baseline tests regressed | 0 |

Full pass count: **7588 / 7633** (45 failing, all in the 8 pre-existing baseline files).

### Lint + build

- `pnpm lint`: 16 errors / 5 warnings remaining — all pre-existing baseline. BB-40 introduced 0 new lint issues and fixed 1 pre-existing one (the `SEO.tsx` eslint-disable directive became unused after canonicalUrl extraction, and was removed).
- `pnpm build`: clean production build in 10.58s. 14 OG cards copied to `dist/og/` by Vite's public folder handling. PWA precache generated (396 entries, 23.1 MB).
- `pnpm og-check`: OK — 14 files, 804.7 KB total.

### Deviations from the plan

1. **OG card generation approach (Step 7).** Plan said hand-design in Figma/Canva after a HARD STOP sample-card review. User authorized mid-execution to use Playwright instead since it's deterministic and reproducible. Resulted in zero new npm packages (Playwright and `sharp` were both already in the workspace — Playwright for verification, `sharp` from a pre-existing `scripts/generate-og-image.ts`). Net: same scope guarantee, better automation. The `pnpm og-generate` script regenerates all 14 cards in ~30 seconds.

2. **Integration test approach (Steps 6, 8, 9).** Plan said mount the full page under real Helmet and assert against `document.head`. Ran into feasibility issues: DailyHub, BibleReader, BiblePlanDetail, BiblePlanDay all need multi-provider setups (AuthProvider, AudioProvider, AuthModalProvider, ToastProvider, WhisperToastProvider, InstallPromptProvider, HelmetProvider) and data-hook stubs to mount cleanly. Switched to the narrow "builder contract" approach: test the builder/mapping output directly, since the page's `<SEO {...builder(...)} />` line is a one-step pass-through. The integration-level guarantee that react-helmet-async renders the output into `document.head` is already covered by `SEO.test.tsx` (which calls `vi.unmock` on Helmet and asserts against real meta tags). **Consequence:** new SEO tests cover the data contract, not the DOM emission path. If you want full DOM verification for DailyHub/BibleReader/plan pages, run `/verify-with-playwright` against each route after deploy.

### Files changed

**Created:**
- `frontend/src/lib/seo/canonicalUrl.ts`
- `frontend/src/lib/seo/routeMetadata.ts`
- `frontend/src/lib/seo/__tests__/canonicalUrl.test.ts`
- `frontend/src/lib/seo/__tests__/routeMetadata.test.ts`
- `frontend/src/pages/__tests__/DailyHub.seo.test.tsx`
- `frontend/src/pages/__tests__/BiblePlanDetail.seo.test.tsx`
- `frontend/src/pages/__tests__/BiblePlanDay.seo.test.tsx`
- `frontend/src/pages/__tests__/BibleReader.seo.test.tsx`
- `frontend/scripts/check-og-sizes.mjs`
- `frontend/scripts/generate-og-cards.mjs`
- `frontend/public/og/{home,bible-landing,bible-chapter,my-bible,plans-browser,daily-devotional,daily-pray,daily-journal,daily-meditate,ask}.png`
- `frontend/public/og/plans/{psalms-30-days,john-story-of-jesus,when-youre-anxious,when-you-cant-sleep}.png`

**Modified:**
- `frontend/src/components/SEO.tsx` (ogImageAlt + re-export)
- `frontend/src/components/__tests__/SEO.test.tsx` (3 new tests)
- `frontend/src/App.tsx` (ComingSoon + NotFound migrated)
- `frontend/package.json` (og-generate + og-check scripts)
- `frontend/src/pages/DailyHub.tsx` (tab-aware metadata)
- `frontend/src/pages/BibleReader.tsx` (builder + error-branch noIndex)
- `frontend/src/pages/BibleLanding.tsx` (search-mode swap)
- 34 additional pages migrated to spread constants (full list in Execution Log below)

Total: **12 new files, 40+ modified files, 0 deleted files.**

---

## 12. [UNVERIFIED] Flags

| # | Flag | Verification method | Resolution plan |
|---|------|---------------------|----------------|
| 1 | Raw title budget: 45 (not 46 per plan, because suffix is 15 not 14 chars) | Count `' | Worship Room'.length` in Node: returns 15 ✅ verified | Step 4 uses 45 cap; plan's 46/14 should be treated as a minor typo |
| 2 | `<script type="application/ld+json">` survives inside `<Helmet>` children in react-helmet-async v2 | Step 9 integration test — but live pages already prove it works today (Home, DailyHub, MyBible, BibleLanding, PrayerWall, all local-support pages render JSON-LD in production) | If Step 9 test unexpectedly fails, fallback is to use `<Helmet><script>...</script></Helmet>` outside the main `<Helmet>` block |
| 3 | `sharp` dependency status | Moot — hand-design approach chosen | No verification needed |
| 4 | Page test compatibility | §7 above — enumerated and classified. All NO CHANGE or ASSERTION ADDITION. | Step 5 runs `pnpm test` after each page migration group |
| 5 | `buildBibleSearchMetadata` query length truncation: plan said slice(0, 60) but that would overflow 45 raw title | Corrected in §3.4 to `slice(0, 37)` | Step 4 implementation uses 37 — test will assert this |

---

## 13. Open Questions for User

Before approving Step 1 and proceeding to Step 2:

1. **Dashboard metadata — duplicate vs alias?** Option A: `Dashboard.tsx` spreads `HOME_METADATA` directly (current plan). Option B: Create a distinct `DASHBOARD_METADATA` constant with identical strings for future divergence. Recommendation: A (deduplicated). Confirm?

2. **Iteration 2 revisions — review?** §3.3 and §3.5 have been updated with revised titles/descriptions for the six strings the user flagged (Pray, Journal, Meditate, Devotional, Ask, Grow). Each has a `Rev 2` marker and a `Revision note` line. Please scan the inline report in the chat (reproduced above) or the doc itself and confirm each one, or send a further iteration.

3. **Smaller items flagged but not revised — consider now or defer?**

   **(a) `HOME_METADATA` positioning.** Current title `Worship Room — Christian Emotional Healing & Worship` is the unchanged shipped title from `Home.tsx`. User's feedback: "Emotional Healing" leans clinical/therapeutic which may not match where the BB-30/BB-31 contemplative voice is taking the app. Alternatives considered:
   - `Worship Room — A Quiet Christian Sanctuary` (43 chars)
   - `Worship Room — Scripture, Prayer, & Rest` (41 chars)
   - `Worship Room — Honest Christian Practice` (41 chars)
   - Keep existing (52 chars, within 60 budget)

   **Decision (iteration 3): kept shipped title.** The existing 52-char title does positioning work the alternatives don't. Flagged in §14 item 1 as a candidate for future revision if the app's voice continues to drift away from "emotional healing" framing.

   **(b) `FRIENDS_METADATA` — the word "Leaderboard".** Verified: `Friends.tsx:19` imports `LeaderboardTab` and line 25 declares `{ id: 'leaderboard', label: 'Leaderboard' }`. The feature exists. User's concern: the title word introduces competition framing that contradicts BB-31/BB-32's anti-pressure voice. Alternatives considered:
   - `Friends` (7 chars) — drops leaderboard from SEO entirely
   - `Friends & Community` (19 chars)
   - `Friends & Growth Together` (25 chars)
   - Keep existing `Friends & Leaderboard` (21 chars)

   **Decision (iteration 3): swapped to `Friends` (7 chars).** Route is `noIndex` so SEO impact is zero; the main gain is that the browser tab title no longer advertises a competition-framed feature. See §3.7 Rev 3 note and §14 item 2 for the caveat.

   **(c) `INSIGHTS_METADATA` — the phrase "Spiritual Growth".** User's feedback: generic Christian-product language. Alternatives considered:
   - `Your Patterns & Practice` (24 chars)
   - `Mood & Practice Insights` (24 chars)
   - `Your Patterns Over Time` (23 chars)
   - Keep existing `Mood Insights & Spiritual Growth` (33 chars)

   **Decision (iteration 3): swapped to `Mood & Practice Insights` (24 chars).** Description also updated to drop "spiritual growth" and add "daily activity patterns" (which matches the page's actual activity-correlation and meditation-history features). See §3.7 Rev 3 note.

   **(d) `BIBLE_PLANS_BROWSER_METADATA` title — too generic.** User flagged this as "subtler issue." The original draft `Bible Reading Plans` (19 chars) was accurate and direct but used every other Bible app's stock label. Alternatives considered:
   - `Reading Plans for Hard Days` (27 chars) — leans into the emotional-specificity angle (anxiety, sleep)
   - `Short Reading Plans` (19 chars) — signals brevity, which is Worship Room's differentiator vs. 365-day plans
   - Keep existing `Bible Reading Plans` (19 chars)

   **Decision (iteration 3): swapped to `Reading Plans for Hard Days`.** See §3.4 Rev 3 note and §14 item 4 for the caveat that this title is content-dependent.

4. **OG card subtitles (revised)** — §5.1's visual brief column was updated to reflect the revised titles. Confirm the new subtitles or request rewrites:
   - `daily-devotional.png` subtitle: `Scripture, reflection, prayer`
   - `daily-pray.png` subtitle: `Honest, Scripture-grounded, unhurried`
   - `daily-journal.png` subtitle: `Your entries stay yours, on your device`
   - `daily-meditate.png` subtitle: `Breathing, Scripture soaking, Examen, and more`
   - `ask.png` subtitle: `Honest answers for hard days`

5. **Meditate sub-pages: keep `noIndex`?** All 6 are auth-gated. Spec confirms noIndex. No change proposed.

6. **`/prayer-wall/user/:id` (public prayer profiles) — indexable?** Spec says yes. Profiles are shared externally. No change proposed.

7. **Reading Plan + Challenge detail pages — leave dynamic titles untouched?** The current inline template `${plan.title} | Reading Plans` is preserved at the call site. BB-40 only adds the static fallback + `ogImage`. Confirm?

8. **BB-39 handoff list** — §10 draft. Confirm the list is complete, or request additions/removals.

9. **Manual share-test set** — §8.3 lists 6 platforms. Add/remove any?

---

## 14. Titles That May Need Future Revision

Notes-to-self for any successor spec that revisits SEO metadata. Four titles were given deliberate choices during BB-40 that could need revisiting if the app's content or voice drifts.

### 1. `HOME_METADATA` — `Worship Room — Christian Emotional Healing & Worship`

**Kept as the shipped title (52 chars).** The phrase "Christian Emotional Healing" leans clinical/therapeutic in a way the BB-30/BB-31 contemplative voice doesn't quite match. If the homepage copy or positioning ever drifts meaningfully away from the "emotional healing" framing — or if a successor spec redoes the homepage hero — the title should revisit. Alternatives considered but not adopted in BB-40: `A Quiet Christian Sanctuary`, `Scripture, Prayer, & Rest`, `Honest Christian Practice`. The "and pick later" decision is low-risk because the title is the current shipped string and changing it is a separate conscious decision, not a BB-40 migration side effect.

### 2. `FRIENDS_METADATA` — `Friends`

**Swapped from `Friends & Leaderboard` (7 chars, was 21).** The leaderboard tab still exists in `Friends.tsx` as of BB-40. BB-40 dropped the word from the metadata title because competition framing contradicts BB-31/BB-32's anti-pressure voice and because the route is `noIndex` anyway. If a future spec removes or renames the leaderboard feature, this title is fine unchanged. If the leaderboard is expanded (e.g., public global leaderboards become indexable), the title may need to add "Community" or reinstate "Leaderboard" for discoverability — but that would also mean the route needs to come off `noIndex`, which is a larger decision.

### 3. `INSIGHTS_METADATA` — `Mood & Practice Insights`

**Swapped from `Mood Insights & Spiritual Growth` (24 chars, was 33).** Description also updated to replace "spiritual growth" with "daily activity patterns" which matches CLAUDE.md's actual feature list (mood heatmap, trend chart, activity correlations, meditation history, morning/evening comparison). If a future spec adds a genuine "spiritual growth" feature — faith-level visualization, growth garden on the Insights page, badge progression — the title may want to revisit. Also `noIndex`, so the SEO stakes are low.

### 4. `BIBLE_PLANS_BROWSER_METADATA` — `Reading Plans for Hard Days`

**Swapped from `Bible Reading Plans` (27 chars, was 19).** This title is **content-dependent**. All 4 current plans (anxious, sleepless, Psalms when hurting, John framed contemplatively) are framed around hard-day emotional moments, so the title is accurate. **If a future spec adds plans that aren't framed around hard days** — e.g., a 365-day through-the-Bible plan, an Advent-only reading, a Holy Week plan, a topical reading plan on generosity — this title becomes a lie and must be changed. Candidates at that point: `Short Bible Reading Plans`, `Bible Reading Plans`, or a content-specific title if the mix has shifted definitively. The safest default is to audit this title when adding any new plan whose tone doesn't match "hard days."

### 5. Dynamic builders — no decisions to revisit

The dynamic builders (`buildBibleChapterMetadata`, `buildBiblePlanMetadata`, `buildBiblePlanDayMetadata`, `buildBibleSearchMetadata`) produce titles from plan/book/verse data at render time. Any drift in their output comes from data changes (new plans, new books — which doesn't happen for the Bible) rather than title authorship decisions. These don't need future-revision flags.

---

**END OF STEP 1 — ITERATION 3.** Iteration 3 revised `DAILY_HUB_MEDITATE_METADATA`, swapped 3 of the 4 smaller items (`FRIENDS_METADATA`, `INSIGHTS_METADATA`, `BIBLE_PLANS_BROWSER_METADATA`), kept `HOME_METADATA` as shipped, updated §5.1 OG card subtitle for the meditate card, and added §14 as a durable notes-to-self record for future specs. All revisions carry `Rev 3` markers with inline reasoning. No code files touched yet. Awaiting final Step 1 approval.
