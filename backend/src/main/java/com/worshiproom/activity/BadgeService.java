package com.worshiproom.activity;

import com.worshiproom.activity.constants.BadgeCatalog;
import com.worshiproom.activity.constants.BadgeThresholds;
import com.worshiproom.activity.constants.BibleBooks;
import com.worshiproom.activity.dto.ActivityCountsSnapshot;
import com.worshiproom.activity.dto.BadgeDefinition;
import com.worshiproom.activity.dto.BadgeResult;
import com.worshiproom.activity.dto.ListeningSession;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Badge eligibility service. Pure function — no Spring dependencies, no
 * database access, no logging, no instrumentation.
 *
 * <p>Faithful port of {@code checkForNewBadges}
 * (frontend/src/services/badge-engine.ts). Runs the 15 eligibility
 * categories in the SAME ORDER as the frontend and produces byte-identical
 * output for byte-identical inputs. Spec 2.8's drift-detection test will
 * assert this guarantee.
 *
 * <p>Welcome and challenge badges (8 IDs total) are NOT exercised by this
 * service — those are granted by other code paths (registration flow and
 * challenge completion). Their metadata IS in {@link BadgeCatalog} for
 * lookup. See Spec 2.4 § Divergence 2.
 *
 * <p>Spec 2.6 will compose this service with {@link BadgeRepository} to
 * read the user's already-earned badges, calculate new eligibility, and
 * persist newly-earned rows (incrementing {@code display_count} for
 * repeatable badges).
 */
@Service
public class BadgeService {

    private static final Map<ActivityType, Map<Integer, String>> ACTIVITY_BADGE_MAP = Map.of(
        ActivityType.PRAY,         Map.of(1, "first_prayer", 100, "prayer_100"),
        ActivityType.JOURNAL,      Map.of(1, "first_journal", 50, "journal_50", 100, "journal_100"),
        ActivityType.MEDITATE,     Map.of(1, "first_meditate", 25, "meditate_25"),
        ActivityType.LISTEN,       Map.of(1, "first_listen", 50, "listen_50"),
        ActivityType.PRAYER_WALL,  Map.of(1, "first_prayerwall")
    );

    private static final Map<Integer, String> FRIEND_BADGE_MAP = Map.of(1, "first_friend", 10, "friends_10");
    private static final Map<Integer, String> ENCOURAGE_BADGE_MAP = Map.of(10, "encourage_10", 50, "encourage_50");
    private static final Map<Integer, String> READING_PLAN_BADGE_MAP = Map.of(1, "first_plan", 3, "plans_3", 10, "plans_10");
    private static final Map<Integer, String> BIBLE_BOOK_BADGE_MAP = Map.of(
        1, "bible_book_1", 5, "bible_book_5", 10, "bible_book_10", 66, "bible_book_66");
    private static final Map<Integer, String> MEDITATION_BADGE_MAP = Map.of(
        10, "meditate_10", 50, "meditate_50", 100, "meditate_100");
    private static final Map<Integer, String> PRAYER_POST_BADGE_MAP = Map.of(
        1, "prayerwall_first_post", 10, "prayerwall_10_posts");
    private static final Map<Integer, String> BIBLE_CHAPTER_BADGE_MAP = Map.of(
        1, "bible_first_chapter", 10, "bible_10_chapters", 25, "bible_25_chapters");
    private static final Map<Integer, String> GRATITUDE_TOTAL_BADGE_MAP = Map.of(
        30, "gratitude_30_days", 100, "gratitude_100_days");

    /**
     * Run the 16 eligibility categories against the supplied context, apply
     * the idempotency-vs-repeatability filter, and return the badges newly
     * earned by this call.
     *
     * @param context              the comprehensive input snapshot
     * @param alreadyEarnedBadgeIds badge IDs the user has already earned
     * @return parallel-indexed result containing IDs and full definitions
     * @throws IllegalArgumentException if either argument is {@code null}
     */
    public BadgeResult checkBadges(BadgeCheckContext context, Set<String> alreadyEarnedBadgeIds) {
        if (context == null) {
            throw new IllegalArgumentException("context must not be null");
        }
        if (alreadyEarnedBadgeIds == null) {
            throw new IllegalArgumentException("alreadyEarnedBadgeIds must not be null");
        }

        List<String> candidates = new ArrayList<>();
        candidates.addAll(streakBadges(context));
        candidates.addAll(levelBadges(context));
        candidates.addAll(activityMilestoneBadges(context));
        candidates.addAll(fullWorshipDay(context));
        candidates.addAll(communityBadges(context));
        candidates.addAll(readingPlanBadges(context));
        candidates.addAll(localSupportSeeker(context));
        candidates.addAll(bibleBookBadges(context));
        candidates.addAll(meditationSessionBadges(context));
        candidates.addAll(prayerWallPostBadges(context));
        candidates.addAll(intercessor(context));
        candidates.addAll(faithfulWatcher(context));
        candidates.addAll(bibleChapterBadges(context));
        candidates.addAll(gratitudeBadges(context));
        candidates.addAll(localFirstVisit(context));
        candidates.addAll(worshipListener(context));

        List<String> survivors = applyEarnedFilter(candidates, alreadyEarnedBadgeIds);
        List<BadgeDefinition> defs = hydrate(survivors);
        return new BadgeResult(survivors, defs);
    }

