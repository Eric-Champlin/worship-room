package com.worshiproom.post;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostRepository extends JpaRepository<Post, UUID>, JpaSpecificationExecutor<Post> {

    /**
     * Lookup for write paths (PATCH/DELETE). Returns a live post regardless of
     * visibility — author ownership is enforced at the service layer, not the
     * query layer (different from read paths which use the visibility predicate).
     *
     * Returns empty when the post does not exist OR is soft-deleted. Both cases
     * map to 404 POST_NOT_FOUND in PostService.updatePost / deletePost.
     */
    Optional<Post> findByIdAndIsDeletedFalse(UUID id);

    /**
     * For DELETE idempotency: when a soft-deleted post is DELETE'd again, the
     * service short-circuits to 204 instead of 404. This finder lets the
     * service distinguish "never existed" from "already deleted".
     */
    Optional<Post> findByIdAndIsDeletedTrue(UUID id);
}
