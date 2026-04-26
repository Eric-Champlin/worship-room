# Worship Room Privacy Policy

## What this is

This Privacy Policy describes what information Worship Room collects, what we do with it, who we share it with, and what choices you have about your data. It's written to be read by a person, not by a lawyer's discovery tool — but it's a real description of how data flows through the app, and where we describe limits or commitments, we mean them.

The Worship Room Community Guidelines describe how we hope users treat each other in the spaces shared with other people. This Privacy Policy is the legal-precise version of who-sees-what and how data moves through our systems. The two documents are meant to be read together.

## The short version

Most of what you do on Worship Room never leaves your browser. Your journal entries, your AI Bible chats, your mood check-ins, your prayer drafts, your Bible highlights and notes and memorization cards — all of that lives in your browser's local storage and stays there. We don't run analytics, we don't use third-party trackers, we don't sell or share data with advertisers (we don't run ads at all), and we don't have an email list. The only things we currently store on our servers are the parts of your account we need to log you in: your email, your password (hashed, never stored in plain text), your name, and a small number of profile fields. Prayer Wall posts, when that feature is enabled with backend persistence, are public to anyone visiting the site. Crisis-related content is treated specially per our Community Guidelines.

## What we collect

We organize what we collect into four buckets: account data, content, technical and device data, and what we receive from third-party services.

### Account data (stored on our servers)

When you create an account, we store:

- Your email address
- A hash of your password (we never store your actual password, and the hash is computed using BCrypt with a unique salt)
- Your first name and last name
- Your display name preference (which combination of your name we show publicly)
- The timezone your browser reports when you registered (used to make daily content arrive at the right time of day for you)
- Account flags we use internally: whether your account is an administrator, whether it's been suspended, whether your email has been verified, when you joined, when you were last active, and whether the account has been deleted
- Optional profile fields, if you choose to fill them in: avatar URL, bio, favorite verse reference and text

These fields live in our PostgreSQL database, hosted on Railway in the United States. We don't currently use any other server-side storage for user data.

### Content (stored in your browser)

Most of what you create in Worship Room never reaches our servers. The following categories live entirely in your browser's local storage:

- **Your auth state** — the JSON Web Token your browser uses to authenticate with our backend, plus a small number of related identifiers.
- **Mood and activity tracking** — your mood check-ins, daily activity log, faith points, streaks, badges, and meditation history.
- **Social state** (currently mock data) — your friends list, social interactions, milestone feed, in-app notifications, and leaderboard data. The social features are not yet wired to a backend, so this content is populated by mock data today.
- **Dashboard preferences** — card collapse state, layout preferences, dismissal flags for various banners and prompts, and your getting-started checklist progress.
- **Music and audio** — favorited sounds and scenes, saved ambient mixes, listening history, custom routines, sound-effects toggle, and audio Bible preferences.
- **Daily Hub drafts** — your prayer draft, journal draft, journal mode preference, and journal milestone celebrations.
- **Content engagement** — which devotionals you've read, your personal prayer list, reading plan progress, and your gratitude journal entries.
- **Bible reader state** — highlights, bookmarks, notes, journal entries linked to verses, last-read position, active reading plans, reading streak, chapter visit history (used to draw the heatmap), reader preferences (theme, type size, line height, font), and your memorization deck.
- **AI response cache** — when you use the Explain or Reflect features in the Bible reader, the AI's response is cached on your device for seven days so the same verse range doesn't have to make a fresh AI request every time. The cache stores the AI's response, not your original prompt. It's a performance optimization, not a surveillance pattern; it keeps response time fast and reduces our upstream API usage. The cache is capped at 2 MB and clears on its own.
- **Community engagement** — challenge progress, prayer wall reactions, AI Bible chat feedback ratings, and local support visit logs.
- **Progressive Web App and notifications** — install prompt state, visit count, push notification subscription (if you've granted permission), and notification preferences.
- **Engagement state** — dismissal flags for surprise moments, anniversary milestones, and gratitude callbacks.

A canonical key-by-key list of every browser-storage key Worship Room writes lives in our internal documentation. None of these keys leave your device unless and until a future feature explicitly syncs them to the backend, in which case we'll update this Privacy Policy to describe that flow before it ships.

### Technical and device data

When your browser talks to our backend, our servers see:

- The HTTP request itself (URL, method, the headers your browser chose to send)
- Your IP address, used transiently for rate limiting; we do not persist IP addresses to our database
- A unique request ID we generate for each request, used for debugging and tracing
- The User-Agent string your browser sends

We log a small amount of structured information about each backend request: the request ID, the route, the response status code, lengths of any user-submitted text fields (as numbers, never as content), and a hash of the email address for authentication-related logs (used to detect anti-enumeration patterns without exposing the email itself in logs).

We do not log the body of your prayer requests, journal entries, AI prompts, or any other user-submitted text. We do not log your email address in plain text. We do not log your IP address to any persistent store; rate-limit diagnostic logs that include an IP are written to standard output only and rotate per the host's retention defaults.

### Data we receive from third-party services

When you use the AI Bible chat, prayer generation, journal reflection, Explain This Passage, or Reflect on This Passage features, your input is sent through our backend to Google's Gemini API (currently the `gemini-2.5-flash-lite` model). Our backend acts as a proxy so that no Gemini API key is ever shipped to your browser. Google receives the text of your prompt; what Google does with that data is governed by Google's terms for the Gemini API, not by this policy.

When you use the Local Support search (Churches, Counselors, Celebrate Recovery), your search query and city or coordinates are sent through our backend to Google Maps Places. We do not attach your account identifier to Maps requests.

When you use Bible audio playback, the chapter and book you select are sent through our backend to Faith Comes By Hearing's Digital Bible Platform to retrieve the audio file URL. We do not attach your account identifier to those requests.

When the Prayer Wall or Daily Hub renders a Spotify embed, your browser loads the embed iframe directly from Spotify. Spotify may set its own cookies on your browser at that point. Worship Room cannot read those cookies and does not receive information about what you do inside the Spotify embed.

## How we use what we collect

We use account data to authenticate you, show you your own content, restore your session across devices once backend sync is enabled, and apply administrator and moderation flags. We use timezone data to surface daily content at appropriate local times. We use email addresses for authentication only — we do not currently send any email. (See the Email section below.)

We use browser-stored content to render the features you're interacting with. Your journal entries appear in your journal. Your highlights appear on the verse you highlighted. Your streak counter reflects your activity log. None of that data leaves your device unless explicitly described in this policy.

We use technical data to debug failures, detect abuse patterns, enforce rate limits, and trace requests across the system. Request IDs and aggregated counts are useful for those purposes; the content of your prayers and journal entries is not, and we do not collect it.

We use third-party data flows to provide the features that depend on them: Gemini for AI responses, Google Maps for location search, FCBH for audio Bible playback. We don't combine data across these flows or build a profile from them.

## Who we share it with

We share data with the following service providers, and only to the extent necessary to operate the corresponding feature:

- **Google (Gemini API)** — receives the text of your AI feature prompts (Ask, Pray, Journal Reflection, Explain, Reflect). Governed by Google's terms for the Gemini API at https://ai.google.dev/gemini-api/terms.
- **Google (Maps Places API)** — receives Local Support search queries (text plus geographic context). Governed by Google Maps Platform terms at https://cloud.google.com/maps-platform/terms.
- **Faith Comes By Hearing (FCBH Digital Bible Platform)** — receives Bible audio requests (book, chapter, fileset). Governed by FCBH's terms at https://www.faithcomesbyhearing.com/legal.
- **Spotify** — sets its own cookies on your browser when an embed iframe loads. Governed by Spotify's privacy policy at https://www.spotify.com/legal/privacy-policy/.
- **Sentry** — receives backend error events when our software fails. We attach only your account UUID to those events; we do not attach your email, IP, name, or request body. Errors that we expect (authentication failures, validation errors, rate limits, and similar) are filtered out before they reach Sentry. Governed by Sentry's privacy policy at https://sentry.io/privacy/.
- **Railway** — our hosting provider; all backend traffic transits Railway's infrastructure. Governed by Railway's privacy policy at https://railway.com/legal/privacy.

We do not currently work with email service providers, analytics providers, or third-party advertisers. We do not run ads on Worship Room. We do not sell data, and we do not share data with advertisers, marketers, or data brokers.

## How long we keep it

**Account data on our servers.** Indefinitely, until you ask us to delete it. We do not currently run an automated purge job for accounts marked for deletion. If you ask us to delete your account, we delete the row in our database — see "Your rights and choices" below for how.

**Browser-stored content.** As long as your browser keeps it. Worship Room does not control the lifetime of your browser's local storage. You can clear it at any time using your browser's developer tools or its "clear site data" option. Some browser-storage entries cap themselves at a fixed limit (for example, mood entries cap at 365 days; the AI response cache caps at 2 MB and 7 days). Once an entry is evicted, it's gone — we don't have a backup.

**Backend logs.** Ephemeral, rotated per Railway's defaults (currently around seven days for standard-output logs). Logs do not contain user content.

**Sentry events.** Per Sentry's plan defaults, currently 90 days on the free tier we use.

## Your rights and choices

We have not yet built self-serve tools for the following, but you can exercise these rights today by emailing us at support@worshiproom.com:

- **Access** — ask for a copy of the account data we hold about you. We'll send you the contents of your row in our `users` table. Browser-stored content is already directly accessible to you through your browser's developer tools.
- **Correction** — if any account field is wrong, ask us to fix it.
- **Deletion** — ask us to delete your account. We'll delete the row in our database. We do not currently offer a self-serve "delete my account" button; that's a future feature. We aim to act on deletion requests within 14 business days.
- **Portability** — ask for an export of your account data in a machine-readable format.

For browser-stored content, you don't need to ask us. Clearing your browser's storage for `worshiproom.com` removes everything.

For Prayer Wall posts (when that feature is enabled with backend persistence), we follow a soft-delete pattern for community content. The post body is replaced with a deletion marker and your account identifier is removed from the post, but the post timestamp remains so the surrounding conversation isn't broken. This is consistent with how most community platforms handle deletion.

We don't currently offer a way to opt out of any specific data flow other than by not using the corresponding feature. If you don't want your prompts sent to Google's Gemini API, don't use the AI features. If you don't want Spotify to set cookies, don't browse pages with Spotify embeds. We may add more granular controls in future versions.

## Children's privacy

Worship Room is not directed to children under 13, and we do not knowingly collect information from children under 13. If you are a parent or guardian and you believe your child under 13 has registered an account, please email us at support@worshiproom.com and we will delete the account. We do not currently verify ages at registration.

## Cookies and similar technologies

Worship Room does not set any first-party cookies. The authentication token we issue is stored in your browser's local storage, not in a cookie. We do not use cookies for tracking, analytics, advertising, or session management.

The Prayer Wall and Daily Hub render Spotify embed iframes. When those iframes load, Spotify may set its own cookies on your browser. Those cookies are governed by Spotify's privacy policy, not ours, and Worship Room cannot read them.

Worship Room uses a service worker (the technology that makes the app installable as a Progressive Web App and that enables offline Bible reading). The service worker caches public Bible content, page assets, and the search index. It does not cache or transmit user data.

## International users

Worship Room is operated from the United States. Our database, backend, and hosting infrastructure are located in the United States. If you access Worship Room from outside the United States, your data will be transferred to and stored in the United States. By continuing to use Worship Room, you consent to that transfer.

We do not currently provide GDPR-specific or CCPA-specific compliance pathways. If you have questions about whether Worship Room is appropriate for your regional privacy requirements, please contact us.

If you require GDPR-level protections, Worship Room may not currently be the right fit for you, and we encourage you to wait for a future version that addresses regional compliance explicitly.

## Data security

We do the following to protect your data, while being honest that no system is unbreakable:

- All traffic between your browser and our backend is encrypted in transit using HTTPS (TLS).
- Passwords are hashed with BCrypt and a unique salt before storage; we never see, store, or log your plain-text password.
- Authentication tokens (JSON Web Tokens) expire after one hour.
- We apply rate limits to public endpoints to deter brute-force attacks.
- We send a fixed set of security response headers (HSTS, X-Frame-Options, Content-Security-Policy, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) on every response.
- Backend errors are reported to Sentry with only your account UUID attached, never your email, IP, name, or request content.

We do **not** currently encrypt application-level data at rest in our database beyond the disk-level encryption our hosting provider provides. Adding column-level encryption for sensitive content fields is on our future roadmap; this Privacy Policy will be updated when that ships.

We do not currently run third-party penetration tests or maintain a published security audit. Worship Room is built and operated by a single developer; the security posture is best-effort, and we welcome reports of issues at support@worshiproom.com.

## No analytics, no third-party tracking

We want to be specific about this because it's a meaningful differentiator and it's easy to verify by inspecting the page. As of this Privacy Policy's effective date:

- Worship Room does not include Google Analytics, Plausible, Mixpanel, PostHog, Amplitude, Heap, Hotjar, FullStory, or any other analytics or session-replay tool.
- Worship Room does not include any advertising network, retargeting pixel, or conversion-tracking script.
- Worship Room does not include any social-media tracking pixel — no Facebook Pixel, no LinkedIn Insight Tag, no TikTok Pixel.
- Worship Room does not have an email list and does not currently send marketing email. The unsubscribe link you'd otherwise expect doesn't exist because there's nothing to unsubscribe from.

If we ever add any of the above, we will update this Privacy Policy first.

## Email

Worship Room does not currently send any email — no welcome emails, no email verification, no password reset emails, no marketing emails, no notification emails. The "Forgot password?" link in the sign-in modal currently shows an in-app message that the feature is coming soon; today, password recovery requires emailing us.

When email features ship in a future version of Worship Room, we will update this Privacy Policy to describe what we send, why, and how to opt out.

## Changes to this policy

We may update this Privacy Policy as Worship Room grows, especially as new features come online and new data flows are introduced. When we make material changes, we will note them inside the app and update the effective date below.

By continuing to use Worship Room after these documents are published, you acknowledge them. A future version of Worship Room will add a registration consent checkbox so that account creation captures explicit acceptance of this policy and our Terms of Service; until that ships, your continued use is the acknowledgment we have.

## How to contact us

For privacy questions, data access requests, deletion requests, or anything else covered by this policy, email us at support@worshiproom.com.

## Last updated and version

- **Effective date:** April 25, 2026
- **Version:** 1.0
- **Related documents:**
  - Community Guidelines: content/community-guidelines.md
  - Terms of Service: content/terms-of-service.md
