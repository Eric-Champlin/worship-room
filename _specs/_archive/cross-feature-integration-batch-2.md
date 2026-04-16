# Feature: Cross-Feature Integration Batch 2

**Master Plan Reference:** N/A — standalone integration batch connecting existing features.

---

## Overview

Worship Room's features celebrate individual moments well — a meditation session ends, a challenge wraps up, a Bible book is finished — but these completions currently feel like dead ends rather than steps on a continuous growth journey. This spec bridges five integration gaps so that finishing one thing naturally invites the user deeper into another, reinforcing the truth that every small act of faithfulness is part of something bigger.

## User Stories

- As a **logged-in user**, I want to see my cumulative meditation stats after each session and a link to my trends so that I feel my practice is valued and building toward something.
- As a **logged-in user**, I want meaningful next-step CTAs when I complete a challenge so that I can channel my momentum into continued growth.
- As a **logged-in user**, I want a celebration when I finish reading an entire Bible book so that my dedication to Scripture is recognized.
- As a **logged-in user**, I want relevant challenge suggestions when I complete a reading plan so that my journey continues with community.
- As a **logged-in user**, I want a gentle "try this next" nudge when I earn a badge so that I discover features I haven't explored yet.

---

## Integration 1: Meditation to Insights Link

### Current State

`CompletionScreen.tsx` is a generic, reusable component that accepts CTAs as props. After any meditation completes, it shows CTAs like "Meditate more," "Try a different meditation," "Continue to Pray →," etc. It already displays weekly meditation minutes via `getMeditationMinutesForWeek()`. Meditation sessions are stored in `wr_meditation_history` as `MeditationSession[]` (max 365 entries) via `meditation-storage.ts`, which exposes `getMeditationHistory()`, `getMeditationMinutesForWeek()`, `getMeditationMinutesForRange()`, and `getMostPracticedType()`.

### Requirements

1. **Cumulative stat line**: On the meditation completion screen, add a stat line below the weekly minutes and above the CTA buttons: **"You've meditated X times for Y total minutes"** — calculated from the full `wr_meditation_history` array. `X` = total sessions count, `Y` = sum of all `durationMinutes`. This gives immediate feedback that practice is accumulating.
2. **Insights link**: Below the existing CTA buttons (not competing with them), add a subtle text link: **"View your meditation trends →"** navigating to `/insights`. Style: `text-primary-lt text-sm hover:text-primary hover:underline transition-colors`. This link only appears when the user has **7 or more** meditation sessions in `wr_meditation_history` — fewer than 7 doesn't provide enough data for meaningful trends.
3. The insights link should ideally scroll to or focus the meditation history section on `/insights`. If the meditation section has an `id` attribute, append it as a hash (e.g., `/insights#meditation-history`). If not, navigating to `/insights` is sufficient.
4. Both additions are computed from `getMeditationHistory()` — no new localStorage keys needed.

### Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior |
|--------|--------------------|--------------------|
| View meditation stat line | N/A — meditation sub-pages redirect to `/daily?tab=meditate` when logged out | Shows cumulative stats |
| Click "View your meditation trends →" | N/A — can't reach completion screen | Navigates to `/insights` |

Meditation sub-pages are already fully auth-gated (route-level redirect). No additional gating needed.

---

## Integration 2: Challenge Completion CTAs

### Current State

`ChallengeCompletionOverlay.tsx` fires when a challenge is fully completed. It currently shows confetti (12 mobile, 24 desktop), the challenge title, days completed, faith points earned, and badge name. Two buttons exist: **"Share Your Achievement"** (stub — `handleShare` has a TODO comment and is non-functional) and **"Browse more challenges"** (navigates to challenges list). The overlay auto-dismisses after 8 seconds, with a dismiss button appearing after 2 seconds.

The Canvas share image generator exists at `lib/challenge-share-canvas.ts` — it produces a 1080×1080px PNG with gradient background, challenge title, day progress, streak (if >3), progress bar, and watermark. This pattern is used for challenge milestone sharing but is **not yet wired** to the completion overlay.

### Requirements

