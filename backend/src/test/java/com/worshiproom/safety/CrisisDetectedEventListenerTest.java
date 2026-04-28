package com.worshiproom.safety;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class CrisisDetectedEventListenerTest {

    private CrisisAlertService alertService;
    private CrisisDetectedEventListener listener;

    @BeforeEach
    void setUp() {
        alertService = mock(CrisisAlertService.class);
        listener = new CrisisDetectedEventListener(alertService);
    }

    @Test
    void handleCrisisDetected_firstEventForContent_callsAlert() {
        UUID contentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        listener.handleCrisisDetected(new CrisisDetectedEvent(contentId, userId, ContentType.POST));

        verify(alertService, times(1)).alert(contentId, userId, ContentType.POST);
    }

    @Test
    void handleCrisisDetected_secondEventForSameContent_dedups() {
        UUID contentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        listener.handleCrisisDetected(new CrisisDetectedEvent(contentId, userId, ContentType.POST));
        listener.handleCrisisDetected(new CrisisDetectedEvent(contentId, userId, ContentType.POST));

        verify(alertService, times(1)).alert(contentId, userId, ContentType.POST);
    }

    @Test
    void handleCrisisDetected_differentContent_bothAlert() {
        UUID contentId1 = UUID.randomUUID();
        UUID contentId2 = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        listener.handleCrisisDetected(new CrisisDetectedEvent(contentId1, userId, ContentType.POST));
        listener.handleCrisisDetected(new CrisisDetectedEvent(contentId2, userId, ContentType.POST));

        verify(alertService, times(1)).alert(contentId1, userId, ContentType.POST);
        verify(alertService, times(1)).alert(contentId2, userId, ContentType.POST);
    }

    @Test
    void handleCrisisDetected_postAndCommentWithDifferentIds_bothAlert() {
        // Post and comment IDs are globally unique UUIDs, so a user who hits crisis
        // on a post AND a comment within 1 hour gets two alerts (correct behavior —
        // both pieces of content need moderator review).
        UUID postContentId = UUID.randomUUID();
        UUID commentContentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        listener.handleCrisisDetected(new CrisisDetectedEvent(postContentId, userId, ContentType.POST));
        listener.handleCrisisDetected(new CrisisDetectedEvent(commentContentId, userId, ContentType.COMMENT));

        verify(alertService, times(1)).alert(postContentId, userId, ContentType.POST);
        verify(alertService, times(1)).alert(commentContentId, userId, ContentType.COMMENT);
    }

    @Test
    void handleCrisisDetected_alertServiceThrows_doesNotPropagate() {
        UUID contentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        org.mockito.Mockito.doThrow(new RuntimeException("Sentry down"))
                .when(alertService).alert(contentId, userId, ContentType.POST);

        // Must not throw.
        listener.handleCrisisDetected(new CrisisDetectedEvent(contentId, userId, ContentType.POST));

        verify(alertService, times(1)).alert(contentId, userId, ContentType.POST);
    }
}
