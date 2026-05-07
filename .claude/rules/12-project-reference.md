# Worship Room — Project Reference

**Purpose:** Stable reference data for the application — route inventory and content counts. Moved out of `CLAUDE.md` to keep that file lean. Read this when you need to know what routes exist, where they live, or how much content of a given type ships with the app.

This file is descriptive, not prescriptive — nothing here is a rule. For rules and conventions see the numbered rule files `01-` through `11-`.

---

## Routes

### Query-param deep links (Spec 7 — Visual Rollout)

`/?auth=login` and `/?auth=register` open the AuthModal in the corresponding mode on top of `/`. The legacy `/login` direct route redirects to `/?auth=login` for back-compat (`/register` continues to render `RegisterPage` directly). Implementation lives in `AuthQueryParamHandler` inside `App.tsx`. Documented in `02-security.md` § "Auth Gating Strategy" → "Query-param-driven AuthModal (Spec 7)".

### Public Routes (No Authentication Required)

| Route                                                         | Component                  | Description                                                                                                                       |
| ------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                           | `Home` / `Dashboard`       | Landing (logged-out) / Dashboard (logged-in)                                                                                      |
| `/daily`                                                      | `DailyHub`                 | Tabbed: Devotional \| Pray \| Journal \| Meditate                                                                                 |
| `/pray`, `/journal`, `/meditate`, `/scripture`, `/devotional` | Redirects → `/daily?tab=*` | Legacy redirects                                                                                                                  |
| `/meditate/breathing`                                         | `BreathingExercise`        | 4-7-8 breathing (consumes verse params from Spec Z)                                                                               |
| `/meditate/soaking`                                           | `ScriptureSoaking`         | Verse contemplation (consumes verse params from Spec Z)                                                                           |
| `/meditate/gratitude`                                         | `GratitudeReflection`      | Gratitude journaling                                                                                                              |
| `/meditate/acts`                                              | `ActsPrayerWalk`           | ACTS framework                                                                                                                    |
| `/meditate/psalms`                                            | `PsalmReading`             | Psalm reading                                                                                                                     |
| `/meditate/examen`                                            | `ExamenReflection`         | Ignatian Examen                                                                                                                   |
| `/verse/:id`                                                  | `SharedVerse`              | Shareable verse card                                                                                                              |
| `/prayer/:id`                                                 | `SharedPrayer`             | Shareable prayer card                                                                                                             |
| `/prayer-wall`                                                | `PrayerWall`               | Community prayer feed with QOTD                                                                                                   |
| `/prayer-wall/:id`                                            | `PrayerDetail`             | Prayer detail page                                                                                                                |
| `/prayer-wall/user/:id`                                       | `PrayerWallProfile`        | Public prayer profile                                                                                                             |
| `/prayer-wall/dashboard`                                      | `PrayerWallDashboard`      | Private prayer dashboard                                                                                                          |
| `/local-support/churches`                                     | `Churches`                 | Church locator (no auth for search)                                                                                               |
| `/local-support/counselors`                                   | `Counselors`               | Counselor locator                                                                                                                 |
| `/local-support/celebrate-recovery`                           | `CelebrateRecovery`        | CR locator                                                                                                                        |
| `/music`                                                      | `MusicPage`                | 3-tab music hub                                                                                                                   |
| `/music/routines`                                             | `RoutinesPage`             | Bedtime routines (4 templates)                                                                                                    |
| `/bible`                                                      | `BibleBrowser`             | 66-book Bible browser with BB-42 full-text search                                                                                 |
| `/bible/:book/:chapter`                                       | `BibleReader`              | Chapter reading with audio, highlights, notes, AI Explain/Reflect, focus mode, theme switching                                    |
| `/bible/my`                                                   | `MyBible`                  | Personal layer feed: BB-43 heatmap and progress map, BB-45 memorization deck, highlights/notes/bookmarks/journal entries activity |
| `/ask`                                                        | `AskPage`                  | AI Bible chat with follow-ups                                                                                                     |
| `/grow`                                                       | `GrowPage`                 | Tabbed: Reading Plans \| Challenges                                                                                               |
| `/reading-plans`, `/challenges`                               | Redirects → `/grow?tab=*`  | Legacy redirects                                                                                                                  |
| `/reading-plans/:planId`                                      | `ReadingPlanDetail`        | Plan detail with daily progress                                                                                                   |
| `/challenges/:challengeId`                                    | `ChallengeDetail`          | Challenge daily content + progress                                                                                                |
| `/accessibility`                                              | `AccessibilityPage`        | BB-35 accessibility statement                                                                                                     |
| `/community-guidelines`                                       | `CommunityGuidelines`      | **Deferred** — markdown content shipped at `content/community-guidelines.md`; page component + route pending Spec 1.10m completion (per 2026-04-28 audit note in `spec-tracker.md`)         |
| `/login`                                                      | Redirect → `/?auth=login`  | Spec 7 (Visual Rollout) redirect to query-param-driven AuthModal                                                                  |
| `/register`                                                   | `RegisterPage`             | Registration page (UI shell, backend in Phase 3)                                                                                  |
| `/health`                                                     | `Health`                   | Backend health check                                                                                                              |
| `/dev/mood-checkin`                                           | `MoodCheckInPreview`       | Dev-only mood check-in preview                                                                                                    |
| `*`                                                           | `NotFound`                 | 404 page                                                                                                                          |

