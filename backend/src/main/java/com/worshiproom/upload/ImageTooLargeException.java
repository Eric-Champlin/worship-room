package com.worshiproom.upload;

import org.springframework.http.HttpStatus;

/**
 * 400 IMAGE_TOO_LARGE — file size exceeded the service-layer 5 MB cap.
 * Spring's protocol-layer 10 MB multipart cap returns 413 instead via
 * MaxUploadSizeExceededException.
 */
public class ImageTooLargeException extends UploadException {

    private final long actualBytes;

    public ImageTooLargeException(long actualBytes) {
        super(HttpStatus.BAD_REQUEST, "IMAGE_TOO_LARGE",
            "Image is larger than 5 MB. Try a smaller version.");
        this.actualBytes = actualBytes;
    }

    public long getActualBytes() { return actualBytes; }
}
