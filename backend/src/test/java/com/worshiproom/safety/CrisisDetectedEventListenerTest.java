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
    void handleCrisisDetected_firstEventForPost_callsAlert() {
        UUID postId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        listener.handleCrisisDetected(new CrisisDetectedEvent(postId, userId));

        verify(alertService, times(1)).alert(postId, userId);
    }

    @Test
    void handleCrisisDetected_secondEventForSamePost_dedups() {
        UUID postId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        listener.handleCrisisDetected(new CrisisDetectedEvent(postId, userId));
        listener.handleCrisisDetected(new CrisisDetectedEvent(postId, userId));

        verify(alertService, times(1)).alert(postId, userId);
    }

    @Test
    void handleCrisisDetected_differentPosts_bothAlert() {
        UUID postId1 = UUID.randomUUID();
        UUID postId2 = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        listener.handleCrisisDetected(new CrisisDetectedEvent(postId1, userId));
        listener.handleCrisisDetected(new CrisisDetectedEvent(postId2, userId));

        verify(alertService, times(1)).alert(postId1, userId);
        verify(alertService, times(1)).alert(postId2, userId);
    }

    @Test
    void handleCrisisDetected_alertServiceThrows_doesNotPropagate() {
        UUID postId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        org.mockito.Mockito.doThrow(new RuntimeException("Sentry down"))
                .when(alertService).alert(postId, userId);

        // Must not throw.
        listener.handleCrisisDetected(new CrisisDetectedEvent(postId, userId));

        verify(alertService, times(1)).alert(postId, userId);
    }
}