1. **Replace the two current buttons** with a grid of 5 CTA cards below the celebration message:

   | CTA | Icon | Label | Description | Link |
   |-----|------|-------|-------------|------|
   | See your growth | `LayoutDashboard` | "See your growth →" | "Your dashboard shows the journey" | `/` |
   | Check the leaderboard | `Trophy` | "Check the leaderboard →" | "See where you rank now" | `/friends?tab=leaderboard` |
   | Share your achievement | `Share2` | "Share your achievement" | "Celebrate with others" | (Canvas share action) |
   | Browse more plans | `BookOpen` | "Browse more plans →" | "Continue growing with a reading plan" | `/grow?tab=plans` |
   | Browse more challenges | `Compass` | "Browse more challenges →" | "Find your next journey" | `/grow?tab=challenges` |

2. **Grid layout**: 2 columns on desktop (with the 5th item spanning full width or centered), single column stacked on mobile. Each card uses frosted glass styling: `bg-white/[0.08] border border-white/10 rounded-xl p-3 hover:bg-white/[0.12] transition-colors`. Card content: icon (Lucide, 20px, `text-white/70`) + label (font-semibold, white) + description (text-sm, `text-white/50`).

3. **Wire the Share button**: Implement `handleShare` using the existing `generateChallengeShareImage()` from `lib/challenge-share-canvas.ts`. Generate a completion share image with: challenge title, "Challenge Complete!", days completed (as "X of X Complete"), and the badge name. Use the Web Share API (`navigator.share`) with the generated image blob. Fallback: download the image if Web Share is unsupported. This follows the same pattern already established for challenge milestone sharing.

4. **Auto-dismiss adjustment**: Because the overlay now has more interactive content, extend the auto-dismiss timer from 8 seconds to 12 seconds (or disable auto-dismiss when the CTA grid is visible — the user may need time to choose).

### Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior |
|--------|--------------------|--------------------|
| See challenge completion overlay | N/A — challenge participation requires login | Overlay fires with all CTAs |
| Click any CTA | N/A | Navigates to respective route / triggers share |

Challenge participation is already fully auth-gated. No additional gating needed.

---

## Integration 3: Bible Book Completion Celebration

### Current State

`useBibleProgress.ts` tracks chapter completion in `wr_bible_progress` (`Record<string, number[]>` — book slug → array of completed chapter numbers). `markChapterRead(bookSlug, chapter)` adds chapters. The Bible books data (in `constants/bible.ts` and `data/bible/index.ts`) includes chapter counts per book. **No book-completion detection exists.** There are **no Bible reading badges** in the badge definitions.

### Requirements

1. **Book completion detection**: After `markChapterRead()` records a chapter, check whether all chapters for that book are now complete. Compare `progress[bookSlug].length` against the book's total chapter count from the Bible books data.

2. **Celebration toast**: When a book is fully read, trigger a `toast-confetti` tier celebration: **"[Book Name] Complete! You've read all [X] chapters."** Use the existing toast system.

3. **Bible reading badges**: Add 4 new badges to the badge definitions:

   | Badge ID | Name | Description | Trigger | Category | Celebration Tier |
   |----------|------|-------------|---------|----------|------------------|
   | `bible_book_1` | "First Book" | "Read every chapter of a Bible book" | 1 book complete | `activity` | `toast-confetti` |
   | `bible_book_5` | "Bible Explorer" | "Completed 5 Bible books" | 5 books complete | `activity` | `toast-confetti` |
   | `bible_book_10` | "Scripture Scholar" | "Completed 10 Bible books" | 10 books complete | `activity` | `full-screen` |
   | `bible_book_66` | "Bible Master" | "Read the entire Bible — all 66 books" | 66 books complete | `activity` | `full-screen` |

   **Note:** The existing badge `plans_10` already uses the name "Scripture Scholar." The Bible reading badge should use a distinct name — **"Deep Reader"** instead — to avoid confusion. Final naming: `bible_book_1` = "First Book", `bible_book_5` = "Bible Explorer", `bible_book_10` = "Deep Reader", `bible_book_66` = "Bible Master".

   The `full-screen` tier badges should include a verse:
   - Deep Reader: "Your word is a lamp to my feet, and a light for my path." — Psalm 119:105 WEB
   - Bible Master: "All Scripture is God-breathed and profitable for teaching..." — 2 Timothy 3:16 WEB

