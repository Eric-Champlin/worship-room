package com.worshiproom.verse;

import com.worshiproom.safety.CrisisFlagGate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

/**
 * Orchestrates the 7-step Verse-Finds-You surfacing pipeline (Spec 6.8).
 *
 * <p>Step 1 — crisis suppression via {@link CrisisFlagGate} (currently a 48h read of the
 * user's own crisis-flagged posts; Phase 10 widens this to all crisis-detection sources).
 * Step 2 — 24h cooldown via Redis (FAIL CLOSED: Redis unreachable → return cooldown).
 * Step 3 — disabled toggle (passed in by caller from settings).
 * Steps 4–7 — delegated to {@link VerseSelectionEngine}.
 *
 * <p>All non-surfacing paths return a {@link SurfacingResult} with {@code verse=empty}
 * and a {@link SurfacingReason}. NO failure path throws to the controller; the only
 * exceptions that propagate are auth (401) and rate-limit (429) — both handled at the
 * filter layer (auth) or controller-level domain advice (rate-limit).
 *
 * <p><b>Cooldown is FAIL CLOSED, NOT fail-open.</b> Direct {@link RedisTemplate} usage
 * with explicit {@code try/catch (DataAccessException)} returning cooldown on the catch
 * path. The existing {@code CircuitBreakingCacheManager} (Spec 5.6) fails OPEN — the
 * opposite of what 6.8 needs (D-FailClosed). Using {@code @Cacheable} would inherit the
 * fail-open pattern silently; we use the bare RedisTemplate to keep the fail-closed
 * branch explicit and testable.
 */
@Service
public class VerseFindsYouService {

    private static final Logger log = LoggerFactory.getLogger(VerseFindsYouService.class);
    static final Duration COOLDOWN_DURATION = Duration.ofHours(24);
    static final String COOLDOWN_KEY_PREFIX = "verse:cooldown:";

    private final CrisisFlagGate crisisFlagGate;
    private final RedisTemplate<String, String> redisTemplate;
    private final VerseSelectionEngine engine;
    private final VerseSurfacingLogRepository logRepository;

    public VerseFindsYouService(
        CrisisFlagGate crisisFlagGate,
        RedisTemplate<String, String> redisTemplate,
        VerseSelectionEngine engine,
        VerseSurfacingLogRepository logRepository
    ) {
        this.crisisFlagGate = crisisFlagGate;
        this.redisTemplate = redisTemplate;
        this.engine = engine;
        this.logRepository = logRepository;
    }

    @Transactional
    public SurfacingResult surface(UUID userId, TriggerType trigger, String category, boolean enabled) {
        // Step 3 — toggle (cheap; do first to avoid Redis cost when disabled)
        if (!enabled) return SurfacingResult.disabled();

        // Step 1 — crisis suppression (Gate-G-CRISIS-SEAM)
        try {
            if (crisisFlagGate.isUserCrisisFlagged(userId)) {
                return SurfacingResult.crisis();
            }
        } catch (RuntimeException e) {
            // Pre-Phase-10 no-flag-source path: if the gate impl ever fails (e.g., DB blip),
            // treat as "no flag readable" per Brief §0 — fall through, do NOT crash.
            log.warn("crisisFlagGateFailure userId={} message={}", userId, e.getMessage());
        }

        // Step 2 — Redis cooldown (FAIL CLOSED per D-FailClosed)
        OffsetDateTime lastSurfaced;
        try {
            String stored = redisTemplate.opsForValue().get(COOLDOWN_KEY_PREFIX + userId);
            lastSurfaced = stored == null ? null : OffsetDateTime.parse(stored);
        } catch (DataAccessException e) {
            // Redis unreachable → DENY (D-FailClosed). NOT bypass-and-allow.
            log.warn("verseCooldownRedisFailureFailingClosed userId={} message={}", userId, e.getMessage());
            return SurfacingResult.cooldown(OffsetDateTime.now(ZoneOffset.UTC).plus(COOLDOWN_DURATION));
        } catch (RuntimeException e) {
            // Malformed stored value (parse failure) → safe degrade: treat as no cooldown, fall through.
            // This is NOT a Redis failure — it's a data-shape failure that shouldn't deny surfacing.
            log.warn("verseCooldownParseFailure userId={} message={}", userId, e.getMessage());
            lastSurfaced = null;
        }
        if (lastSurfaced != null
            && lastSurfaced.plus(COOLDOWN_DURATION).isAfter(OffsetDateTime.now(ZoneOffset.UTC))) {
            return SurfacingResult.cooldown(lastSurfaced.plus(COOLDOWN_DURATION));
        }

        // Steps 4–7 — selection
        Optional<CuratedVerse> selected = engine.select(userId, category);
        if (selected.isEmpty()) return SurfacingResult.noMatch();

        CuratedVerse verse = selected.get();

        // Persist: Redis cooldown key (TTL 24h) + verse_surfacing_log row.
        // Redis failure on write is logged-and-swallowed — selection succeeded; the cooldown
        // miss is a degradation, not a denial. The next selection within 24h would over-surface,
        // which we treat as acceptable vs denying a verse the user is entitled to.
        try {
            // Extract args to locals — RepoWideTtlEnforcementTest (Spec 5.6 /
            // W8 / Gate 25) regex-checks the in-paren args of the Redis write
            // for at least one TTL Duration arg. Nested parens like
            // OffsetDateTime.now(ZoneOffset.UTC) confuse the [^)]+ matcher and
            // produce a false positive. Flat locals satisfy the static check.
            // (Comment intentionally avoids the literal call shape so the
            // matcher doesn't scan it.)
            String cooldownKey = COOLDOWN_KEY_PREFIX + userId;
            String surfacedAtIso = OffsetDateTime.now(ZoneOffset.UTC).toString();
            redisTemplate.opsForValue().set(cooldownKey, surfacedAtIso, COOLDOWN_DURATION);
        } catch (DataAccessException e) {
            log.warn("verseCooldownRedisWriteFailure userId={} message={}", userId, e.getMessage());
        }

        VerseSurfacingLog logEntry = new VerseSurfacingLog(userId, verse.id(), trigger.dbValue());
        logRepository.save(logEntry);

        return SurfacingResult.success(verse);
    }
}