### Protected Routes (Requires Authentication)

| Route               | Component       | Description                                                          |
| ------------------- | --------------- | -------------------------------------------------------------------- |
| `/`                 | `Dashboard`     | Dashboard with garden, widgets, onboarding                           |
| `/insights`         | `Insights`      | Mood analytics + meditation history + correlations                   |
| `/insights/monthly` | `MonthlyReport` | Monthly mood report                                                  |
| `/friends`          | `Friends`       | Friends + Leaderboard tabs                                           |
| `/profile/:userId`  | `GrowthProfile` | Growth profile with garden                                           |
| `/settings`         | `Settings`      | User settings (4 sections, including BB-41 notification preferences) |
| `/my-prayers`       | `MyPrayers`     | Personal prayer list                                                 |

**Forums Wave will add:** `/u/:username` unified profile (Phase 8), `/forgot-password` and `/reset-password` (Spec 1.5b — deferred until SMTP wired), `/admin/audit-log` (Spec 10.10b), `/settings/sessions` (Spec 1.5g — deferred until SMTP wired), `/community-guidelines` (Spec 1.10m — markdown content shipped at `content/community-guidelines.md`; page component + route pending). Also 301 redirects from `/profile/:userId` and `/prayer-wall/user/:id` to `/u/:username`. See `_forums_master_plan/round3-master-plan.md`.

---

## Content Inventory (Verified)

All counts programmatically verified via `_recon/agent-6-count-scripts.ts`. Re-verify with that script before relying on a specific number for planning.

| Content Type           | Count                           | Notes                                                             |
| ---------------------- | ------------------------------- | ----------------------------------------------------------------- |
| Bible Books (JSON)     | 66                              | Full WEB Bible, lazy-loaded per book                              |
| Devotionals            | 50 (30 general + 20 seasonal)   | 5 Advent, 5 Lent, 3 Easter, 3 Christmas, 2 Holy Week, 2 Pentecost |
| Reading Plans          | 10 (119 total days)             | 7/14/21-day plans                                                 |
| Ambient Sounds         | 24                              | Plus 3 Bible reading scenes                                       |
| Scene Presets          | 11                              |                                                                   |
| Scripture Readings     | 24 (4 collections × 6)          |                                                                   |
| Bedtime Stories        | 12                              |                                                                   |
| Verse of the Day       | 60 (40 general + 20 seasonal)   |                                                                   |
| QOTD                   | 72 (60 general + 12 liturgical) |                                                                   |
| Community Challenges   | 5 (110 total days)              | Lent 40d, Easter 7d, Pentecost 21d, Advent 21d, New Year 21d      |
| Guided Prayer Sessions | 8                               | 5/10/15 min options                                               |
| Spotify Playlists      | 8 (4 worship + 4 explore)       |                                                                   |
| Routine Templates      | 4                               |                                                                   |
| Song of the Day        | 30 entries, 14 unique tracks    |                                                                   |
| Badges                 | ~45                             | Across 6 categories                                               |

**Translation consistency:** All scripture uses WEB. Zero non-WEB references in the codebase as of the last Bible wave audit.

---

## See Also

- `CLAUDE.md` — top-level project orientation (points here for detail)
- `.claude/rules/10-ux-flows.md` — user flow documentation (not the route table)
- `.claude/rules/09-design-system.md` — visual patterns, component inventory
- `.claude/rules/11-local-storage-keys.md` — canonical storage key inventory
- `_forums_master_plan/round3-master-plan.md` — Forums Wave spec catalog (adds routes per phase)
