# Forums Wave Spec Tracker

**Total: 156 specs | 19 phases | Execution: sequential within each phase**

**v2.8 additions (2026-04-22):** 18 new specs closed functional gaps surfaced during pre-execution completeness review — 13 in Phase 1 (auth lifecycle + production hardening), 2 in Phase 2.5 (block/mute), 1 in Phase 10 (admin audit viewer), 2 in Phase 16 (offline banner + error boundaries). See master plan v2.8 changelog + new Appendix E for spec details.

**v2.9 execution reality (2026-04-23):** Specs 1.1–1.8 have shipped, and authoring Spec 1.9b's brief surfaced divergences from the original spec bodies (test infrastructure shape, Liquibase timestamp handling, BCrypt seeding pattern, components/ui/ vs components/common/, 1.9b-before-1.9 ordering, AuthModal timezone re-home from 1.5 to 1.9). **Trust the master plan's "Phase 1 Execution Reality Addendum" (right after "How to Use This Document") over any older spec body text for Specs 1.1–1.9b.** The tracker below is the canonical ✅/⬜ status; Eric updates it manually after each spec ships.

Specs execute in phase order (0 → 0.5 → 1 → 2 → 2.5 → 3 → ... → 16).
Within each phase, specs are sequential — each spec's prerequisites are the specs before it.

---

## Phase 0 — Learning (1 spec)

| #   | Spec | Title                                | Size | Risk | Status |
| --- | ---- | ------------------------------------ | ---- | ---- | ------ |
| 1   | 0.1  | Backend Foundation Learning Document | L    | Low  | ✅     |

## Phase 0.5 — Quick Win (1 spec)

| #   | Spec | Title                                          | Size | Risk | Status |
| --- | ---- | ---------------------------------------------- | ---- | ---- | ------ |
| 2   | 0.5  | Convert usePrayerReactions to a Reactive Store | S    | Low  | ✅     |

## Phase 1 — Backend Foundation (30 specs)

| #   | Spec  | Title                                          | Size | Risk     | Status |
| --- | ----- | ---------------------------------------------- | ---- | -------- | ------ |
| 3   | 1.1   | Audit and Rename Backend Skeleton              | L    | Medium   | ✅     |
| 4   | 1.2   | PostgreSQL via Docker Compose                  | S    | Low      | ✅     |
| 5   | 1.3   | Liquibase Integration and First Changeset      | M    | Low      | ✅     |
| 6   | 1.3b  | Users Table Timezone Column                    | S    | Low      | ✅     |
| 7   | 1.4   | Spring Security and JWT Setup                  | L    | Med-High | ✅     |
| 8   | 1.5   | Auth Endpoints (Register, Login, Logout)       | L    | High     | ✅     |
| 9   | 1.5b  | Password Reset Flow                            | L    | High     | ⬜     |
| 10  | 1.5c  | Change Password Endpoint                       | S    | Low      | ⬜     |
| 11  | 1.5d  | Email Verification Flow                        | L    | Medium   | ⬜     |
| 12  | 1.5e  | Change Email with Re-Verification              | M    | Medium   | ⬜     |
| 13  | 1.5f  | Account Lockout & Brute Force Protection       | M    | Medium   | ⬜     |
| 14  | 1.5g  | Session Invalidation & Logout-All-Devices      | M    | Medium   | ⬜     |
| 15  | 1.6   | User Me Endpoint                               | S    | Low      | ✅     |
| 16  | 1.7   | Testcontainers Integration Test Infrastructure | M    | Low      | ✅     |
| 17  | 1.8   | Dev Seed Data                                  | S    | Low      | ✅     |
| 18  | 1.9   | Frontend AuthContext JWT Migration             | L    | High     | ✅     |
| 19  | 1.9b  | Error & Loading State Design System            | M    | Low      | ✅     |
| 20  | 1.10  | Phase 1 Cutover and End-to-End Test            | M    | Medium   | ✅     |
| 21  | 1.10b | Deployment Target Decision Document            | S    | Low      | ✅     |
| 22  | 1.10d | Production Monitoring Foundation               | M    | Low      | ⬜     |
| 23  | 1.10e | Object Storage Adapter Foundation              | M    | Medium   | ⬜     |
| 24  | 1.10c | Database Backup Strategy                       | S    | Low      | ✅     |
| 25  | 1.10f | Terms of Service and Privacy Policy Surfaces   | M    | Med-High | ⬜     |
| 26  | 1.10g | Security Headers Middleware (CSP/HSTS/etc.)    | S    | Low      | ⬜     |
| 27  | 1.10h | API Error Code Catalog                         | S    | Low      | ⬜     |
| 28  | 1.10i | Backend Environment Variables Runbook          | S    | Low      | ⬜     |
| 29  | 1.10j | Liveness/Readiness Health Checks               | S    | Low      | ⬜     |
| 30  | 1.10k | HikariCP Connection Pool Tuning                | S    | Low      | ⬜     |
| 31  | 1.10l | Playwright E2E Test Infrastructure             | M    | Low      | ⬜     |
| 32  | 1.10m | Community Guidelines Document                  | S    | Low      | ⬜     |

