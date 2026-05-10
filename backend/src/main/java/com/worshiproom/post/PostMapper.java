package com.worshiproom.post;

import com.worshiproom.post.dto.AuthorDto;
import com.worshiproom.post.dto.PostDto;
import com.worshiproom.post.dto.PostImageDto;
import com.worshiproom.storage.ObjectStorageAdapter;
import com.worshiproom.storage.StorageProperties;
import com.worshiproom.user.DisplayNameResolver;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Maps {@link Post} entities to {@link PostDto} responses.
 *
 * <p>Anonymous posts produce {@code AuthorDto(null, "Anonymous", null)}
 * regardless of the underlying {@code user_id}. Non-anonymous posts resolve
 * the author via {@link DisplayNameResolver}.
 *
 * <p>Use {@link #toDtoList(List)} for batch mapping — it loads all required
 * users in a single {@code findAllById} call to avoid N+1.
 *
 * <p>Spec 4.6b — when {@code post.imageUrl} is non-null, builds a
 * {@link PostImageDto} with three presigned-GET URLs (full / medium / thumb)
 * generated at serialization time. URLs are NOT cached — caching deferred
 * (spec § 12).
 */
@Component
public class PostMapper {

    private final UserRepository userRepository;
    private final ObjectStorageAdapter storage;
    private final StorageProperties storageProperties;

    public PostMapper(UserRepository userRepository,
                      ObjectStorageAdapter storage,
                      StorageProperties storageProperties) {
        this.userRepository = userRepository;
        this.storage = storage;
        this.storageProperties = storageProperties;
    }

    public PostDto toDto(Post post) {
        AuthorDto author;
        if (post.isAnonymous()) {
            author = anonymousAuthor();
        } else {
            User user = userRepository.findById(post.getUserId())
                    .orElseThrow(() -> new IllegalStateException(
                            "Post " + post.getId() + " references missing user " + post.getUserId()));
            author = authorFor(user);
        }
        return buildDto(post, author);
    }

    public List<PostDto> toDtoList(List<Post> posts) {
        Set<UUID> authorIds = posts.stream()
                .filter(p -> !p.isAnonymous())
                .map(Post::getUserId)
                .collect(Collectors.toSet());
        Map<UUID, User> userById = userRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        return posts.stream().map(p -> {
            AuthorDto author;
            if (p.isAnonymous()) {
                author = anonymousAuthor();
            } else {
                User u = userById.get(p.getUserId());
                if (u == null) {
                    throw new IllegalStateException(
                            "Post " + p.getId() + " references missing user " + p.getUserId());
                }
                author = authorFor(u);
            }
            return buildDto(p, author);
        }).toList();
    }

    private static AuthorDto anonymousAuthor() {
        return new AuthorDto(null, "Anonymous", null);
    }

    private static AuthorDto authorFor(User user) {
        return new AuthorDto(user.getId(), DisplayNameResolver.resolve(user), user.getAvatarUrl());
    }

    private PostDto buildDto(Post p, AuthorDto author) {
        return new PostDto(
                p.getId(),
                p.getPostType().value(),
                p.getContent(),
                p.getCategory(),
                p.isAnonymous(),
                p.getChallengeId(),
                p.getQotdId(),
                p.getScriptureReference(),
                p.getScriptureText(),
                p.getVisibility().value(),
                p.isAnswered(),
                p.getAnsweredText(),
                p.getAnsweredAt(),
                p.getModerationStatus().value(),
                p.isCrisisFlag(),
                p.getPrayingCount(),
                p.getCandleCount(),
                p.getCommentCount(),
                p.getBookmarkCount(),
                p.getCreatedAt(),
                p.getUpdatedAt(),
                p.getLastActivityAt(),
                author,
                p.getQuestionResolvedCommentId(),
                imageFor(p),
                parseHelpTagsRaw(p.getHelpTagsRaw())
        );
    }

    /**
     * Spec 4.7b — Parse the comma-separated helpTagsRaw column into a Set
     * preserving canonical order. Empty / null string → empty Set.
     *
     * <p>Stored values are already canonically sorted by the service layer
     * (D3); this method preserves that order via {@link LinkedHashSet}. Read-side
     * does NOT validate against the {@link HelpTag} enum — values are trusted
     * because the service layer wrote them; future-compat with retired enum
     * values stays graceful.
     */
    private static Set<String> parseHelpTagsRaw(String raw) {
        if (raw == null || raw.isEmpty()) return Set.of();
        LinkedHashSet<String> result = new LinkedHashSet<>();
        for (String token : raw.split(",")) {
            String trimmed = token.trim();
            if (!trimmed.isEmpty()) result.add(trimmed);
        }
        return result;
    }

    private PostImageDto imageFor(Post p) {
        if (p.getImageUrl() == null) return null;
        Duration ttl = Duration.ofHours(storageProperties.getMaxPresignHours());
        String base = p.getImageUrl();
        return new PostImageDto(
                storage.generatePresignedUrl(base + "/full.jpg", ttl),
                storage.generatePresignedUrl(base + "/medium.jpg", ttl),
                storage.generatePresignedUrl(base + "/thumb.jpg", ttl),
                p.getImageAltText()
        );
    }
}
