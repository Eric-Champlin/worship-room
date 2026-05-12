package com.worshiproom.cache;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/**
 * Repo-wide static-analysis test (Spec 5.6 / W8 / Gate 25 / D11).
 *
 * <p>Two enforcements:
 * <ol>
 *   <li>Every {@code redisTemplate.opsForValue().set(key, value)} call must use the
 *       3-argument form with a {@code Duration} TTL OR be followed by an
 *       {@code .expire(key, ...)} call in the same file.</li>
 *   <li>Every {@code @Cacheable("cacheName")} annotation must have a corresponding
 *       {@code spring.cache.redis.time-to-live.cacheName} property in
 *       {@code application.properties}.</li>
 * </ol>
 *
 * <p>Today (5.6 ship), zero {@code @Cacheable} annotations exist (D5) and zero raw
 * {@code opsForValue().set} calls exist outside Spring Data Redis internals — both
 * assertions pass vacuously. The test remains as a regression net for Phase 6.1+ specs.
 */
class RepoWideTtlEnforcementTest {

    private static final Path SRC_ROOT = Paths.get("src/main/java");
    private static final Path PROPS = Paths.get("src/main/resources/application.properties");

    @Test
    void everyOpsForValueSetHasTtl() throws Exception {
        Pattern unTtldSet = Pattern.compile("opsForValue\\(\\)\\.set\\(([^)]+)\\)");
        List<String> offenders;
        try (Stream<Path> stream = walkJavaFiles()) {
            offenders = stream.filter(f -> {
                try {
                    String body = Files.readString(f);
                    if (!body.contains("opsForValue")) {
                        return false;
                    }
                    Matcher m = unTtldSet.matcher(body);
                    while (m.find()) {
                        String args = m.group(1);
                        long commas = args.chars().filter(c -> c == ',').count();
                        if (commas < 2 && !body.contains(".expire(")) {
                            return true;
                        }
                    }
                    return false;
                } catch (Exception e) {
                    return false;
                }
            }).map(Path::toString).toList();
        }
        assertThat(offenders)
            .as("redisTemplate.opsForValue().set() must include a TTL Duration or be followed by .expire()")
            .isEmpty();
    }

    @Test
    void everyCacheableHasTtlProperty() throws Exception {
        Pattern cacheable = Pattern.compile("@Cacheable\\s*\\(\\s*[\"']([^\"']+)[\"']");
        Set<String> cacheNames = new HashSet<>();
        try (Stream<Path> stream = walkJavaFiles()) {
            stream.forEach(f -> {
                try {
                    Matcher m = cacheable.matcher(Files.readString(f));
                    while (m.find()) {
                        cacheNames.add(m.group(1));
                    }
                } catch (Exception ignored) {
                    // best-effort static analysis
                }
            });
        }
        if (cacheNames.isEmpty()) {
            return; // vacuously true today
        }
        String props = Files.readString(PROPS);
        for (String name : cacheNames) {
            assertThat(props)
                .as("@Cacheable(\"" + name + "\") needs spring.cache.redis.time-to-live."
                    + name + " property")
                .contains("spring.cache.redis.time-to-live." + name + "=");
        }
    }

    private Stream<Path> walkJavaFiles() throws Exception {
        return Files.walk(SRC_ROOT).filter(p -> p.toString().endsWith(".java"));
    }
}
