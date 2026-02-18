---
paths: ["backend/**", "**/*.sql"]
---

## Tech Stack

### Database
- **Local Development**: PostgreSQL via Docker Compose
- **Production**: PostgreSQL hosted on Railway, Render, or Supabase
- **ORM**: Spring Data JPA
- **Migrations**: Flyway or Liquibase (TBD)

## Database Schema

### users
```sql
id (UUID, primary key)
email (VARCHAR, unique, not null)
password_hash (VARCHAR, not null)
name (VARCHAR)
is_admin (BOOLEAN, default false)
is_banned (BOOLEAN, default false)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
last_login_at (TIMESTAMP)
```

### scriptures
```sql
id (UUID, primary key)
reference (VARCHAR, e.g., "John 3:16", "Psalm 23:1-4")
text (TEXT, the verse content)
translation (VARCHAR, not null) -- Translation TBD; must be legally usable (WEB, KJV, or licensed)
themes (JSONB, e.g., ["hope", "peace", "comfort"])
mood_tags (JSONB, e.g., ["terrible", "bad", "neutral"])
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### mood_selections
```sql
id (UUID, primary key)
user_id (UUID, foreign key → users.id, nullable for future anonymous tracking only - MVP: no logged-out persistence)
mood (ENUM: terrible, bad, neutral, good, excellent, nullable if text input used)
description (TEXT, for free-form text input)
scripture_id (UUID, foreign key → scriptures.id)
timestamp (TIMESTAMP)
created_at (TIMESTAMP)
```

**Logged-Out Mood Tracking Policy**:
- **MVP**: Do NOT persist mood selections for logged-out users (privacy-first approach)
  - Mood selection only stored in session memory/React state
  - No database write if `user_id` is NULL
  - User sees scripture but no history tracking
- **Future Enhancement**: If anonymous tracking is added later:
  - Use cookie-based anonymous ID (not IP address)
  - Retention window: 7 days maximum
  - Clear privacy disclosure
  - Allow opt-out

### journal_entries
```sql
id (UUID, primary key)
user_id (UUID, foreign key → users.id, not null)
mood (ENUM: terrible, bad, neutral, good, excellent, nullable)
content (TEXT, encrypted, not null)
ai_prompt_used (TEXT, nullable - the AI prompt that was shown)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### prayer_wall_posts
```sql
id (UUID, primary key)
user_id (UUID, foreign key → users.id, not null)
title (VARCHAR, not null)
content (TEXT, not null)
is_flagged (BOOLEAN, default false)
flagged_reason (TEXT, nullable - AI moderation reason)
is_deleted (BOOLEAN, default false)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### prayer_wall_reports
```sql
id (UUID, primary key)
post_id (UUID, foreign key → prayer_wall_posts.id)
reporter_user_id (UUID, foreign key → users.id, nullable)
reason (TEXT)
created_at (TIMESTAMP)
```

### guided_meditations
```sql
id (UUID, primary key)
title (VARCHAR, not null)
topic (VARCHAR, e.g., "Peace & Calm", "Anxiety Relief")
content (TEXT, not null - the meditation text)
duration_minutes (INTEGER, estimated reading time)
order_index (INTEGER, for display ordering)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### daily_content
```sql
id (UUID, primary key)
date (DATE, unique, not null)
verse_id (UUID, foreign key → scriptures.id)
song_title (VARCHAR)
song_artist (VARCHAR)
song_spotify_url (VARCHAR)
created_at (TIMESTAMP)
```

### admin_audit_log
```sql
id (UUID, primary key)
admin_user_id (UUID, foreign key → users.id)
action (VARCHAR, e.g., "deleted_post", "banned_user", "edited_post")
target_type (VARCHAR, e.g., "prayer_wall_post", "user")
target_id (UUID)
details (JSONB, additional context)
created_at (TIMESTAMP)
```

### Database Indexes & Constraints

**Performance-Critical Indexes**:
```sql
-- Mood tracking (dashboard, insights page)
CREATE INDEX idx_mood_selections_user_timestamp ON mood_selections(user_id, timestamp DESC);

-- Journal entries (my entries page)
CREATE INDEX idx_journal_entries_user_created ON journal_entries(user_id, created_at DESC);

-- Prayer wall (moderation, flagged posts)
CREATE INDEX idx_prayer_wall_flagged ON prayer_wall_posts(is_flagged, created_at DESC);
CREATE INDEX idx_prayer_wall_user ON prayer_wall_posts(user_id, created_at DESC);

-- Admin audit logs
CREATE INDEX idx_audit_log_admin ON admin_audit_log(admin_user_id, created_at DESC);
CREATE INDEX idx_audit_log_target ON admin_audit_log(target_type, target_id);
```

**Unique Constraints**:
```sql
-- Only one verse/song per day
ALTER TABLE daily_content ADD CONSTRAINT unique_daily_date UNIQUE (date);

-- Unique emails
ALTER TABLE users ADD CONSTRAINT unique_user_email UNIQUE (email);
```

**Future Considerations** (non-goals for MVP):
- Full-text search on prayer wall posts (PostgreSQL `tsvector` or external search engine)
- Composite indexes for complex queries as usage patterns emerge

## Data Retention & Deletion
- **Account Deletion**: User can delete their account via profile settings
  - **Journal Entries**: Hard deleted (permanently removed from database)
  - **Mood Selections**: Hard deleted OR anonymized (user_id set to NULL, description cleared if present)
  - **Prayer Wall Posts**: Soft deleted with precise definition:
    - `is_deleted = true`
    - `content` replaced with `"[deleted]"` or empty string
    - `title` replaced with `"[deleted]"`
    - `user_id` set to NULL
    - Timestamps retained (`created_at`, `updated_at`)
    - Post remains in database for audit/moderation history but content is unrecoverable
  - **Audit Logs**: Retained indefinitely (does not contain journal content, only admin actions)
- **Backups**: Database backups retained for 30 days, then purged
- **Data Export**: User can export their data (journal entries, mood history) before deletion (future feature)

## Encryption Policies
- **Encryption**: Encrypt sensitive private content at the application layer before writing to database (not only disk-level encryption)
  - **Journal Entries**: Always encrypted (private content)
  - **Prayer Wall Posts**: NOT encrypted (public by design for community sharing)
  - **Mood Selections**: NOT encrypted (analytics data). MVP: only persisted for logged-in users (user_id is never NULL in practice)
  - **Key Management**: Encryption keys stored in env/secret manager; rotate keys periodically; never commit keys to repository
  - **Important**: Encrypt/decrypt only on backend; frontend never sees encryption keys