    // === Per-category helpers (15) ===

    private List<String> streakBadges(BadgeCheckContext c) {
        List<String> out = new ArrayList<>();
        for (int t : BadgeThresholds.STREAK) {
            if (c.currentStreak() >= t) {
                out.add("streak_" + t);
            }
        }
        return out;
    }

    private List<String> levelBadges(BadgeCheckContext c) {
        return List.of("level_" + c.currentLevel());
    }

    private List<String> activityMilestoneBadges(BadgeCheckContext c) {
        List<String> out = new ArrayList<>();
        for (Map.Entry<ActivityType, int[]> entry : BadgeThresholds.ACTIVITY_MILESTONES.entrySet()) {
            ActivityType type = entry.getKey();
            int count = getCount(type, c.activityCounts());
            for (int threshold : entry.getValue()) {
                String badgeId = ACTIVITY_BADGE_MAP.get(type).get(threshold);
                if (badgeId != null && count >= threshold) {
                    out.add(badgeId);
                }
            }
        }
        return out;
    }

    private List<String> fullWorshipDay(BadgeCheckContext c) {
        Set<ActivityType> today = c.todayActivities();
        boolean baseAllTrue =
            today.contains(ActivityType.MOOD)
            && today.contains(ActivityType.PRAY)
            && today.contains(ActivityType.LISTEN)
            && today.contains(ActivityType.PRAYER_WALL)
            && today.contains(ActivityType.MEDITATE)
            && today.contains(ActivityType.JOURNAL);

        boolean hasActivePlan = c.readingPlanProgress().stream()
            .anyMatch(p -> p.completedAt() == null);

        boolean allTrue = hasActivePlan
            ? baseAllTrue && today.contains(ActivityType.READING_PLAN)
            : baseAllTrue;

        if (allTrue && !c.allActivitiesWereTrueBefore()) {
            return List.of("full_worship_day");
        }
        return List.of();
    }

    private List<String> communityBadges(BadgeCheckContext c) {
        List<String> out = new ArrayList<>();
        for (int t : BadgeThresholds.FRIENDS) {
            String id = FRIEND_BADGE_MAP.get(t);
            if (id != null && c.friendCount() >= t) {
                out.add(id);
            }
        }
        for (int t : BadgeThresholds.ENCOURAGEMENTS) {
            String id = ENCOURAGE_BADGE_MAP.get(t);
            if (id != null && c.activityCounts().encouragementsSent() >= t) {
                out.add(id);
            }
        }
        return out;
    }

    private List<String> readingPlanBadges(BadgeCheckContext c) {
        List<String> out = new ArrayList<>();
        long completedCount = c.readingPlanProgress().stream()
            .filter(p -> p.completedAt() != null)
            .count();
        for (int t : BadgeThresholds.READING_PLAN_COMPLETIONS) {
            String id = READING_PLAN_BADGE_MAP.get(t);
            if (id != null && completedCount >= t) {
                out.add(id);
            }
        }
        return out;
    }

    private List<String> localSupportSeeker(BadgeCheckContext c) {
        if (c.localVisits().totalUniqueVisits() >= BadgeThresholds.LOCAL_SUPPORT_VISITS) {
            return List.of("local_support_5");
        }
        return List.of();
    }

    private List<String> bibleBookBadges(BadgeCheckContext c) {
        List<String> out = new ArrayList<>();
        int completedBooks = 0;
        for (BibleBooks.Book book : BibleBooks.ALL) {
            Set<Integer> chapters = c.bibleProgress().chaptersByBook().getOrDefault(book.slug(), Set.of());
            if (chapters.size() >= book.chapters()) {
                completedBooks++;
            }
        }
        for (int t : BadgeThresholds.BIBLE_BOOKS) {
            String id = BIBLE_BOOK_BADGE_MAP.get(t);
            if (id != null && completedBooks >= t) {
                out.add(id);
            }
        }
        return out;
    }

    private List<String> meditationSessionBadges(BadgeCheckContext c) {
        List<String> out = new ArrayList<>();
        int sessions = c.meditationHistory().size();
        for (int t : BadgeThresholds.MEDITATION_SESSIONS) {
            String id = MEDITATION_BADGE_MAP.get(t);
            if (id != null && sessions >= t) {
                out.add(id);
            }
        }
        return out;
    }

