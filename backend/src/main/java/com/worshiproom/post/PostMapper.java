package com.worshiproom.post;

import com.worshiproom.post.dto.AuthorDto;
import com.worshiproom.post.dto.PostDto;
import com.worshiproom.user.DisplayNameResolver;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.springframework.stereotype.Component;

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
 */
@Component
public class PostMapper {

    private final UserRepository userRepository;

    public PostMapper(UserRepository userRepository) {
        this.userRepository = userRepository;
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

    private static PostDto buildDto(Post p, AuthorDto author) {
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
                author
        );
    }
}
