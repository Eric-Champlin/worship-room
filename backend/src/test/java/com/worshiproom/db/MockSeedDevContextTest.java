package com.worshiproom.db;

import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Drift-detection test for Spec 3.2 mock prayer-wall seed isolation.
 *
 * <p>Three invariants:
 * <ol>
 *   <li>The mock-seed file exists and declares {@code context="dev"}. Without that
 *       attribute the seed would run in production.</li>
 *   <li>The file contains the expected {@code <insert>} counts per table —
 *       10 users / 24 posts / 35 comments / 5 reactions / 72 QOTDs. Drift between
 *       this file and the frontend mock data fails the test.</li>
 *   <li>Under {@code spring.liquibase.contexts=test} (pinned by
 *       {@link AbstractIntegrationTest}), the 10 mock-user UUIDs ({@code ...0101..010a})
 *       are absent from the {@code users} table, and the per-spec UUID ranges in
 *       {@code posts} / {@code post_comments} / {@code qotd_questions} are empty.
 *       This verifies test-context isolation actually skips the seed in test runs.</li>
 * </ol>
 *
 * <p>Does NOT actually run migrations under {@code contexts=dev} (which would poison the
 * singleton Postgres container shared across the JVM and break
 * {@link DevSeedContextIsolationTest} and any other test class that asserts on row counts).
 * Smoke-test of the seed itself is exercised manually by Eric via
 * {@code ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev} per Spec 3.2 success criteria.
 */
class MockSeedDevContextTest extends AbstractIntegrationTest {

    private static final String SEED_FILE = "db/changelog/contexts/2026-04-27-021-prayer-wall-mock-seed.xml";

    private static final UUID[] MOCK_USER_UUIDS = {
        UUID.fromString("00000000-0000-0000-0000-000000000101"),
        UUID.fromString("00000000-0000-0000-0000-000000000102"),
        UUID.fromString("00000000-0000-0000-0000-000000000103"),
        UUID.fromString("00000000-0000-0000-0000-000000000104"),
        UUID.fromString("00000000-0000-0000-0000-000000000105"),
        UUID.fromString("00000000-0000-0000-0000-000000000106"),
        UUID.fromString("00000000-0000-0000-0000-000000000107"),
        UUID.fromString("00000000-0000-0000-0000-000000000108"),
        UUID.fromString("00000000-0000-0000-0000-000000000109"),
        UUID.fromString("00000000-0000-0000-0000-00000000010a"),
    };

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void mockSeedXmlDeclaresDevContext() throws Exception {
        ClassPathResource resource = new ClassPathResource(SEED_FILE);
        assertThat(resource.exists())
            .as("%s must exist at the expected classpath location", SEED_FILE)
            .isTrue();

        Document doc = parseSeedXml();

        NodeList changesets = doc.getElementsByTagName("changeSet");
        assertThat(changesets.getLength())
            .as("%s should contain exactly one <changeSet>", SEED_FILE)
            .isEqualTo(1);

        Element cs = (Element) changesets.item(0);
        assertThat(cs.getAttribute("context"))
            .as("Mock-seed changeSet MUST declare context='dev'")
            .isEqualTo("dev");
        assertThat(cs.getAttribute("id"))
            .as("Changeset id should match filename pattern")
            .isEqualTo("2026-04-27-021-prayer-wall-mock-seed");
    }

    @Test
    void mockSeedXmlHasExpectedInsertCountsPerTable() throws Exception {
        Document doc = parseSeedXml();
        NodeList inserts = doc.getElementsByTagName("insert");

        long users = countInsertsForTable(inserts, "users");
        long posts = countInsertsForTable(inserts, "posts");
        long comments = countInsertsForTable(inserts, "post_comments");
        long reactions = countInsertsForTable(inserts, "post_reactions");
        long qotds = countInsertsForTable(inserts, "qotd_questions");

        assertThat(users).as("10 mock users").isEqualTo(10);
        assertThat(posts).as("24 mock posts (3 QOTD + 3 mental-health + 18 regular)").isEqualTo(24);
        assertThat(comments).as("35 mock comments").isEqualTo(35);
        assertThat(reactions).as("5 mock reactions (only isPraying=true entries)").isEqualTo(5);
        assertThat(qotds).as("72 QOTD questions (60 general + 12 liturgical)").isEqualTo(72);
    }

    @Test
    void mockSeedDoesNotLoadUnderTestContext() {
        // With spring.liquibase.contexts=test pinned by AbstractIntegrationTest, the
        // mock-seed changeset (context="dev") is skipped. None of the 10 mock UUIDs
        // should exist in users.
        for (UUID seedId : MOCK_USER_UUIDS) {
            assertThat(userRepository.findById(seedId))
                .as("Mock UUID %s must NOT be present in test context — mock seed leaked.", seedId)
                .isEmpty();
        }

        // Dependent tables should also be free of the mock-seed UUID ranges.
        Long postsCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM posts WHERE id BETWEEN " +
            "'00000000-0000-0000-0000-000000000201'::uuid AND " +
            "'00000000-0000-0000-0000-000000000218'::uuid",
            Long.class);
        assertThat(postsCount).as("0 mock posts under test context").isEqualTo(0L);

        Long commentsCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM post_comments WHERE id BETWEEN " +
            "'00000000-0000-0000-0000-000000000301'::uuid AND " +
            "'00000000-0000-0000-0000-000000000323'::uuid",
            Long.class);
        assertThat(commentsCount).as("0 mock comments under test context").isEqualTo(0L);

        // Spec 3.9 added a context-less production seed (changeset 2026-04-29-001) that
        // populates 72 qotd-* rows in EVERY environment, including the test context.
        // The dev-mock seed adds nothing on top — those 72 ids overlap with the prod seed
        // and `ON CONFLICT (id) DO NOTHING` no-ops. So the test-context invariant is
        // "exactly 72 qotd rows from the prod seed; zero from the dev mock."
        Long qotdCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM qotd_questions",
            Long.class);
        assertThat(qotdCount).as("72 QOTD rows from prod seed under test context").isEqualTo(72L);
    }

    private Document parseSeedXml() throws Exception {
        ClassPathResource resource = new ClassPathResource(SEED_FILE);
        DocumentBuilder builder = DocumentBuilderFactory.newInstance().newDocumentBuilder();
        return builder.parse(resource.getInputStream());
    }

    private long countInsertsForTable(NodeList inserts, String tableName) {
        long count = 0;
        for (int i = 0; i < inserts.getLength(); i++) {
            Element el = (Element) inserts.item(i);
            if (tableName.equals(el.getAttribute("tableName"))) {
                count++;
            }
        }
        return count;
    }
}
