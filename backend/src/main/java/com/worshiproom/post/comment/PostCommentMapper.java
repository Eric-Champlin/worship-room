package com.worshiproom.post.comment;

import com.worshiproom.post.comment.dto.CommentDto;
import com.worshiproom.post.dto.AuthorDto;
import com.worshiproom.user.DisplayNameResolver;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Maps {@link PostComment} entities to {@link CommentDto} responses with
 * reply nesting and N+1-safe author resolution.
 *
 * <p>The {@code replies} field is always populated (empty list for parents
 * with no children) so the frontend can distinguish "field absent" from
 * "no replies yet." Comments do not support anonymity — author is always
 * the real {@link User}.
 */
@Component
public class PostCommentMapper {

    private final UserRepository userRepository;

    public PostCommentMapper(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Maps a page of top-level comments together with their (already-fetched)
     * replies. Resolves all required users in a single batch.
     *
     * @param topLevel        page of comments where parent_comment_id IS NULL
     * @param repliesByParent map keyed by parent comment id; value is the
     *                        sorted-by-created_at-asc list of replies for that parent
     */
    public List<CommentDto> toDtoList(List<PostComment> topLevel, Map<UUID, List<PostComment>> repliesByParent) {
        Set<UUID> authorIds = new HashSet<>();
        topLevel.forEach(c -> authorIds.add(c.getUserId()));
        repliesByParent.values().forEach(list -> list.forEach(c -> authorIds.add(c.getUserId())));

        Map<UUID, User> userById = userRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        return topLevel.stream().map(parent -> {
            List<PostComment> replies = repliesByParent.getOrDefault(parent.getId(), List.of());
            List<CommentDto> replyDtos = replies.stream()
                    .map(r -> buildDto(r, userById, List.of()))
                    .toList();
            return buildDto(parent, userById, replyDtos);
        }).toList();
    }

    private static CommentDto buildDto(PostComment c, Map<UUID, User> userById, List<CommentDto> replies) {
        User u = userById.get(c.getUserId());
        if (u == null) {
            throw new IllegalStateException(
                    "Comment " + c.getId() + " references missing user " + c.getUserId());
        }
        AuthorDto author = new AuthorDto(u.getId(), DisplayNameResolver.resolve(u), u.getAvatarUrl());
        return new CommentDto(
                c.getId(),
                c.getPostId(),
                c.getParentCommentId(),
                c.getContent(),
                c.isHelpful(),
                c.getModerationStatus().value(),
                c.isCrisisFlag(),
                c.getCreatedAt(),
                c.getUpdatedAt(),
                author,
                replies
        );
    }
}
