package com.worshiproom.friends;

import com.worshiproom.activity.constants.LevelThresholds;
import com.worshiproom.friends.dto.FriendDto;
import com.worshiproom.friends.dto.FriendRequestDto;
import com.worshiproom.friends.dto.UserSearchResultDto;
import com.worshiproom.user.DisplayNamePreference;
import com.worshiproom.user.DisplayNameResolver;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class FriendsService {

    /** UNIQUE constraint name from changeset 2026-04-27-010. Used to translate
     *  DataIntegrityViolationException -> DuplicateFriendRequestException. */
    private static final String UNIQUE_CONSTRAINT_NAME =
        "friend_requests_unique_sender_recipient";

    /** Search query minimum length to avoid full-table scans. */
    private static final int SEARCH_MIN_QUERY_LENGTH = 2;

    /** Hard cap on search result size. */
    private static final int SEARCH_MAX_LIMIT = 50;

    private final FriendRelationshipRepository relationshipRepo;
    private final FriendRequestRepository requestRepo;
    private final UserRepository userRepository;

    public FriendsService(FriendRelationshipRepository relationshipRepo,
                          FriendRequestRepository requestRepo,
                          UserRepository userRepository) {
        this.relationshipRepo = relationshipRepo;
        this.requestRepo = requestRepo;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<FriendDto> listFriends(UUID userId, OffsetDateTime weekStart) {
        List<FriendsListProjection> rows = relationshipRepo.findFriendsListForUser(userId, weekStart);
        List<FriendDto> result = new ArrayList<>(rows.size());
        for (FriendsListProjection p : rows) {
            DisplayNamePreference pref = DisplayNamePreference.fromDbValue(p.getDisplayNamePreference());
            String displayName = DisplayNameResolver.resolve(
                p.getFirstName(), p.getLastName(), p.getCustomDisplayName(), pref);
            String levelName = LevelThresholds.levelForPoints(p.getFaithPoints()).name();
            Instant lastActiveInstant = p.getLastActiveAt();
            OffsetDateTime lastActive = lastActiveInstant == null
                ? null
                : lastActiveInstant.atOffset(ZoneOffset.UTC);
            result.add(new FriendDto(
                p.getFriendUserId(),
                displayName,
                p.getAvatarUrl(),
                p.getLevel(),
                levelName,
                p.getCurrentStreak(),
                p.getFaithPoints(),
                p.getWeeklyPoints(),
                lastActive
            ));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<FriendRequestDto> listIncomingPendingRequests(UUID userId) {
        List<FriendRequest> rows = requestRepo.findAllByToUserIdAndStatus(userId, FriendRequestStatus.PENDING);
        if (rows.isEmpty()) return List.of();
        Set<UUID> senderIds = rows.stream().map(FriendRequest::getFromUserId).collect(Collectors.toSet());
        Map<UUID, User> sendersById = userRepository.findAllById(senderIds).stream()
            .collect(Collectors.toMap(User::getId, Function.identity()));
        List<FriendRequestDto> result = new ArrayList<>(rows.size());
        for (FriendRequest r : rows) {
            User sender = sendersById.get(r.getFromUserId());
            String displayName = sender != null ? DisplayNameResolver.resolve(sender) : "(unknown)";
            String avatarUrl = sender != null ? sender.getAvatarUrl() : null;
            result.add(new FriendRequestDto(
                r.getId(),
                r.getFromUserId(),
                null,
                displayName,
                avatarUrl,
                r.getMessage(),
                r.getStatus().value(),
                r.getCreatedAt(),
                r.getRespondedAt()
            ));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<FriendRequestDto> listOutgoingPendingRequests(UUID userId) {
        List<FriendRequest> rows = requestRepo.findAllByFromUserIdAndStatus(userId, FriendRequestStatus.PENDING);
        if (rows.isEmpty()) return List.of();
        Set<UUID> recipientIds = rows.stream().map(FriendRequest::getToUserId).collect(Collectors.toSet());
        Map<UUID, User> recipientsById = userRepository.findAllById(recipientIds).stream()
            .collect(Collectors.toMap(User::getId, Function.identity()));
        List<FriendRequestDto> result = new ArrayList<>(rows.size());
        for (FriendRequest r : rows) {
            User recipient = recipientsById.get(r.getToUserId());
            String displayName = recipient != null ? DisplayNameResolver.resolve(recipient) : "(unknown)";
            String avatarUrl = recipient != null ? recipient.getAvatarUrl() : null;
            result.add(new FriendRequestDto(
                r.getId(),
                null,
                r.getToUserId(),
                displayName,
                avatarUrl,
                r.getMessage(),
                r.getStatus().value(),
                r.getCreatedAt(),
                r.getRespondedAt()
            ));
        }
        return result;
    }

    @Transactional
    public FriendRequest sendRequest(UUID fromUserId, UUID toUserId, String message) {
        if (fromUserId.equals(toUserId)) {
            throw new SelfActionException("Cannot send friend request to yourself");
        }
        userRepository.findById(toUserId)
            .filter(u -> !u.isDeleted() && !u.isBanned())
            .orElseThrow(() -> new UserNotFoundException("Target user not found"));
        if (relationshipRepo.isEitherDirectionBlocked(fromUserId, toUserId)) {
            throw new BlockedUserException("Cannot send friend request to a blocked user");
        }
        if (relationshipRepo.existsByUserIdAndFriendUserIdAndStatus(
                fromUserId, toUserId, FriendRelationshipStatus.ACTIVE)) {
            throw new AlreadyFriendsException("Already friends with this user");
        }
        FriendRequest req = new FriendRequest(fromUserId, toUserId, message);
        try {
            return requestRepo.saveAndFlush(req);
        } catch (DataIntegrityViolationException e) {
            if (isUniqueConstraintViolation(e)) {
                throw new DuplicateFriendRequestException(
                    "A friend request from this sender to this recipient already exists");
            }
            throw e;
        }
    }

    @Transactional
    public void acceptRequest(UUID requestId, UUID actingUserId) {
        FriendRequest req = requestRepo.findById(requestId)
            .orElseThrow(() -> new FriendRequestNotFoundException("Friend request not found"));
        if (!req.getToUserId().equals(actingUserId)) {
            throw new UnauthorizedActionException("Only the recipient can accept this request");
        }
        if (req.getStatus() != FriendRequestStatus.PENDING) {
            throw new InvalidRequestStateException(
                "Request is not pending; cannot accept (current status: " + req.getStatus().value() + ")");
        }
        // Re-check block AFTER the original send (D8) — guards against block placed mid-flight
        if (relationshipRepo.isEitherDirectionBlocked(req.getFromUserId(), req.getToUserId())) {
            throw new BlockedUserException("Block in place; cannot accept friend request");
        }
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        req.setStatus(FriendRequestStatus.ACCEPTED);
        req.setRespondedAt(now);
        requestRepo.save(req);
        relationshipRepo.save(new FriendRelationship(
            req.getFromUserId(), req.getToUserId(), FriendRelationshipStatus.ACTIVE));
        relationshipRepo.save(new FriendRelationship(
            req.getToUserId(), req.getFromUserId(), FriendRelationshipStatus.ACTIVE));
    }

    @Transactional
    public void declineRequest(UUID requestId, UUID actingUserId) {
        FriendRequest req = requestRepo.findById(requestId)
            .orElseThrow(() -> new FriendRequestNotFoundException("Friend request not found"));
        if (!req.getToUserId().equals(actingUserId)) {
            throw new UnauthorizedActionException("Only the recipient can decline this request");
        }
        if (req.getStatus() != FriendRequestStatus.PENDING) {
            throw new InvalidRequestStateException(
                "Request is not pending; cannot decline (current status: " + req.getStatus().value() + ")");
        }
        req.setStatus(FriendRequestStatus.DECLINED);
        req.setRespondedAt(OffsetDateTime.now(ZoneOffset.UTC));
        requestRepo.save(req);
    }

    @Transactional
    public void cancelRequest(UUID requestId, UUID actingUserId) {
        FriendRequest req = requestRepo.findById(requestId)
            .orElseThrow(() -> new FriendRequestNotFoundException("Friend request not found"));
        if (!req.getFromUserId().equals(actingUserId)) {
            throw new UnauthorizedActionException("Only the sender can cancel this request");
        }
        if (req.getStatus() != FriendRequestStatus.PENDING) {
            throw new InvalidRequestStateException(
                "Request is not pending; cannot cancel (current status: " + req.getStatus().value() + ")");
        }
        req.setStatus(FriendRequestStatus.CANCELLED);
        req.setRespondedAt(OffsetDateTime.now(ZoneOffset.UTC));
        requestRepo.save(req);
    }

    @Transactional
    public void removeFriend(UUID actingUserId, UUID friendUserId) {
        if (actingUserId.equals(friendUserId)) {
            throw new SelfActionException("Cannot remove yourself");
        }
        boolean wereFriends = relationshipRepo.existsByUserIdAndFriendUserIdAndStatus(
            actingUserId, friendUserId, FriendRelationshipStatus.ACTIVE);
        if (!wereFriends) {
            throw new NotFriendsException("No active friendship with this user");
        }
        relationshipRepo.deleteActiveBothDirections(actingUserId, friendUserId);
    }

    @Transactional
    public void blockUser(UUID blockerId, UUID blockedId) {
        if (blockerId.equals(blockedId)) {
            throw new SelfActionException("Cannot block yourself");
        }
        userRepository.findById(blockedId)
            .orElseThrow(() -> new UserNotFoundException("Target user not found"));
        // Idempotent: already blocked -> no-op (D9)
        if (relationshipRepo.existsByUserIdAndFriendUserIdAndStatus(
                blockerId, blockedId, FriendRelationshipStatus.BLOCKED)) {
            return;
        }
        // (a) Break any existing friendship (active rows only — preserves any
        //     reverse-direction block placed independently by the other party).
        relationshipRepo.deleteActiveBothDirections(blockerId, blockedId);
        // (b) Delete pending requests in either direction (Divergence 3)
        requestRepo.deletePendingBetween(blockerId, blockedId);
        // (c) Insert single block row from blocker -> blocked
        relationshipRepo.save(new FriendRelationship(
            blockerId, blockedId, FriendRelationshipStatus.BLOCKED));
    }

    @Transactional
    public void unblockUser(UUID blockerId, UUID blockedId) {
        if (blockerId.equals(blockedId)) {
            throw new SelfActionException("Cannot unblock yourself");
        }
        boolean wasBlocked = relationshipRepo.existsByUserIdAndFriendUserIdAndStatus(
            blockerId, blockedId, FriendRelationshipStatus.BLOCKED);
        if (!wasBlocked) {
            throw new NotBlockedException("This user is not blocked");
        }
        // Precise single-row delete: must NOT touch any reverse-direction block
        // the other party may have placed independently.
        relationshipRepo.deleteByUserIdAndFriendUserIdAndStatus(
            blockerId, blockedId, FriendRelationshipStatus.BLOCKED);
    }

    @Transactional(readOnly = true)
    public List<UserSearchResultDto> searchUsers(UUID actingUserId, String nameQuery, int limit) {
        String trimmed = nameQuery == null ? "" : nameQuery.trim();
        if (trimmed.length() < SEARCH_MIN_QUERY_LENGTH) {
            throw new InvalidInputException(
                "Search query must be at least " + SEARCH_MIN_QUERY_LENGTH + " characters");
        }
        int clampedLimit = Math.min(limit, SEARCH_MAX_LIMIT);
        if (clampedLimit < 1) clampedLimit = 1;
        Pageable pageable = PageRequest.of(0, clampedLimit);
        List<User> users = relationshipRepo.searchUsersExcludingBlocks(
            actingUserId, trimmed, pageable);
        return users.stream()
            .map(u -> new UserSearchResultDto(
                u.getId(), DisplayNameResolver.resolve(u), u.getAvatarUrl()))
            .toList();
    }

    private boolean isUniqueConstraintViolation(DataIntegrityViolationException e) {
        Throwable cur = e;
        while (cur != null) {
            String msg = cur.getMessage();
            if (msg != null && msg.contains(UNIQUE_CONSTRAINT_NAME)) {
                return true;
            }
            if (cur.getCause() == cur) break;
            cur = cur.getCause();
        }
        return false;
    }
}
