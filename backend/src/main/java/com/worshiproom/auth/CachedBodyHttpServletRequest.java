package com.worshiproom.auth;

import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import org.springframework.util.StreamUtils;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

/**
 * Wrapper that reads the request body into a byte[] once and returns a fresh
 * ServletInputStream/BufferedReader on every call. Required by filters that
 * must inspect the body before the controller reads it (e.g., LoginRateLimitFilter
 * extracting the email field for per-email rate limiting).
 */
public class CachedBodyHttpServletRequest extends HttpServletRequestWrapper {

    private final byte[] cachedBody;

    public CachedBodyHttpServletRequest(HttpServletRequest request) throws IOException {
        super(request);
        this.cachedBody = StreamUtils.copyToByteArray(request.getInputStream());
    }

    public byte[] getCachedBody() { return cachedBody; }

    @Override
    public ServletInputStream getInputStream() {
        ByteArrayInputStream backing = new ByteArrayInputStream(cachedBody);
        return new ServletInputStream() {
            @Override public boolean isFinished() { return backing.available() == 0; }
            @Override public boolean isReady() { return true; }
            @Override public void setReadListener(ReadListener readListener) {}
            @Override public int read() { return backing.read(); }
        };
    }

    @Override
    public BufferedReader getReader() {
        String encoding = getCharacterEncoding();
        return new BufferedReader(new InputStreamReader(
            getInputStream(),
            encoding != null ? java.nio.charset.Charset.forName(encoding) : StandardCharsets.UTF_8));
    }
}
