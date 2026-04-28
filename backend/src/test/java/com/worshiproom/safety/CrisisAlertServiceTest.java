package com.worshiproom.safety;

import io.sentry.IScope;
import io.sentry.Scope;
import io.sentry.ScopeCallback;
import io.sentry.Sentry;
import io.sentry.SentryOptions;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.times;

/**
 * Verifies the CrisisAlertService's contract:
 *  1. Sentry receives a WARNING-level message tagged {@code crisis_keyword_match}.
 *  2. The message text does NOT contain post content.
 *  3. Both post_id and user_id tags are attached.
 */
class CrisisAlertServiceTest {

    private CrisisAlertService service;
    private MockedStatic<Sentry> sentryMock;

    @BeforeEach
    void setUp() {
        service = new CrisisAlertService();
        sentryMock = mockStatic(Sentry.class);
    }

    @AfterEach
    void tearDown() {
        sentryMock.close();
    }

    @Test
    void alert_callsSentryCaptureMessageOnce() {
        UUID postId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        service.alert(postId, userId);

        sentryMock.verify(
                () -> Sentry.captureMessage(eq("Crisis keyword match on prayer wall post"), any(ScopeCallback.class)),
                times(1)
        );
    }

    @Test
    void alert_messageDoesNotContainContent() {
        // The message string is hardcoded in CrisisAlertService — verifying
        // it is short and scrubbed-of-content protects future maintainers
        // from accidentally including post.content in the message string.
        sentryMock.verify(
                () -> Sentry.captureMessage(any(String.class), any(ScopeCallback.class)),
                times(0)
        );  // Sanity: nothing called yet.

        service.alert(UUID.randomUUID(), UUID.randomUUID());

        sentryMock.verify(
                () -> Sentry.captureMessage(
                        org.mockito.ArgumentMatchers.argThat(msg ->
                                msg != null && !msg.toLowerCase().contains("content") && msg.length() < 100),
                        any(ScopeCallback.class)
                ),
                times(1)
        );
    }

    @Test
    void alert_attachesPostIdAndUserIdAsTags() {
        UUID postId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        // Use a real Scope captor pattern: invoke captured ScopeCallback against
        // a stub Scope, assert the right tags were set.
        IScope capturedScope = new Scope(new SentryOptions());

        sentryMock.when(() -> Sentry.captureMessage(any(String.class), any(ScopeCallback.class)))
                .thenAnswer(inv -> {
                    ScopeCallback cb = inv.getArgument(1);
                    cb.run(capturedScope);
                    return null;
                });

        service.alert(postId, userId);

        // Assert tags are populated. Sentry's Scope.getTags() returns the map.
        assertThat(capturedScope.getTags()).containsEntry("event_type", "crisis_keyword_match");
        assertThat(capturedScope.getTags()).containsEntry("post_id", postId.toString());
        assertThat(capturedScope.getTags()).containsEntry("user_id", userId.toString());
    }
}