    private List<String> prayerWallPostBadges(BadgeCheckContext c) {
        List<String> out = new ArrayList<>();
        for (int t : BadgeThresholds.PRAYER_WALL_POSTS) {
            String id = PRAYER_POST_BADGE_MAP.get(t);
            if (id != null && c.activityCounts().prayerWallPosts() >= t) {
                out.add(id);
            }
        }
        return out;
    }

    private List<String> intercessor(BadgeCheckContext c) {
        if (c.activityCounts().intercessionCount() >= BadgeThresholds.INTERCESSIONS) {
            return List.of("prayerwall_25_intercessions");
        }
        return List.of();
    }

    private List<String> faithfulWatcher(BadgeCheckContext c) {
        if (c.activityCounts().quickLiftCount() >= BadgeThresholds.QUICK_LIFTS) {
            return List.of("faithful_watcher");
        }
        return List.of();
    }

    private List<String> bibleChapterBadges(BadgeCheckContext c) {
        List<String> out = new ArrayList<>();
        int totalChapters = 0;
        for (Set<Integer> chapters : c.bibleProgress().chaptersByBook().values()) {
            totalChapters += chapters.size();
        }
        for (int t : BadgeThresholds.BIBLE_CHAPTERS) {
            String id = BIBLE_CHAPTER_BADGE_MAP.get(t);
            if (id != null && totalChapters >= t) {
                out.add(id);
            }
        }
        return out;
    }

    private List<String> gratitudeBadges(BadgeCheckContext c) {
        List<String> out = new ArrayList<>();
        Set<LocalDate> uniqueDates = new TreeSet<>(c.gratitudeEntries().dates());
        int totalDays = uniqueDates.size();

        for (int t : BadgeThresholds.GRATITUDE_TOTAL_DAYS) {
            String id = GRATITUDE_TOTAL_BADGE_MAP.get(t);
            if (id != null && totalDays >= t) {
                out.add(id);
            }
        }

        if (totalDays >= BadgeThresholds.GRATITUDE_CONSECUTIVE_STREAK) {
            List<LocalDate> sorted = new ArrayList<>(uniqueDates);
            int currentRun = 1;
            int maxRun = 1;
            for (int i = 1; i < sorted.size(); i++) {
                long diff = ChronoUnit.DAYS.between(sorted.get(i - 1), sorted.get(i));
                if (diff == 1L) {
                    currentRun++;
                    if (currentRun > maxRun) maxRun = currentRun;
                } else {
                    currentRun = 1;
                }
            }
            if (maxRun >= BadgeThresholds.GRATITUDE_CONSECUTIVE_STREAK) {
                out.add("gratitude_7_streak");
            }
        }
        return out;
    }

    private List<String> localFirstVisit(BadgeCheckContext c) {
        if (c.localVisits().totalUniqueVisits() >= BadgeThresholds.LOCAL_FIRST_VISIT) {
            return List.of("local_first_visit");
        }
        return List.of();
    }

    private List<String> worshipListener(BadgeCheckContext c) {
        long totalSeconds = 0L;
        for (ListeningSession s : c.listeningHistory()) {
            totalSeconds += s.durationSeconds();
        }
        if (totalSeconds >= BadgeThresholds.LISTEN_10_HOURS_SECONDS) {
            return List.of("listen_10_hours");
        }
        return List.of();
    }

    // === Filter and hydrate ===

    private List<String> applyEarnedFilter(List<String> candidates, Set<String> alreadyEarned) {
        List<String> survivors = new ArrayList<>();
        LinkedHashSet<String> seen = new LinkedHashSet<>();
        for (String id : candidates) {
            if (!seen.add(id)) continue; // dedup, preserve order
            boolean repeatable = BadgeCatalog.lookup(id).map(BadgeDefinition::repeatable).orElse(false);
            if (alreadyEarned.contains(id) && !repeatable) continue;
            survivors.add(id);
        }
        return survivors;
    }

    private List<BadgeDefinition> hydrate(List<String> ids) {
        List<BadgeDefinition> out = new ArrayList<>(ids.size());
        for (String id : ids) {
            BadgeCatalog.lookup(id).ifPresent(out::add);
        }
        return out;
    }

    /**
     * Look up the count for the given activity type in a snapshot.
     * Returns 0 for any {@link ActivityType} that doesn't have a counter
     * (mirrors the frontend's {@code typeof count !== 'number'} guard).
     */
    private int getCount(ActivityType type, ActivityCountsSnapshot counts) {
        return switch (type) {
            case PRAY -> counts.pray();
            case JOURNAL -> counts.journal();
            case MEDITATE -> counts.meditate();
            case LISTEN -> counts.listen();
            case PRAYER_WALL -> counts.prayerWall();
            case READING_PLAN -> counts.readingPlan();
            case GRATITUDE -> counts.gratitude();
            case REFLECTION -> counts.reflection();
            case INTERCESSION -> counts.intercessionCount();
            case QUICK_LIFT -> counts.quickLiftCount();
            case MOOD, CHALLENGE, LOCAL_VISIT, DEVOTIONAL -> 0;
        };
    }
}