4. **Inline celebration card**: After the toast, show an inline card at the top of the chapter reading view:
   - Green checkmark icon + **"You've completed [Book Name]!"**
   - If a badge was newly earned, show the badge name and icon inline
   - CTA links: **"View your reading progress →"** (`/insights`) and **"Start the next book →"** (link to the next book in canonical order in the Bible browser — e.g., after Genesis → `/bible/exodus/1`, after Revelation → no "next book" link)
   - Dismissible with X button. Dismissal stored in `sessionStorage` (key: `wr_bible_book_complete_dismissed_[bookSlug]`) so it doesn't reappear on reload but does reappear on next visit.
   - Card styling: `bg-success/10 border border-success/30 rounded-xl p-4` with the green checkmark in `text-success`.

5. **Completed book count**: The badge engine needs to count total completed books from `wr_bible_progress` by checking each book slug against its expected chapter count.

### Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior |
|--------|--------------------|--------------------|
| Read Bible chapters | Can read (public route) but `markChapterRead` no-ops | Chapter marked as read, completion detection runs |
| See book completion toast | N/A — no progress tracked | Toast fires when book fully read |
| See inline celebration card | N/A | Card appears at top of chapter view |
| Earn Bible reading badge | N/A | Badge awarded through normal badge system |
| Click "Start the next book →" | N/A | Navigates to next book's first chapter |
| Click "View your reading progress →" | N/A | Navigates to `/insights` |

Bible reading is public, but progress tracking and celebrations require authentication (existing behavior — `markChapterRead` already no-ops when not authenticated).

---

## Integration 4: Reading Plan to Challenge Suggestion

### Current State

`PlanCompletionOverlay.tsx` fires when all days of a reading plan are completed. It shows plan title, "Plan Complete!" heading, total days, a 2 Timothy 4:7 verse, and a single **"Browse more plans"** button. Each reading plan has a `theme` property: `forgiveness`, `purpose`, `grief`, `relationships`, `trust`, `anxiety`, `healing`, `hope`, `gratitude`, `identity`.

Challenges have `season` properties: `lent`, `easter`, `pentecost`, `advent`, `newyear`. Challenge data includes participant counts (mock) and date ranges.

### Requirements

1. **Theme-to-season mapping**: When a reading plan is completed, map the plan's theme to relevant challenge seasons:

   | Plan Theme | Suggested Challenge Season(s) | Rationale |
   |-----------|------------------------------|-----------|
   | `anxiety` | Any active/upcoming challenge | Anxiety support is universal |
   | `grief`, `healing` | `lent` | Season of reflection and processing |
   | `gratitude` | `advent` | Gratitude seasons |
   | `forgiveness` | `lent` | Season of repentance and reconciliation |
   | `hope`, `trust` | `easter` | Season of hope and renewal |
   | `identity`, `purpose` | `newyear` | Fresh start / new beginnings |
   | `relationships` | Any active/upcoming challenge | Relationships are universal |

2. **Challenge matching logic**: After mapping, check if any challenge matching the suggested season(s) is currently active or starts within 30 days. Use the challenge calendar utilities to determine active/upcoming status. If multiple challenges match, prefer the one that is currently active over one that's upcoming.

3. **Suggestion card on completion overlay**: If a matching challenge is found, show a suggestion card below the existing plan completion content (above or alongside the "Browse more plans" button):
   - **"Continue your journey!"** heading
   - **"[Challenge Title] [is happening now / starts [Month Day]]."**
   - **"[X] people are participating."** (from mock challenge data)
   - **"Join Challenge →"** link to `/grow?tab=challenges`
   - Card styling: frosted glass (`bg-white/[0.08] border border-white/10 rounded-xl p-4`)

4. **Fallback**: If no matching challenge is found (no active/upcoming challenge matches the theme), show a generic suggestion: **"Looking for your next journey?"** with a **"Browse challenges →"** link to `/grow?tab=challenges`.

5. The existing "Browse more plans" button remains as-is. The challenge suggestion is an addition, not a replacement.

### Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior |
|--------|--------------------|--------------------|
| See plan completion overlay | N/A — reading plan progress requires login | Overlay fires with challenge suggestion |
| Click "Join Challenge →" | N/A | Navigates to `/grow?tab=challenges` |

Reading plan participation is already auth-gated. No additional gating needed.

---

## Integration 5: Badge to Feature Suggestion

### Current State

The badge celebration system has two tiers:
- **Toast tier** (`toast`, `toast-confetti`, `special-toast`): Auto-dismissing bottom-right toasts showing badge icon, name, and description.
- **Full-screen overlay tier** (`full-screen`): Full-screen celebration with large badge icon, name, encouragement message, scripture verse (for level badges), confetti, and a "Continue" button (appears after 6s delay).

The celebration queue processes full-screen badges first (max 2), then toast badges (max 5).

### Requirements

1. **Badge category to suggestion mapping**: Add a contextual "Try this next" suggestion to badge celebrations, based on the badge's category:

   | Badge Category | Suggestion Text | Link |
   |---------------|----------------|------|
   | `streak` (7d, 14d, 30d, etc.) | "Keep it going! Try a reading plan →" | `/grow?tab=plans` |
   | `activity` — prayer badges | "Try audio-guided prayer →" | `/daily?tab=pray` |
   | `activity` — journal badges | "Explore Bible highlighting →" | `/bible` |
   | `activity` — meditation badges | "Check your meditation trends →" | `/insights` |
   | `activity` — listen badges | "Discover ambient scenes →" | `/music` |
   | `activity` — prayer wall badges | "Join a challenge together →" | `/grow?tab=challenges` |
   | `activity` — reading plan badges | "Start another plan →" | `/grow?tab=plans` |
   | `activity` — Bible reading badges (new) | "Start a reading plan on what you read →" | `/grow?tab=plans` |
   | `community` | "Join a challenge together →" | `/grow?tab=challenges` |
   | `challenge` | "Keep growing! Try a new plan →" | `/grow?tab=plans` |
   | `level` | No suggestion (level celebrations already have rich content) | — |
   | `special` | No suggestion (welcome badge, full worship day are self-contained) | — |

2. **Toast tier rendering**: The suggestion appears as a **second line** below the badge description text in the toast. Style: `text-primary-lt text-xs hover:text-primary hover:underline transition-colors`. The link wraps the entire suggestion text. This keeps the toast compact — one extra line of small text.

3. **Full-screen overlay rendering**: The suggestion appears **below the badge description and above the "Continue" button**. Style: `text-primary-lt text-sm hover:text-primary hover:underline transition-colors mt-3`. Slightly larger than the toast version since there's more space.

4. **Suggestion is a link, not a button**: Clicking it navigates to the suggested feature AND dismisses the celebration (same as clicking Continue). On toast tier, clicking the suggestion dismisses the toast.

5. **Badge-specific matching**: For `activity` category badges, the suggestion depends on which specific badge was earned. Use the badge `id` prefix to determine the activity type:
   - IDs starting with `first_prayer`, `prayer_` → prayer suggestion
   - IDs starting with `first_journal`, `journal_` → journal suggestion
   - IDs starting with `first_meditate`, `meditation_` → meditation suggestion
   - IDs starting with `first_listen`, `listen_` → listen suggestion
   - IDs starting with `first_plan`, `plans_` → reading plan suggestion
   - IDs starting with `bible_book_` → Bible reading suggestion
   - IDs starting with `first_pray_wall`, `pray_wall_` → prayer wall suggestion

6. **No suggestion for level or special badges**: These celebrations already have rich, self-contained content (scripture verses, meaningful encouragement). Adding a feature suggestion would dilute the moment.

### Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior |
|--------|--------------------|--------------------|
| See badge celebration | N/A — badges require login | Badge fires with suggestion link |
| Click suggestion link | N/A | Navigates to suggested feature, dismisses celebration |

Badges are earned through authenticated activities only. No additional gating needed.

---

## Responsive Behavior

