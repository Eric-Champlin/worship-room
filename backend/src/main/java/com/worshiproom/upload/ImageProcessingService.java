package com.worshiproom.upload;

import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifIFD0Directory;
import org.imgscalr.Scalr;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Iterator;

/**
 * Image processing pipeline for Spec 4.6b uploads:
 *   1. Decode via ImageIO (JPEG/PNG/WebP via TwelveMonkeys WebP extension SPI)
 *   2. Read EXIF orientation BEFORE strip; rotate pixel data so output is upright
 *   3. Validate dimensions (≤4000×4000) AFTER decode (defense in depth — Spring
 *      max-file-size catches the byte-level cap)
 *   4. Resize to 3 renditions: full=1920, medium=960, thumb=320 (long-edge cap)
 *   5. Re-encode each rendition as JPEG Q=85 — discards all input metadata
 *      (belt-and-suspenders strip)
 *
 * <p>Returns three byte arrays in a record. Caller (UploadService) writes them
 * to the storage adapter under their respective keys.
 *
 * <p>PII discipline: image bytes never logged. Alt text never reaches this
 * service (caller doesn't pass it).
 */
@Service
public class ImageProcessingService {

    private static final Logger log = LoggerFactory.getLogger(ImageProcessingService.class);

    private static final int FULL_LONG_EDGE = 1920;
    private static final int MEDIUM_LONG_EDGE = 960;
    private static final int THUMB_LONG_EDGE = 320;
    private static final int MAX_DIMENSION = 4000;
    private static final float JPEG_QUALITY = 0.85f;

    public record ProcessedImage(byte[] full, byte[] medium, byte[] thumb) {}

    /**
     * Processes the input bytes through the full pipeline. Throws
     * InvalidImageFormatException on decode failure (covers HEIC, polyglot
     * files, corrupt input). Throws ImageDimensionsTooLargeException if the
     * decoded image exceeds 4000×4000.
     */
    public ProcessedImage process(byte[] input, String declaredContentType) {
        long start = System.currentTimeMillis();
        try {
            int orientation = readExifOrientation(input);

            BufferedImage decoded;
            try (InputStream stream = new ByteArrayInputStream(input)) {
                decoded = ImageIO.read(stream);
            }
            if (decoded == null) {
                throw new InvalidImageFormatException("Decoded image is null — unsupported or corrupt format.");
            }

            if (decoded.getWidth() > MAX_DIMENSION || decoded.getHeight() > MAX_DIMENSION) {
                throw new ImageDimensionsTooLargeException(decoded.getWidth(), decoded.getHeight());
            }

            BufferedImage upright = applyOrientation(decoded, orientation);

            BufferedImage fullImg = Scalr.resize(upright, Scalr.Method.QUALITY, Scalr.Mode.AUTOMATIC, FULL_LONG_EDGE);
            BufferedImage mediumImg = Scalr.resize(upright, Scalr.Method.QUALITY, Scalr.Mode.AUTOMATIC, MEDIUM_LONG_EDGE);
            BufferedImage thumbImg = Scalr.resize(upright, Scalr.Method.QUALITY, Scalr.Mode.AUTOMATIC, THUMB_LONG_EDGE);

            byte[] fullBytes = encodeJpeg(fullImg, JPEG_QUALITY);
            byte[] mediumBytes = encodeJpeg(mediumImg, JPEG_QUALITY);
            byte[] thumbBytes = encodeJpeg(thumbImg, JPEG_QUALITY);

            long elapsed = System.currentTimeMillis() - start;
            log.info("imageProcessed inputBytes={} width={} height={} orientation={} outputFullBytes={} outputMediumBytes={} outputThumbBytes={} elapsedMs={}",
                input.length, decoded.getWidth(), decoded.getHeight(), orientation,
                fullBytes.length, mediumBytes.length, thumbBytes.length, elapsed);

            return new ProcessedImage(fullBytes, mediumBytes, thumbBytes);
        } catch (IOException e) {
            throw new InvalidImageFormatException("Image decode failed.");
        }
    }

    private int readExifOrientation(byte[] input) {
        try (InputStream stream = new ByteArrayInputStream(input)) {
            Metadata metadata = ImageMetadataReader.readMetadata(stream);
            ExifIFD0Directory dir = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class);
            if (dir != null && dir.containsTag(ExifIFD0Directory.TAG_ORIENTATION)) {
                return dir.getInt(ExifIFD0Directory.TAG_ORIENTATION);
            }
        } catch (Exception e) {
            // No EXIF present, or metadata library failure — default to "normal" orientation (1).
            // This is non-fatal: the image is decoded by ImageIO regardless of EXIF presence.
        }
        return 1;
    }

    private BufferedImage applyOrientation(BufferedImage src, int orientation) {
        // EXIF orientation enum (subset): 1=normal, 3=rotate-180, 6=rotate-90-CW, 8=rotate-90-CCW.
        // Values 2/4/5/7 involve flips; we treat them as normal (rare on phone uploads).
        return switch (orientation) {
            case 3 -> Scalr.rotate(src, Scalr.Rotation.CW_180);
            case 6 -> Scalr.rotate(src, Scalr.Rotation.CW_90);
            case 8 -> Scalr.rotate(src, Scalr.Rotation.CW_270);
            default -> src;
        };
    }

    private byte[] encodeJpeg(BufferedImage img, float quality) throws IOException {
        // Standard ImageIO JPEG writer; quality via JPEGImageWriteParam. Re-encoding
        // from a BufferedImage discards ALL input container metadata (EXIF, IPTC, XMP, ICC).
        // BufferedImage carries only pixel data, so the strip is mandatory and total.
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ImageOutputStream ios = ImageIO.createImageOutputStream(baos)) {
            Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
            if (!writers.hasNext()) throw new IOException("No JPEG writer available");
            ImageWriter writer = writers.next();
            try {
                writer.setOutput(ios);
                ImageWriteParam param = writer.getDefaultWriteParam();
                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                param.setCompressionQuality(quality);

                // JPEG can't represent alpha — flatten ARGB onto white if needed.
                BufferedImage rgb = img;
                if (img.getType() != BufferedImage.TYPE_INT_RGB && img.getColorModel().hasAlpha()) {
                    rgb = new BufferedImage(img.getWidth(), img.getHeight(), BufferedImage.TYPE_INT_RGB);
                    var g = rgb.createGraphics();
                    g.setColor(java.awt.Color.WHITE);
                    g.fillRect(0, 0, img.getWidth(), img.getHeight());
                    g.drawImage(img, 0, 0, null);
                    g.dispose();
                }

                writer.write(null, new IIOImage(rgb, null, null), param);
            } finally {
                writer.dispose();
            }
        }
        return baos.toByteArray();
    }
}
