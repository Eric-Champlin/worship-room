package com.worshiproom.auth.session;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import ua_parser.Client;
import ua_parser.Parser;

/**
 * Forums Wave Spec 1.5g — derives a short device label from the User-Agent
 * header for {@code active_sessions.device_label}.
 *
 * <p>Output shape: {@code "<Browser> <BrowserMajor> on <OS> <OSMajor>"},
 * e.g. {@code "Chrome 124 on macOS 14"}. Major version only (W11) prevents
 * fingerprinting via the minor-version uniqueness of legacy browsers.
 *
 * <p>Degraded behavior: malformed UA, null UA, or parse failure returns
 * {@code "Unknown device"} — never throws to the caller (W6).
 *
 * <p>NEVER stores the raw User-Agent string anywhere — it's the parser input
 * only and discarded immediately.
 */
@Component
public class DeviceLabelParser {

    private static final Logger log = LoggerFactory.getLogger(DeviceLabelParser.class);
    private static final String UNKNOWN = "Unknown device";
    private static final int MAX_LABEL_LENGTH = 200;

    private final Parser parser;

    public DeviceLabelParser() {
        this.parser = new Parser();
    }

    /**
     * Parses the User-Agent string and returns a short, sanitized device label.
     *
     * @param userAgent the raw {@code User-Agent} HTTP header value; may be null
     * @return a non-null label (never throws). {@code "Unknown device"} when
     *         the input is missing or unparseable.
     */
    public String parse(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return UNKNOWN;
        }
        try {
            Client client = parser.parse(userAgent);
            String browser = (client.userAgent != null) ? client.userAgent.family : null;
            String browserMajor = (client.userAgent != null) ? client.userAgent.major : null;
            String os = (client.os != null) ? client.os.family : null;
            String osMajor = (client.os != null) ? client.os.major : null;

            if (browser == null && os == null) {
                return UNKNOWN;
            }

            StringBuilder sb = new StringBuilder();
            if (browser != null && !"Other".equals(browser)) {
                sb.append(browser);
                if (browserMajor != null && !browserMajor.isBlank()) {
                    sb.append(' ').append(browserMajor);
                }
            }
            if (os != null && !"Other".equals(os)) {
                if (sb.length() > 0) {
                    sb.append(" on ");
                }
                sb.append(os);
                if (osMajor != null && !osMajor.isBlank()) {
                    sb.append(' ').append(osMajor);
                }
            }
            if (sb.length() == 0) {
                return UNKNOWN;
            }
            String label = sb.toString();
            return label.length() > MAX_LABEL_LENGTH
                ? label.substring(0, MAX_LABEL_LENGTH)
                : label;
        } catch (RuntimeException e) {
            log.debug("uap-java parse failed; degrading to Unknown device", e);
            return UNKNOWN;
        }
    }
}
