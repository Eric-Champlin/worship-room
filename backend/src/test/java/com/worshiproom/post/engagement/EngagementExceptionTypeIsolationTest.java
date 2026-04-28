package com.worshiproom.post.engagement;

import com.worshiproom.post.PostException;
import com.worshiproom.post.comment.CommentException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Spec 3.7 — guard test that pins the disjoint domain-base type isolation
 * relied on by {@link EngagementExceptionHandler}.
 *
 * <p>Both {@link EngagementExceptionHandler} and
 * {@link com.worshiproom.post.PostExceptionHandler} (and
 * {@link com.worshiproom.post.PostValidationExceptionHandler}) are scoped to
 * the broad {@code com.worshiproom.post} package — they all match the
 * {@link com.worshiproom.post.PostController} where the new endpoints live.
 * Disambiguation is ensured by Spring's most-specific-type dispatch:
 * {@link EngagementException} subclasses must NOT inherit from
 * {@link PostException} (or {@link CommentException}), and vice versa,
 * so each advice's {@code @ExceptionHandler} methods only ever match their
 * own domain hierarchy.
 *
 * <p>If a future refactor accidentally re-roots one of these exception
 * hierarchies under another, this test fails immediately — preventing the
 * silent dispatch hijack the plan's Step 4 guardrail warns about
 * ({@code Do NOT make EngagementException extend PostException}).
 */
class EngagementExceptionTypeIsolationTest {

    @Test
    void engagementException_isNotSubclassOfPostException() {
        assertThat(PostException.class.isAssignableFrom(EngagementException.class))
                .as("EngagementException must remain a sibling of PostException — "
                        + "see EngagementExceptionHandler JavaDoc and Spec 3.7 Step 4 guardrail")
                .isFalse();
    }

    @Test
    void engagementException_isNotSubclassOfCommentException() {
        assertThat(CommentException.class.isAssignableFrom(EngagementException.class))
                .as("EngagementException must remain a sibling of CommentException")
                .isFalse();
    }

    @Test
    void postException_isNotSubclassOfEngagementException() {
        assertThat(EngagementException.class.isAssignableFrom(PostException.class))
                .as("PostException must remain a sibling of EngagementException")
                .isFalse();
    }

    @Test
    void commentException_isNotSubclassOfEngagementException() {
        assertThat(EngagementException.class.isAssignableFrom(CommentException.class))
                .as("CommentException must remain a sibling of EngagementException")
                .isFalse();
    }
}
