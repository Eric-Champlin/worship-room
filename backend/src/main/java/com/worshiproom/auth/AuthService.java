package com.worshiproom.auth;

import com.worshiproom.auth.dto.AuthResponse;
import com.worshiproom.auth.dto.LoginRequest;
import com.worshiproom.auth.dto.RegisterRequest;
import com.worshiproom.auth.dto.RegisterResponse;
import com.worshiproom.auth.dto.UserSummary;
import com.worshiproom.user.DisplayNameResolver;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.Locale;
import java.util.Optional;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    /**
     * Pre-computed BCrypt hash of the fixed placeholder string
     * "dummy-password-for-timing-equalization" at strength 10.
     * Used in {@link #login} to equalize timing between known-email and
     * unknown-email paths — {@link BCryptPasswordEncoder#matches} is
     * constant-time for equal-length hashes. Generated once via
     * {@code new BCryptPasswordEncoder().encode("dummy-password-for-timing-equalization")}
     * at dev time. Regenerate only if BCrypt strength changes.
     */
    private static final String DUMMY_HASH =
        "$2a$10$P2yTlBRW09Kz2UvMN6LIe.NYR5IHdhvPwpHL8M9.li56XcEACxpee";

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       BCryptPasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        String normalizedEmail = request.email().toLowerCase(Locale.ROOT).trim();
        String resolvedTimezone = resolveTimezoneOrUtc(request.timezone());

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            // Anti-enumeration: burn the same BCrypt cost as the new-email path so
            // the two branches are timing-equivalent from the caller's perspective.
            // DO NOT remove — dropping the encode() call re-introduces the timing
            // side channel that lets an attacker enumerate valid emails by measuring
            // register response times.
            String discarded = passwordEncoder.encode(request.password());
            if (discarded.length() < 10) {
                throw new IllegalStateException(
                    "bcrypt hash unexpectedly short — anti-enumeration invariant violated");
            }
            log.debug("registerCollision emailHash={}", EmailHasher.hash(normalizedEmail));
            return RegisterResponse.ok();
        }

        String passwordHash = passwordEncoder.encode(request.password());
        User user = new User(normalizedEmail, passwordHash,
            request.firstName(), request.lastName(), resolvedTimezone);
        User saved = userRepository.save(user);
        log.debug("registerSucceeded userId={} emailHash={}", saved.getId(), EmailHasher.hash(normalizedEmail));
        return RegisterResponse.ok();
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.email().toLowerCase(Locale.ROOT).trim();
        Optional<User> maybeUser = userRepository.findByEmailIgnoreCase(normalizedEmail);

        if (maybeUser.isEmpty()) {
            // Timing equalization: match against DUMMY_HASH even though the user
            // doesn't exist. BCryptPasswordEncoder.matches() is constant-time for
            // equal-length hashes, so this keeps the unknown-email path timing-
            // equivalent to the known-email-wrong-password path.
            //
            // DO NOT remove — dropping the matches() call re-introduces the timing
            // side channel that lets an attacker enumerate valid emails by measuring
            // login response times. The `if (discarded)` branch is unreachable in
            // practice (the real password never collides with the dummy hash), but
            // referencing the result gives HotSpot's JIT a reason to keep the bcrypt
            // call rather than eliding it as dead code.
            boolean discarded = passwordEncoder.matches(request.password(), DUMMY_HASH);
            if (discarded) {
                throw new IllegalStateException(
                    "dummy-hash matched real password — timing-equalization invariant violated");
            }
            log.debug("loginUnknownEmail emailHash={}", EmailHasher.hash(normalizedEmail));
            throw AuthException.invalidCredentials();
        }

        User user = maybeUser.get();
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            log.debug("loginWrongPassword userId={}", user.getId());
            throw AuthException.invalidCredentials();
        }

        String token = jwtService.generateToken(user.getId(), user.isAdmin());
        UserSummary summary = new UserSummary(
            user.getId(),
            user.getEmail(),
            DisplayNameResolver.resolve(user),
            user.getFirstName(),
            user.getLastName(),
            user.isAdmin(),
            user.getTimezone()
        );
        log.info("loginSucceeded userId={}", user.getId());
        return new AuthResponse(token, summary);
    }

    private static String resolveTimezoneOrUtc(String input) {
        if (input == null || input.isBlank()) return "UTC";
        try {
            ZoneId.of(input);
            return input;
        } catch (DateTimeException ex) {
            log.warn("invalidTimezoneOnRegister input='{}' fallback=UTC", input);
            return "UTC";
        }
    }
}
