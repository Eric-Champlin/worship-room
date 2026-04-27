package com.worshiproom.friends;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FriendRequestRepository extends JpaRepository<FriendRequest, UUID> {

    List<FriendRequest> findAllByToUserIdAndStatus(UUID toUserId, FriendRequestStatus status);

    List<FriendRequest> findAllByFromUserIdAndStatus(UUID fromUserId, FriendRequestStatus status);

    Optional<FriendRequest> findByFromUserIdAndToUserId(UUID fromUserId, UUID toUserId);

    /**
     * Hard-delete pending requests in either direction. Used by blockUser
     * (Divergence 3 - block deletes pending, leaves accepted/declined/cancelled
     * untouched).
     */
    @Modifying
    @Query("""
        DELETE FROM FriendRequest fr
        WHERE ((fr.fromUserId = :a AND fr.toUserId = :b)
            OR (fr.fromUserId = :b AND fr.toUserId = :a))
          AND fr.status = com.worshiproom.friends.FriendRequestStatus.PENDING
        """)
    int deletePendingBetween(@Param("a") UUID a, @Param("b") UUID b);
}
