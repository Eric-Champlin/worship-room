## Logging & Monitoring

### Structured Logging
- **Format**: JSON logs for easy parsing (Logback configuration)
- **Levels**: INFO, WARN, ERROR
- **Include**:
  - Timestamp
  - User ID (if applicable)
  - Request ID (for tracing)
  - Action (e.g., "mood_selected", "prayer_generated")
  - Metadata (mood, scripture ID, etc.)
- **PII Handling**: Never log PII in application logs (emails, names, passwords, journal content, prayer text)
  - **Safe to log**: User IDs, timestamps, actions, mood values, scripture IDs, error codes
  - **Never log in app logs**: User input text (journals, prayers), email addresses, raw IP addresses
  - **IP addresses**: May be used transiently in-memory for rate limiting, never stored/logged
    - **Hashed IPs for rate limiting**: Stored only in Redis/in-memory rate-limit cache with short TTL (15 minutes), never in app logs, never in database
  - **Admin audit trail**: Emails stored only in database `admin_audit_log` table (never in application logs)

### Error Tracking
- **Platform**: Sentry or Rollbar
- **Track**:
  - Application errors (500s)
  - AI API failures
  - Database errors
  - Authentication failures
- **Alerts**: Email admin on critical errors

### Audit Logs
- **Admin Actions**: Log all admin moderation actions to `admin_audit_log` table
  - Who did what, when, and to whom
  - Action: deleted_post, banned_user, edited_post
- **Retention**: Keep audit logs indefinitely for accountability

### Analytics
- **User Behavior**: Track key metrics (optional: PostHog, Mixpanel, or custom)
  - Mood selections per day
  - Scripture views
  - Prayer wall posts
  - Journal entries
- **Performance**: Monitor page load times, API response times
- **AI Usage**: Track OpenAI API calls, costs, response times