| Breakpoint | Int. 1 (Meditation Stats) | Int. 2 (Challenge CTAs) | Int. 3 (Bible Celebration) | Int. 4 (Plan → Challenge) | Int. 5 (Badge Suggestion) |
|-----------|--------------------------|------------------------|---------------------------|--------------------------|--------------------------|
| Mobile (< 640px) | Stat line full-width, insights link below CTAs | CTA cards stack single column | Inline card full-width, CTAs stack vertically | Suggestion card full-width below plan completion content | Toast suggestion is second line, overlay suggestion centered above Continue |
| Tablet (640-1024px) | Same as mobile | CTA cards 2-column grid | Same as mobile | Same as mobile | Same as mobile |
| Desktop (> 1024px) | Same as mobile (completion screen is centered column) | CTA cards 2-column grid (5th item centered) | Inline card full-width within max-width container | Same as mobile (overlay is centered) | Same as tablet |

All five integrations are additions to existing responsive layouts. No new breakpoint-specific behavior beyond what the host components already handle.

---

## AI Safety Considerations

N/A — None of these integrations involve AI-generated content or free-text user input. No crisis detection required. All content is system-generated text (stats, labels, badge names) and navigation links.

---

## Auth & Persistence

- **Logged-out users:** Cannot trigger any of these integrations. All five require authenticated state to reach the relevant completion/celebration screens.
- **Logged-in users:** All data read from existing localStorage keys. No new localStorage keys introduced (except `sessionStorage` for Bible book celebration card dismissal, which is ephemeral).
- **Existing keys used:** `wr_meditation_history`, `wr_bible_progress`, `wr_reading_plan_progress`, `wr_badges`, `wr_challenge_progress`

---

## Design Notes

- **Frosted glass CTA cards** (Integration 2, 4): `bg-white/[0.08] border border-white/10 rounded-xl p-3 hover:bg-white/[0.12] transition-colors` — matches the Dashboard Card Pattern from the design system recon but at a lighter density appropriate for overlay content.
- **Text link styling** (Integrations 1, 3, 5): `text-primary-lt text-sm hover:text-primary hover:underline transition-colors` — consistent with verse linking pattern from Batch 1 and the Ask page's `LinkedAnswerText`.
- **Bible completion card** (Integration 3): `bg-success/10 border border-success/30 rounded-xl p-4` — uses the success color palette (`#27AE60`) for a positive, celebratory feel distinct from the primary purple. Green checkmark icon reinforces completion.
- **Canvas share image** (Integration 2): Follows the existing pattern in `lib/challenge-share-canvas.ts` — 1080×1080px, gradient background from challenge theme color, Caveat font for title, Inter for details, progress bar, watermark.
- **Toast badge suggestion** (Integration 5): Uses `text-xs` to stay compact within the existing toast dimensions. The toast's current layout (`rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white backdrop-blur-md`) is unchanged.
- **No existing celebration visual design or animation is changed** — all additions sit within the existing celebration container patterns.
- Design system recon (`_plans/recon/design-system.md`) is referenced for color values and spacing patterns.

---

## Out of Scope

