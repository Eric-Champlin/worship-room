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
 *  2. The message text does NOT contain post / comment content body.
 *  3. content_type, content_id, and user_id tags are attached.
 *  4. The legacy {@code post_id} tag is NEVER set (Spec 3.6 generalization).
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
        UUID contentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        service.alert(contentId, userId, ContentType.POST);

        sentryMock.verify(
                () -> Sentry.captureMessage(eq("Crisis keyword match on prayer wall content"), any(ScopeCallback.class)),
                times(1)
        );
    }

    @Test
    void alert_messageDoesNotContainContent() {
        // The message string is hardcoded in CrisisAlertService — verifying
        // it is short and scrubbed-of-content protects future maintainers
        // from accidentally including content body in the message string.
        sentryMock.verify(
                () -> Sentry.captureMessage(any(String.class), any(ScopeCallback.class)),
                times(0)
        );  // Sanity: nothing called yet.

        service.alert(UUID.randomUUID(), UUID.randomUUID(), ContentType.POST);

        sentryMock.verify(
                () -> Sentry.captureMessage(
                        org.mockito.ArgumentMatchers.argThat(msg ->
                                msg != null && msg.length() < 100),
                        any(ScopeCallback.class)
                ),
                times(1)
        );
    }

    @Test
    void alert_attachesContentIdUserIdAndContentTypeAsTagsForPost() {
        UUID contentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        IScope capturedScope = new Scope(new SentryOptions());

        sentryMock.when(() -> Sentry.captureMessage(any(String.class), any(ScopeCallback.class)))
                .thenAnswer(inv -> {
                    ScopeCallback cb = inv.getArgument(1);
                    cb.run(capturedScope);
                    return null;
                });

        service.alert(contentId, userId, ContentType.POST);

        assertThat(capturedScope.getTags()).containsEntry("event_type", "crisis_keyword_match");
        assertThat(capturedScope.getTags()).containsEntry("content_type", "post");
        assertThat(capturedScope.getTags()).containsEntry("content_id", contentId.toString());
        assertThat(capturedScope.getTags()).containsEntry("user_id", userId.toString());
    }

    @Test
    void alert_attachesContentTypeCommentForCommentEvents() {
        UUID contentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        IScope capturedScope = new Scope(new SentryOptions());

        sentryMock.when(() -> Sentry.captureMessage(any(String.class), any(ScopeCallback.class)))
                .thenAnswer(inv -> {
                    ScopeCallback cb = inv.getArgument(1);
                    cb.run(capturedScope);
                    return null;
                });

        service.alert(contentId, userId, ContentType.COMMENT);

        assertThat(capturedScope.getTags()).containsEntry("content_type", "comment");
        assertThat(capturedScope.getTags()).containsEntry("content_id", contentId.toString());
    }

    @Test
    void alert_doesNotSetLegacyPostIdTag() {
        // Spec 3.6 generalized the event from post-specific to (post|comment).
        // The old `post_id` Sentry tag must NOT be set on either content type
        // — the canonical key is now `content_id`. This guards against
        // anyone re-adding `setTag("post_id", ...)` during a refactor.
        UUID contentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        IScope capturedScope = new Scope(new SentryOptions());

        sentryMock.when(() -> Sentry.captureMessage(any(String.class), any(ScopeCallback.class)))
                .thenAnswer(inv -> {
                    ScopeCallback cb = inv.getArgument(1);
                    cb.run(capturedScope);
                    return null;
                });

        service.alert(contentId, userId, ContentType.POST);

        assertThat(capturedScope.getTags()).doesNotContainKey("post_id");
    }
}