## Phase 2 — Activity Engine Migration (10 specs)

| #   | Spec | Title                                           | Size | Risk   | Status |
| --- | ---- | ----------------------------------------------- | ---- | ------ | ------ |
| 33  | 2.1  | Activity Engine Schema (Liquibase)              | M    | Low    | ⬜     |
| 34  | 2.2  | Faith Points Calculation Service (Backend Port) | L    | Medium | ⬜     |
| 35  | 2.3  | Streak State Service (Backend Port)             | L    | Medium | ⬜     |
| 36  | 2.4  | Badge Eligibility Service (Backend Port)        | L    | Medium | ⬜     |
| 37  | 2.5  | Activity Counts Service                         | S    | Low    | ⬜     |
| 38  | 2.6  | Activity API Endpoint                           | L    | Medium | ⬜     |
| 39  | 2.7  | Frontend Activity Dual-Write                    | M    | Medium | ⬜     |
| 40  | 2.8  | Drift Detection Test (Frontend ↔ Backend)       | M    | Low    | ⬜     |
| 41  | 2.9  | Phase 2 Cutover                                 | S    | Medium | ⬜     |
| 42  | 2.10 | Historical Activity Backfill                    | M    | Medium | ⬜     |

## Phase 2.5 — Friends Migration (8 specs)

| #   | Spec   | Title                                             | Size | Risk   | Status |
| --- | ------ | ------------------------------------------------- | ---- | ------ | ------ |
| 43  | 2.5.1  | Friends Schema (Liquibase)                        | S    | Low    | ⬜     |
| 44  | 2.5.2  | Friends Service and Repository                    | L    | Medium | ⬜     |
| 45  | 2.5.3  | Friends API Endpoints                             | L    | Medium | ⬜     |
| 46  | 2.5.4  | Frontend Friends Dual-Write                       | L    | Medium | ⬜     |
| 47  | 2.5.4b | Social Interactions & Milestone Events Dual-Write | M    | Medium | ⬜     |
| 48  | 2.5.5  | Phase 2.5 Cutover                                 | S    | Medium | ⬜     |
| 49  | 2.5.6  | Block User Feature                                | M    | Medium | ⬜     |
| 50  | 2.5.7  | Mute User Feature                                 | S    | Low    | ⬜     |

## Phase 3 — Prayer Wall Backend (12 specs)

| #   | Spec | Title                                          | Size | Risk   | Status |
| --- | ---- | ---------------------------------------------- | ---- | ------ | ------ |
| 51  | 3.1  | Prayer Wall Schema (Liquibase)                 | L    | Medium | ⬜     |
| 52  | 3.2  | Mock Data Seed Migration                       | M    | Low    | ⬜     |
| 53  | 3.3  | Posts Read Endpoints                           | L    | Medium | ⬜     |
| 54  | 3.4  | Comments, Reactions, Bookmarks Read Endpoints  | M    | Low    | ⬜     |
| 55  | 3.5  | Posts Write Endpoints (Create, Update, Delete) | XL   | High   | ⬜     |
| 56  | 3.6  | Comments Write Endpoints                       | L    | High   | ⬜     |
| 57  | 3.7  | Reactions and Bookmarks Write Endpoints        | L    | Medium | ⬜     |
| 58  | 3.8  | Reports Write Endpoint                         | M    | Medium | ⬜     |
| 59  | 3.9  | QOTD Backend Migration                         | M    | Low    | ⬜     |
| 60  | 3.10 | Frontend Service API Implementations           | XL   | High   | ⬜     |
| 61  | 3.11 | Reactive Store Backend Adapter                 | L    | Medium | ⬜     |
| 62  | 3.12 | Phase 3 Cutover                                | M    | High   | ⬜     |

