package com.worshiproom.upload;

import org.springframework.http.HttpStatus;

/**
 * 400 INVALID_IMAGE_FORMAT — covers HEIC, polyglot files, decode failures,
 * and unsupported file extensions. The user-facing message stays generic;
 * the diagnostic detail is preserved for server-side logging via
 * {@link #getDetail()} so the exception handler can include it in the
 * request-id-correlated log line.
 */
public class InvalidImageFormatException extends UploadException {

    private final String detail;

    public InvalidImageFormatException(String detail) {
        super(HttpStatus.BAD_REQUEST, "INVALID_IMAGE_FORMAT",
            "We couldn't read that image. Try a different file (JPEG, PNG, or WebP).");
        this.detail = detail;
    }

    public String getDetail() { return detail; }
}
