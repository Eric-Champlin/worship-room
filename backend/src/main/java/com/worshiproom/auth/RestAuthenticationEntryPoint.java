package com.worshiproom.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.proxy.common.ProxyError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Invoked by Spring Security when a request reaches a protected route
 * WITHOUT any authentication context (no Authorization header at all, or
 * the filter ran but did not set SecurityContextHolder auth).
 *
 * Writes the canonical 401 ProxyError body directly. Without this bean,
 * Spring Security's default response is 403 AccessDenied — wrong status
 * for the Worship Room API contract.
 */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public RestAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        var requestId = MDC.get("requestId");
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        var body = ProxyError.of("UNAUTHORIZED",
            "Authentication is required to access this resource.", requestId);
        objectMapper.writeValue(response.getWriter(), body);
    }
}