## Phase 4 — Post Types (10 specs)

| #   | Spec | Title                                                     | Size | Risk   | Status |
| --- | ---- | --------------------------------------------------------- | ---- | ------ | ------ |
| 63  | 4.1  | Post Type Foundation (Frontend Types + Backend Enum Sync) | M    | Low    | ⬜     |
| 64  | 4.2  | Prayer Request Polish                                     | M    | Low    | ⬜     |
| 65  | 4.3  | Testimony Post Type                                       | L    | Medium | ⬜     |
| 66  | 4.4  | Question Post Type                                        | L    | Medium | ⬜     |
| 67  | 4.5  | Devotional Discussion Post Type                           | M    | Medium | ⬜     |
| 68  | 4.6  | Encouragement Post Type                                   | M    | Medium | ⬜     |
| 69  | 4.6b | Image Upload for Testimonies & Questions                  | L    | Medium | ⬜     |
| 70  | 4.7  | Composer Chooser                                          | L    | Medium | ⬜     |
| 71  | 4.7b | Ways to Help MVP                                          | M    | Low    | ⬜     |
| 72  | 4.8  | Room Selector and Phase 4 Cutover                         | L    | Medium | ⬜     |

## Phase 5 — Visual Polish (6 specs)

| #   | Spec | Title                                        | Size | Risk   | Status |
| --- | ---- | -------------------------------------------- | ---- | ------ | ------ |
| 73  | 5.1  | FrostedCard Migration                        | L    | Medium | ⬜     |
| 74  | 5.2  | HorizonGlow at Prayer Wall Root              | S    | Low    | ⬜     |
| 75  | 5.3  | 2-Line Heading Treatment                     | M    | Low    | ⬜     |
| 76  | 5.4  | Animation Token Migration (BB-33 Compliance) | M    | Low    | ⬜     |
| 77  | 5.5  | Deprecated Pattern Purge and Visual Audit    | M    | Low    | ⬜     |
| 78  | 5.6  | Redis Cache Foundation                       | M    | Medium | ⬜     |

## Phase 6 — Engagement Features (14 specs)

| #   | Spec  | Title                         | Size | Risk     | Status |
| --- | ----- | ----------------------------- | ---- | -------- | ------ |
| 79  | 6.1   | Prayer Receipt                | L    | Medium   | ⬜     |
| 80  | 6.2   | Quick Lift                    | M    | Low      | ⬜     |
| 81  | 6.2b  | Prayer Length Options         | M    | Low      | ⬜     |
| 82  | 6.3   | Night Mode                    | L    | Medium   | ⬜     |
| 83  | 6.4   | 3am Watch                     | L    | HIGH     | ⬜     |
| 84  | 6.5   | Intercessor Timeline          | L    | Med-High | ⬜     |
| 85  | 6.6   | Answered Wall                 | L    | Medium   | ⬜     |
| 86  | 6.7   | Shareable Testimony Cards     | L    | Medium   | ⬜     |
| 87  | 6.8   | Verse-Finds-You               | L    | HIGH     | ⬜     |
| 88  | 6.9   | Prayer Wall Composer Drafts   | M    | Low      | ⬜     |
| 89  | 6.10  | Prayer Wall Search by Author  | S    | Low      | ⬜     |
| 90  | 6.11  | Sound Effects Settings Polish | S    | Low      | ⬜     |
| 91  | 6.11b | Live Presence Component       | M    | Medium   | ⬜     |
| 92  | 6.12  | Phase 6 Cutover               | S    | Low      | ⬜     |

## Phase 7 — Cross-Feature Integration (8 specs)

| #   | Spec | Title                                        | Size | Risk   | Status |
| --- | ---- | -------------------------------------------- | ---- | ------ | ------ |
| 93  | 7.1  | Bible to Prayer Wall Bridge                  | L    | Medium | ⬜     |
| 94  | 7.2  | Prayer Wall to Bible Bridge                  | S    | Low    | ⬜     |
| 95  | 7.3  | Music During Prayer Wall                     | S    | Low    | ⬜     |
| 96  | 7.4  | Daily Hub Pray Tab Friend Surfacing          | M    | Medium | ⬜     |
| 97  | 7.5  | Local Support Bridges on Mental Health Posts | M    | Medium | ⬜     |
| 98  | 7.6  | Friends Pin to Top of Feed                   | L    | Medium | ⬜     |
| 99  | 7.7  | Privacy Tiers (Public / Friends / Private)   | L    | High   | ⬜     |
| 100 | 7.8  | Phase 7 Cutover                              | S    | Low    | ⬜     |