- Scrolling/highlighting the meditation history section on `/insights` when arriving via the link (basic navigation to `/insights` is sufficient; scroll-to-section is a nice-to-have)
- Real-time notifications for these integrations (uses existing celebration/toast systems)
- Backend API for any of these calculations (all client-side localStorage)
- Changes to existing celebration animations, confetti particles, or visual effects
- Adding Bible reading data to the Activity Correlations chart on `/insights` (the chart uses mock data)
- Verse linking within badge descriptions or challenge titles (covered by Batch 1's universal verse linking)
- Dark mode variants of the new UI elements (Phase 4)
- Push notifications for challenge suggestions or badge nudges

---

## Acceptance Criteria

### Integration 1: Meditation to Insights Link
- [ ] Meditation completion screen shows "You've meditated X times for Y total minutes" stat line with real data from `wr_meditation_history`
- [ ] Stat line appears above the CTA buttons (below weekly minutes display)
- [ ] "View your meditation trends →" link appears below all CTA buttons when user has 7+ meditation sessions
- [ ] The insights link does NOT appear when user has fewer than 7 sessions
- [ ] Link navigates to `/insights`
- [ ] Link styling: `text-primary-lt text-sm hover:text-primary hover:underline transition-colors`
- [ ] Both stat line and link only appear for authenticated users (inherits from meditation auth gating)

### Integration 2: Challenge Completion CTAs
- [ ] Challenge completion overlay shows 5 CTA cards in a grid layout (2 columns desktop, stacked mobile)
- [ ] Each card has icon, label, and brief description with frosted glass styling (`bg-white/[0.08] border border-white/10 rounded-xl p-3`)
- [ ] "See your growth →" navigates to `/`
- [ ] "Check the leaderboard →" navigates to `/friends?tab=leaderboard`
- [ ] "Share your achievement" generates a Canvas share image using `generateChallengeShareImage()` and triggers Web Share API (or downloads image as fallback)
- [ ] Share image includes challenge title, "Challenge Complete!", days completed, and badge name
- [ ] "Browse more plans →" navigates to `/grow?tab=plans`
- [ ] "Browse more challenges →" navigates to `/grow?tab=challenges`
- [ ] Auto-dismiss timer extended to 12 seconds (or disabled while CTA grid is interactive)
- [ ] Cards have `hover:bg-white/[0.12]` hover state

### Integration 3: Bible Book Completion Celebration
- [ ] Completing the last chapter of a Bible book triggers a `toast-confetti` celebration: "[Book Name] Complete! You've read all [X] chapters."
- [ ] 4 new Bible reading badges exist: "First Book" (1 book), "Bible Explorer" (5 books), "Deep Reader" (10 books), "Bible Master" (66 books)
- [ ] "First Book" and "Bible Explorer" are `toast-confetti` tier; "Deep Reader" and "Bible Master" are `full-screen` tier
- [ ] "Deep Reader" shows Psalm 119:105 verse; "Bible Master" shows 2 Timothy 3:16 verse
- [ ] Inline celebration card appears at top of chapter view after book completion with green checkmark
- [ ] Card shows "You've completed [Book Name]!" and newly earned badge name (if applicable)
- [ ] "View your reading progress →" link navigates to `/insights`
- [ ] "Start the next book →" link navigates to next book in canonical order (not shown for Revelation)
- [ ] Inline card is dismissible (X button); dismissal persists in sessionStorage per book slug
- [ ] Card reappears on next browser session (sessionStorage clears)
- [ ] Book completion detection correctly counts chapters against expected chapter count per book
- [ ] Badge engine correctly counts total completed books across all of `wr_bible_progress`

### Integration 4: Reading Plan to Challenge Suggestion
- [ ] Plan completion overlay shows a challenge suggestion card when a matching active/upcoming challenge exists
- [ ] Theme mapping: anxiety/relationships → any challenge; grief/healing/forgiveness → lent; gratitude → advent; hope/trust → easter; identity/purpose → newyear
- [ ] Matching challenge must be currently active or start within 30 days
- [ ] Suggestion card shows challenge title, status (happening now / starts date), participant count, and "Join Challenge →" link
- [ ] If no matching challenge found, shows generic "Looking for your next journey?" with "Browse challenges →" link
- [ ] "Browse more plans" button remains alongside the suggestion (not replaced)
- [ ] Suggestion card uses frosted glass styling (`bg-white/[0.08] border border-white/10 rounded-xl p-4`)

### Integration 5: Badge to Feature Suggestion
- [ ] Toast-tier badge celebrations show a suggestion link as a second line below the badge description
- [ ] Full-screen overlay celebrations show a suggestion link below the description and above "Continue"
- [ ] Streak badges suggest reading plans; prayer badges suggest audio-guided prayer; journal badges suggest Bible highlighting; meditation badges suggest insights; community badges suggest challenges; Bible reading badges suggest reading plans; challenge badges suggest reading plans
- [ ] Level and special badges show NO suggestion
- [ ] Suggestion text is a clickable link that navigates to the suggested feature
- [ ] Clicking the suggestion dismisses the celebration (toast or overlay)
- [ ] Toast suggestion styling: `text-primary-lt text-xs`
- [ ] Overlay suggestion styling: `text-primary-lt text-sm`

### General
- [ ] No existing celebration visual design, animation, or confetti behavior is changed
- [ ] All five integrations are for logged-in users only
- [ ] No new localStorage keys are introduced (sessionStorage for Bible card dismissal is ephemeral)
- [ ] All integrations are responsive (mobile, tablet, desktop)
