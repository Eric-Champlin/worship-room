package com.worshiproom.post;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PostsRateLimitExceptionTest {

    @Test
    void formatMessage_lessThan60sec() {
        assertThat(PostsRateLimitException.formatMessage(30L))
                .contains("in less than a minute");
    }

    @Test
    void formatMessage_120sec() {
        assertThat(PostsRateLimitException.formatMessage(120L))
                .contains("in 2 minutes");
    }

    @Test
    void formatMessage_3600sec() {
        assertThat(PostsRateLimitException.formatMessage(3600L))
                .contains("in about 1 hour");
    }

    @Test
    void formatMessage_86400sec() {
        assertThat(PostsRateLimitException.formatMessage(86400L))
                .contains("in about 24 hours");
    }
}
