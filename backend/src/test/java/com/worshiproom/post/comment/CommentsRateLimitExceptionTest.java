package com.worshiproom.post.comment;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CommentsRateLimitExceptionTest {

    @Test
    void formatMessage_sub60s_saysLessThanAMinute() {
        String msg = CommentsRateLimitException.formatMessage(30);
        assertThat(msg).isEqualTo(
                "You're commenting a lot — please wait less than a minute before commenting again.");
    }

    @Test
    void formatMessage_minutes_pluralizesCorrectly() {
        assertThat(CommentsRateLimitException.formatMessage(60)).isEqualTo(
                "You're commenting a lot — please wait about 1 minute before commenting again.");
        assertThat(CommentsRateLimitException.formatMessage(120)).isEqualTo(
                "You're commenting a lot — please wait about 2 minutes before commenting again.");
        assertThat(CommentsRateLimitException.formatMessage(599)).isEqualTo(
                "You're commenting a lot — please wait about 9 minutes before commenting again.");
    }

    @Test
    void formatMessage_oneHour_singular() {
        // 3600s = exactly 1h boundary → "about 1 hour"
        String msg = CommentsRateLimitException.formatMessage(3600);
        assertThat(msg).isEqualTo(
                "You're commenting a lot — please wait about 1 hour before commenting again.");
    }

    @Test
    void formatMessage_multipleHours_plural() {
        String msg = CommentsRateLimitException.formatMessage(7200);
        assertThat(msg).isEqualTo(
                "You're commenting a lot — please wait about 2 hours before commenting again.");
    }

    @Test
    void exceptionCarriesRetryAfterSecondsAndCode() {
        CommentsRateLimitException ex = new CommentsRateLimitException(45);
        assertThat(ex.getRetryAfterSeconds()).isEqualTo(45);
        assertThat(ex.getCode()).isEqualTo("RATE_LIMITED");
        assertThat(ex.getStatus().value()).isEqualTo(429);
    }
}
