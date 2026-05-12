package com.worshiproom.auth.session;

import com.maxmind.geoip2.DatabaseReader;
import com.maxmind.geoip2.exception.AddressNotFoundException;
import com.maxmind.geoip2.model.CityResponse;
import com.maxmind.geoip2.record.City;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.net.InetAddress;

/**
 * Forums Wave Spec 1.5g — resolves a client IP address to its city using the
 * MaxMind GeoLite2-City database (offline, locally embedded).
 *
 * <p><b>Data attribution:</b> This product includes GeoLite2 data created by
 * MaxMind, available from <a href="https://www.maxmind.com">https://www.maxmind.com</a>.
 *
 * <p>The {@code .mmdb} file is downloaded at build time by Maven's
 * download-maven-plugin using the {@code MAXMIND_LICENSE_KEY} environment
 * variable. The file lives outside {@code src/main/resources/} (in
 * {@code backend/data/geoip/}) and is configurable via the
 * {@code geoip.database-path} property.
 *
 * <p><b>Graceful degradation:</b> If the {@code .mmdb} file is absent or
 * unreadable at startup, this component still constructs successfully and
 * boots the app — every {@link #lookupCity(String)} call returns {@code null}
 * with no per-request error. A single WARN at startup signals the degraded
 * state to operators.
 *
 * <p><b>Privacy invariants</b> (D-GeoIP / W5 / W12):
 * <ul>
 *   <li>City string only — never latitude/longitude</li>
 *   <li>If MaxMind returns region/state but no city → return {@code null}
 *       (the gradient of specificity matters; don't fall back to less precise)</li>
 *   <li>Never logs the raw IP address</li>
 *   <li>Caller stores the returned string in {@code active_sessions.ip_city}
 *       only — the raw IP never enters the DB</li>
 * </ul>
 */
@Component
public class GeoIpResolver {

    private static final Logger log = LoggerFactory.getLogger(GeoIpResolver.class);

    private final String databasePath;
    private DatabaseReader reader; // null when DB unavailable

    public GeoIpResolver(@Value("${geoip.database-path:./data/geoip/GeoLite2-City.mmdb}") String databasePath) {
        this.databasePath = databasePath;
    }

    @PostConstruct
    void initialize() {
        File db = new File(databasePath);
        if (!db.exists() || !db.isFile() || !db.canRead()) {
            log.warn("GeoIP database unavailable at path={}; city lookups disabled. "
                + "Set MAXMIND_LICENSE_KEY and re-run `mvn process-resources -Pgeoip-download` "
                + "to enable. See backend/README.md § GeoIP Setup.", databasePath);
            return;
        }
        try {
            this.reader = new DatabaseReader.Builder(db).build();
            log.info("GeoIP database loaded path={}", databasePath);
        } catch (IOException e) {
            log.warn("GeoIP database failed to load path={}; city lookups disabled. "
                + "Reason: {}", databasePath, e.getMessage());
            this.reader = null;
        }
    }

    @PreDestroy
    void close() {
        if (reader != null) {
            try {
                reader.close();
            } catch (IOException ignore) {
                // close() during shutdown; no actionable recovery
            }
        }
    }

    /**
     * Returns the city name for the given IP, or {@code null} if:
     * <ul>
     *   <li>The GeoIP database is unavailable (degraded mode)</li>
     *   <li>The IP is private/local (RFC1918, loopback)</li>
     *   <li>The IP is not in the database (e.g., new prefix, satellite IPs)</li>
     *   <li>MaxMind has no city-level data for that IP (region/state only)</li>
     *   <li>Any unexpected failure (logged at DEBUG; never throws)</li>
     * </ul>
     */
    public String lookupCity(String ipAddress) {
        if (reader == null || ipAddress == null || ipAddress.isBlank()) {
            return null;
        }
        try {
            InetAddress addr = InetAddress.getByName(ipAddress);
            CityResponse response = reader.city(addr);
            City city = response.getCity();
            if (city == null) {
                return null;
            }
            String name = city.getName();
            // Privacy invariant: never fall back to region/state. Empty/null city → return null.
            return (name == null || name.isBlank()) ? null : name;
        } catch (AddressNotFoundException notFound) {
            // Expected for private/local/unmapped IPs — quiet path.
            return null;
        } catch (Exception e) {
            // Defensive: NEVER throw to the caller. Log at DEBUG (frequent enough
            // for malformed IPs in some traffic; not actionable per-event).
            log.debug("GeoIP lookup failed", e);
            return null;
        }
    }

    /** Test-visible state probe. */
    boolean isAvailable() {
        return reader != null;
    }
}