## Phase 8 — User Profiles (9 specs)

| #   | Spec | Title                              | Size | Risk   | Status |
| --- | ---- | ---------------------------------- | ---- | ------ | ------ |
| 101 | 8.1  | Username System                    | L    | Medium | ⬜     |
| 102 | 8.2  | `/u/:username` Route and Redirects | M    | Medium | ⬜     |
| 103 | 8.3  | Profile Summary Tab                | L    | Medium | ⬜     |
| 104 | 8.4  | Profile Prayer Wall Tab            | M    | Low    | ⬜     |
| 105 | 8.5  | Profile Growth Tab                 | M    | Low    | ⬜     |
| 106 | 8.6  | Profile Bible Tab                  | M    | Low    | ⬜     |
| 107 | 8.7  | Profile Friends Tab                | M    | Low    | ⬜     |
| 108 | 8.8  | Name Canonicalization Migration    | XL   | High   | ⬜     |
| 109 | 8.9  | Phase 8 Cutover                    | S    | Low    | ⬜     |

## Phase 9 — Seasonal & Liturgical (5 specs)

| #   | Spec | Title                             | Size | Risk   | Status |
| --- | ---- | --------------------------------- | ---- | ------ | ------ |
| 110 | 9.1  | Liturgical Calendar Service       | M    | Low    | ⬜     |
| 111 | 9.2  | Liturgical Theming on Prayer Wall | M    | Low    | ⬜     |
| 112 | 9.3  | Sunday Service Sync               | S    | Low    | ⬜     |
| 113 | 9.4  | Time-of-Day Copy Variations       | M    | Low    | ⬜     |
| 114 | 9.5  | Candle Mode                       | L    | Medium | ⬜     |

## Phase 10 — Community Safety (13 specs)

| #   | Spec   | Title                                   | Size | Risk   | Status |
| --- | ------ | --------------------------------------- | ---- | ------ | ------ |
| 115 | 10.1   | First Time Badges                       | S    | Low    | ⬜     |
| 116 | 10.2   | Welcomer Role                           | M    | Medium | ⬜     |
| 117 | 10.3   | Presence Cues                           | M    | Low    | ⬜     |
| 118 | 10.4   | Trust Levels (Discourse-Inspired)       | L    | High   | ⬜     |
| 119 | 10.5   | Three-Tier Escalation (7 Cups Inspired) | L    | High   | ⬜     |
| 120 | 10.6   | Automated Phrase Flagging               | M    | High   | ⬜     |
| 121 | 10.7   | Peer Moderator Queue                    | L    | Medium | ⬜     |
| 122 | 10.7b  | Report a User                           | M    | Medium | ⬜     |
| 123 | 10.8   | Appeal Flow                             | M    | Medium | ⬜     |
| 124 | 10.9   | Rate Limiting Tightening                | S    | Low    | ⬜     |
| 125 | 10.10  | Admin Foundation                        | M    | Low    | ⬜     |
| 126 | 10.10b | Admin Audit Log Viewer                  | M    | Low    | ⬜     |
| 127 | 10.11  | Account Deletion and Data Export        | L    | High   | ⬜     |

## Phase 11 — Search (4 specs)

| #   | Spec | Title                                | Size | Risk   | Status |
| --- | ---- | ------------------------------------ | ---- | ------ | ------ |
| 128 | 11.1 | Full-Text Search Schema and Indexing | M    | Medium | ⬜     |
| 129 | 11.2 | Search API Endpoint                  | L    | Medium | ⬜     |
| 130 | 11.3 | Search UI                            | L    | Medium | ⬜     |
| 131 | 11.4 | Search by Verse Reference            | M    | Low    | ⬜     |

## Phase 12 — Notifications (5 specs)

