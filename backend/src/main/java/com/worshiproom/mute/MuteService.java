package com.worshiproom.mute;

import com.worshiproom.mute.dto.MutedUserDto;
import com.worshiproom.user.DisplayNamePreference;
import com.worshiproom.user.DisplayNameResolver;
import com.worshiproom.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class MuteService {

    private final UserMuteRepository muteRepository;
    private final UserRepository userRepository;

    public MuteService(UserMuteRepository muteRepository, UserRepository userRepository) {
        this.muteRepository = muteRepository;
        this.userRepository = userRepository;
    }

    /**
     * Mute a user. Idempotent: muting an already-muted target is a no-op
     * (no exception, no duplicate row insert). Mirrors blockUser's
     * idempotent-on-already-blocked semantic from Spec 2.5.2.
     *
     * @throws SelfActionException   when muterId equals mutedId (400)
     * @throws UserNotFoundException when the target user doesn't exist (404)
     */
    @Transactional
    public void muteUser(UUID muterId, UUID mutedId) {
        if (muterId.equals(mutedId)) {
            throw new SelfActionException("Cannot mute yourself");
        }
        // Verify target exists. Don't filter on isDeleted/isBanned — the mute
        // itself is harmless either way; the muter is making the unilateral
        // decision based on past content. See Spec 2.5.7.
        userRepository.findById(mutedId)
            .orElseThrow(() -> new UserNotFoundException("Target user not found"));
        // Idempotent: already muted -> no-op
        if (muteRepository.existsById(new UserMuteId(muterId, mutedId))) {
            return;
        }
        muteRepository.save(new UserMute(muterId, mutedId));
    }

    /**
     * Unmute a user. Throws NotMutedException if no mute row exists. The
     * strict-error semantic (vs. unblockUser's permissive) matches the spec:
     * unmute is initiated from the Settings list of muted users, so the row
     * should always exist when this fires. A 404 surfaces the race
     * (e.g. concurrent unmute from another tab) cleanly.
     *
     * @throws SelfActionException when muterId equals mutedId (400)
     * @throws NotMutedException   when no mute row exists (404)
     */
    @Transactional
    public void unmuteUser(UUID muterId, UUID mutedId) {
        if (muterId.equals(mutedId)) {
            throw new SelfActionException("Cannot unmute yourself");
        }
        UserMuteId id = new UserMuteId(muterId, mutedId);
        if (!muteRepository.existsById(id)) {
            throw new NotMutedException("This user is not muted");
        }
        muteRepository.deleteById(id);
    }

    /**
     * List the muter's mutes ordered by recency. Resolves displayName
     * server-side via DisplayNameResolver. Includes targets that are deleted
     * or banned (defensive — muter can still see and unmute).
     */
    @Transactional(readOnly = true)
    public List<MutedUserDto> listMutedUsers(UUID muterId) {
        List<MutedUserProjection> rows = muteRepository.findMutedUsersForMuter(muterId);
        List<MutedUserDto> result = new ArrayList<>(rows.size());
        for (MutedUserProjection p : rows) {
            DisplayNamePreference pref = DisplayNamePreference.fromDbValue(p.getDisplayNamePreference());
            String displayName = DisplayNameResolver.resolve(
                p.getFirstName(), p.getLastName(), p.getCustomDisplayName(), pref);
            // Spring Data interface projections expose TIMESTAMP WITH TIME ZONE
            // as Instant — convert to OffsetDateTime (UTC) for the DTO.
            OffsetDateTime mutedAt = p.getMutedAt().atOffset(ZoneOffset.UTC);
            result.add(new MutedUserDto(
                p.getMutedUserId(),
                displayName,
                p.getAvatarUrl(),
                mutedAt
            ));
        }
        return result;
    }

    /**
     * Primary-key existence check. Phase 3 feed-filter integration will call
     * this from FeedService — present today even though no consumer fires it
     * yet (per Spec 2.5.7 Divergence 3).
     */
    @Transactional(readOnly = true)
    public boolean isMuted(UUID muterId, UUID mutedId) {
        return muteRepository.existsById(new UserMuteId(muterId, mutedId));
    }
}
