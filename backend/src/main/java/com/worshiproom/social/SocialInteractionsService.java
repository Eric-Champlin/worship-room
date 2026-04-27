package com.worshiproom.social;

import com.worshiproom.friends.FriendRelationshipRepository;
import com.worshiproom.friends.FriendRelationshipStatus;
import com.worshiproom.friends.InvalidInputException;
import com.worshiproom.friends.SelfActionException;
import com.worshiproom.friends.UserNotFoundException;
import com.worshiproom.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Encouragement / nudge / recap-dismissal write paths for Spec 2.5.4b.
 *
 * <p>All three methods enforce validation order specified in the spec
 * acceptance criteria: self-check → user-exists → friendship → cooldown
 * (nudge) → hourly cap → per-friend daily cap (encouragement).
 *
 * <p>Friends-domain exceptions ({@link SelfActionException},
 * {@link UserNotFoundException}, {@link InvalidInputException}) are reused
 * via cross-package import — caught by the deliberately-unscoped
 * {@link com.worshiproom.friends.FriendsExceptionHandler}.
 *
 * <p>{@link NotFriendsException} is the social-package version (HTTP 403),
 * NOT the friends-package version (HTTP 404).
 */
@Service
public class SocialInteractionsService {

    private static final ZoneOffset UTC = ZoneOffset.UTC;

    private final SocialInteractionRepository socialRepo;
    private final FriendRelationshipRepository relationshipRepo;
    private final UserRepository userRepository;
    private final SocialLimitsConfig limits;

    public SocialInteractionsService(SocialInteractionRepository socialRepo,
                                     FriendRelationshipRepository relationshipRepo,
                                     UserRepository userRepository,
                                     SocialLimitsConfig limits) {
        this.socialRepo = socialRepo;
        this.relationshipRepo = relationshipRepo;
        this.userRepository = userRepository;
        this.limits = limits;
    }

    @Transactional
    public SocialInteraction sendEncouragement(UUID fromUserId, UUID toUserId, String message) {
        if (fromUserId.equals(toUserId)) {
            throw new SelfActionException("Cannot send encouragement to yourself");
        }
        userRepository.findById(toUserId)
            .filter(u -> !u.isDeleted() && !u.isBanned())
            .orElseThrow(() -> new UserNotFoundException("Target user not found"));
        if (!relationshipRepo.existsByUserIdAndFriendUserIdAndStatus(
                fromUserId, toUserId, FriendRelationshipStatus.ACTIVE)) {
            throw new NotFriendsException("Cannot send encouragement to a non-friend");
        }
        OffsetDateTime hourAgo = OffsetDateTime.now(UTC).minusHours(1);
        OffsetDateTime dayAgo = OffsetDateTime.now(UTC).minusDays(1);
        long hourly = socialRepo.countByFromUserIdAndInteractionTypeAndCreatedAtGreaterThanEqual(
            fromUserId, SocialInteractionType.ENCOURAGEMENT, hourAgo);
        if (hourly >= limits.getEncouragement().getHourlyCapPerUser()) {
            throw new RateLimitedException(
                "Hourly encouragement cap reached. Please try again later.");
        }
        long perFriend = socialRepo
            .countByFromUserIdAndToUserIdAndInteractionTypeAndCreatedAtGreaterThanEqual(
                fromUserId, toUserId, SocialInteractionType.ENCOURAGEMENT, dayAgo);
        if (perFriend >= limits.getEncouragement().getDailyCapPerFriend()) {
            throw new RateLimitedException(
                "Daily encouragement cap for this friend reached.");
        }
        SocialInteraction row = new SocialInteraction(
            fromUserId, toUserId, SocialInteractionType.ENCOURAGEMENT,
            Map.of("message", message));
        return socialRepo.save(row);
    }

    @Transactional
    public SocialInteraction sendNudge(UUID fromUserId, UUID toUserId) {
        if (fromUserId.equals(toUserId)) {
            throw new SelfActionException("Cannot nudge yourself");
        }
        userRepository.findById(toUserId)
            .filter(u -> !u.isDeleted() && !u.isBanned())
            .orElseThrow(() -> new UserNotFoundException("Target user not found"));
        if (!relationshipRepo.existsByUserIdAndFriendUserIdAndStatus(
                fromUserId, toUserId, FriendRelationshipStatus.ACTIVE)) {
            throw new NotFriendsException("Cannot nudge a non-friend");
        }
        Optional<SocialInteraction> last = socialRepo
            .findFirstByFromUserIdAndToUserIdAndInteractionTypeOrderByCreatedAtDesc(
                fromUserId, toUserId, SocialInteractionType.NUDGE);
        if (last.isPresent()) {
            OffsetDateTime cutoff = OffsetDateTime.now(UTC)
                .minusDays(limits.getNudge().getCooldownDays());
            if (last.get().getCreatedAt().isAfter(cutoff)) {
                throw new NudgeCooldownException(
                    "Nudge cooldown active for this friend.");
            }
        }
        OffsetDateTime hourAgo = OffsetDateTime.now(UTC).minusHours(1);
        long hourly = socialRepo.countByFromUserIdAndInteractionTypeAndCreatedAtGreaterThanEqual(
            fromUserId, SocialInteractionType.NUDGE, hourAgo);
        if (hourly >= limits.getNudge().getHourlyCapPerUser()) {
            throw new RateLimitedException(
                "Hourly nudge cap reached. Please try again later.");
        }
        SocialInteraction row = new SocialInteraction(
            fromUserId, toUserId, SocialInteractionType.NUDGE, null);
        return socialRepo.save(row);
    }

    /**
     * Dismiss a weekly recap. Schema requires {@code to_user_id NOT NULL}
     * (Liquibase changeset 2026-04-27-011), so this self-action row sets
     * {@code to_user_id = from_user_id}. Future schema change to make
     * {@code to_user_id} nullable is out of scope.
     *
     * <p><b>FOOTGUN — read this before adding any read endpoint.</b>
     * Recap-dismissal rows are stored with {@code to_user_id == from_user_id}.
     * Any future query of the form
     * {@code SELECT * FROM social_interactions WHERE to_user_id = ?}
     * (e.g., "encouragements I received", "people who nudged me") MUST also
     * filter {@code interaction_type IN ('encouragement', 'nudge')} or
     * {@code interaction_type != 'recap_dismissal'} to exclude self-rows.
     * Without that filter, a user's own recap dismissals leak into their
     * received-interactions view. Indexed paths in changeset 2026-04-27-011
     * already include the {@code interaction_type} column so this filter is
     * cheap; the failure mode is purely a logic bug, not a performance one.
     *
     * @param fromUserId  the user dismissing the recap
     * @param weekStart   ISO-8601 date (YYYY-MM-DD); already validated by
     *                    {@code @Pattern} on the request DTO, but a defensive
     *                    parse remains so any future direct caller still gets
     *                    {@code INVALID_INPUT} on bad input.
     */
    @Transactional
    public SocialInteraction dismissRecap(UUID fromUserId, String weekStart) {
        try {
            LocalDate.parse(weekStart);
        } catch (DateTimeParseException e) {
            throw new InvalidInputException(
                "weekStart must be a valid YYYY-MM-DD date");
        }
        SocialInteraction row = new SocialInteraction(
            fromUserId, fromUserId,
            SocialInteractionType.RECAP_DISMISSAL,
            Map.of("weekStart", weekStart));
        return socialRepo.save(row);
    }
}