| #   | Spec | Title                                     | Size | Risk   | Status |
| --- | ---- | ----------------------------------------- | ---- | ------ | ------ |
| 132 | 12.1 | Notification Types Catalog                | M    | Low    | ⬜     |
| 133 | 12.2 | Notification Backend Schema and Endpoints | L    | Medium | ⬜     |
| 134 | 12.3 | Notification Generators                   | L    | Medium | ⬜     |
| 135 | 12.4 | Notification Preferences                  | M    | Low    | ⬜     |
| 136 | 12.5 | Mention System                            | L    | Medium | ⬜     |

## Phase 13 — Personal Analytics (4 specs)

| #   | Spec | Title                      | Size | Risk   | Status |
| --- | ---- | -------------------------- | ---- | ------ | ------ |
| 137 | 13.1 | Personal Insights Endpoint | M    | Low    | ⬜     |
| 138 | 13.2 | Insights UI Card           | M    | Low    | ⬜     |
| 139 | 13.3 | Year-in-Review Story       | L    | Medium | ⬜     |
| 140 | 13.4 | Intercession Patterns      | M    | Low    | ⬜     |

## Phase 14 — Onboarding (4 specs)

| #   | Spec | Title                               | Size | Risk   | Status |
| --- | ---- | ----------------------------------- | ---- | ------ | ------ |
| 141 | 14.1 | First-Visit Walkthrough             | L    | Medium | ⬜     |
| 142 | 14.2 | Suggested First Action              | M    | Low    | ⬜     |
| 143 | 14.3 | Find Your People Friend Suggestions | L    | Medium | ⬜     |
| 144 | 14.4 | Warm Empty States                   | M    | Low    | ⬜     |

## Phase 15 — Email & Push (5 specs)

| #   | Spec  | Title                      | Size | Risk   | Status |
| --- | ----- | -------------------------- | ---- | ------ | ------ |
| 145 | 15.1  | SMTP Setup                 | M    | Medium | ⬜     |
| 146 | 15.1b | Welcome Email Sequence     | M    | Medium | ⬜     |
| 147 | 15.2  | Comment Reply Digest Email | L    | Medium | ⬜     |
| 148 | 15.3  | Weekly Summary Email       | M    | Low    | ⬜     |
| 149 | 15.4  | Push Notification Wiring   | L    | Medium | ⬜     |

## Phase 16 — Polish & Performance (7 specs)

| #   | Spec  | Title                                 | Size | Risk   | Status |
| --- | ----- | ------------------------------------- | ---- | ------ | ------ |
| 150 | 16.1  | Offline Cache for Recent Feed         | L    | Medium | ⬜     |
| 151 | 16.1b | Offline Banner UI                     | S    | Low    | ⬜     |
| 152 | 16.2  | Queued Posts (Offline-First Composer) | L    | High   | ⬜     |
| 153 | 16.2b | React Error Boundary Strategy         | M    | Low    | ⬜     |
| 154 | 16.3  | Lighthouse Performance Audit          | M    | Low    | ⬜     |
| 155 | 16.3b | Feature Flag Cleanup Pass             | S    | Low    | ⬜     |
| 156 | 16.4  | Accessibility Audit (BB-35 Style)     | L    | Medium | ⬜     |

---

## Summary by Phase

| Phase     | Name                 | Specs   | High Risk |
| --------- | -------------------- | ------- | --------- |
| 0         | Learning             | 1       | 0         |
| 0.5       | Quick Win            | 1       | 0         |
| 1         | Backend Foundation   | 30      | 3         |
| 2         | Activity Engine      | 10      | 0         |
| 2.5       | Friends Migration    | 8       | 0         |
| 3         | Prayer Wall Backend  | 12      | 4         |
| 4         | Post Types           | 10      | 0         |
| 5         | Visual Polish        | 6       | 0         |
| 6         | Engagement Features  | 14      | 2         |
| 7         | Cross-Feature        | 8       | 1         |
| 8         | User Profiles        | 9       | 1         |
| 9         | Seasonal             | 5       | 0         |
| 10        | Community Safety     | 13      | 4         |
| 11        | Search               | 4       | 0         |
| 12        | Notifications        | 5       | 0         |
| 13        | Personal Analytics   | 4       | 0         |
| 14        | Onboarding           | 4       | 0         |
| 15        | Email & Push         | 5       | 0         |
| 16        | Polish & Performance | 7       | 1         |
| **Total** |                      | **156** | **16**    |
