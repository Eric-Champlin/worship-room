package com.worshiproom.upload;

import org.springframework.http.HttpStatus;

/**
 * 400 IMAGE_DIMENSIONS_TOO_LARGE — width or height exceeded the 4000-pixel cap.
 * Checked AFTER decode so a small-byte / huge-pixel image is still rejected
 * (a 5000×5000 single-color JPEG can be under 5 MB but consume ~64 MB at
 * decoded ARGB).
 */
public class ImageDimensionsTooLargeException extends UploadException {

    private final int width;
    private final int height;

    public ImageDimensionsTooLargeException(int width, int height) {
        super(HttpStatus.BAD_REQUEST, "IMAGE_DIMENSIONS_TOO_LARGE",
            "Image is larger than 4000 × 4000 pixels. Try a smaller resolution.");
        this.width = width;
        this.height = height;
    }

    public int getWidth() { return width; }
    public int getHeight() { return height; }
}
