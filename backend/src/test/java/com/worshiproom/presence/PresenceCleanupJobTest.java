package com.worshiproom.presence;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Spec 6.11b — unit test for {@link PresenceCleanupJob}.
 */
@ExtendWith(MockitoExtension.class)
class PresenceCleanupJobTest {

    @Mock private PresenceService service;
    @InjectMocks private PresenceCleanupJob job;

    @Test
    void cleanupInvokesService() {
        when(service.cleanup()).thenReturn(7L);
        job.cleanup();
        verify(service).cleanup();
    }

    @Test
    void cleanupSwallowsExceptions() {
        doThrow(new RuntimeException("redis down")).when(service).cleanup();
        // Should NOT throw
        job.cleanup();
        verify(service).cleanup();
    }
}
