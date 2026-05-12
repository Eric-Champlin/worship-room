package com.worshiproom.post.dto;

import java.util.UUID;

/**
 * A friend of the post author who reacted with "praying" (Spec 6.1).
 *
 * <p>Sorted alphabetically by display name on the wire (case-insensitive,
 * see {@link com.worshiproom.post.PrayerReceiptService#buildReceipt}).
 *
 * <p>{@code displayName} is resolved via
 * {@link com.worshiproom.user.DisplayNameResolver} from the friend's
 * own display-name preference + custom name + first/last name fields.
 *
 * <p>{@code avatarUrl} is nullable — friends without avatars send {@code null}.
 *
 * <p>Privacy: this DTO only ever represents FRIENDS of the post author.
 * Non-friend intercessors are counted in
 * {@link PrayerReceiptResponse#anonymousCount} and their identity is
 * never on the wire (Gate-32).
 */
public record AttributedIntercessor(
        UUID userId,
        String displayName,
        String avatarUrl
) {}
