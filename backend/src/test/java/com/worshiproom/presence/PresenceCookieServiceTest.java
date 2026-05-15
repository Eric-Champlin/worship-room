package com.worshiproom.presence;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Spec 6.11b — unit tests for {@link PresenceCookieService}. No Spring context;
 * uses Mockito for the servlet surface.
 */
@ExtendWith(MockitoExtension.class)
class PresenceCookieServiceTest {

    @Mock private HttpServletRequest request;
    @Mock private HttpServletResponse response;

    private PresenceProperties props;
    private PresenceCookieService service;

    @BeforeEach
    void setup() {
        props = new PresenceProperties();
        // defaults: name=wr_presence_session, path=/api/v1, max-age=7776000, secure=true
        service = new PresenceCookieService(props);
    }

    @Test
    void readSessionIdReturnsEmptyWhenNoCookies() {
        when(request.getCookies()).thenReturn(null);
        assertThat(service.readSessionId(request)).isEmpty();
    }

    @Test
    void readSessionIdReturnsEmptyWhenNoMatchingCookie() {
        when(request.getCookies()).thenReturn(new Cookie[]{ new Cookie("other", "x") });
        assertThat(service.readSessionId(request)).isEmpty();
    }

    @Test
    void readSessionIdReturnsValueWhenPresentAndValid() {
        String uuid = UUID.randomUUID().toString();
        when(request.getCookies()).thenReturn(new Cookie[]{
            new Cookie("wr_presence_session", uuid)
        });
        Optional<String> result = service.readSessionId(request);
        assertThat(result).contains(uuid);
    }

    @Test
    void readSessionIdRejectsMalformedValue() {
        when(request.getCookies()).thenReturn(new Cookie[]{
            new Cookie("wr_presence_session", "not-a-uuid")
        });
        assertThat(service.readSessionId(request)).isEmpty();
    }

    @Test
    void readSessionIdRejectsValueOfWrongLength() {
        when(request.getCookies()).thenReturn(new Cookie[]{
            new Cookie("wr_presence_session", "tooshort")
        });
        assertThat(service.readSessionId(request)).isEmpty();
    }

    @Test
    void issueWritesCookieWithCanonicalAttributes() {
        props.setCookieSecure(true);
        String sessionId = service.issue(response);

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(response).addHeader(eq(HttpHeaders.SET_COOKIE), captor.capture());
        String setCookie = captor.getValue();

        assertThat(setCookie).contains("wr_presence_session=" + sessionId);
        assertThat(setCookie).contains("HttpOnly");
        assertThat(setCookie).contains("Secure");
        assertThat(setCookie).contains("SameSite=Lax");
        assertThat(setCookie).contains("Path=/api/v1");
        assertThat(setCookie).contains("Max-Age=7776000");
    }

    @Test
    void issueOmitsSecureFlagInDevProfile() {
        props.setCookieSecure(false);
        service.issue(response);

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(response).addHeader(eq(HttpHeaders.SET_COOKIE), captor.capture());
        String setCookie = captor.getValue();

        assertThat(setCookie).doesNotContain("Secure");
        assertThat(setCookie).contains("HttpOnly");
    }

    @Test
    void issueReturnsOpaqueUuidValue() {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 100; i++) {
            String id = service.issue(response);
            assertThat(seen.add(id))
                .as("issued UUIDs must be distinct")
                .isTrue();
            // Validate UUID parseable (no IP/JWT/user-id encoded)
            UUID.fromString(id);
        }
    }

}
