package com.worshiproom.db;

import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Drift-detection test for Spec 1.8 dev-seed isolation.
 *
 * <p>Asserts three invariants:
 * <ol>
 *   <li>The dev-seed XML file exists at the expected classpath location.</li>
 *   <li>Every changeSet inside dev-seed.xml declares {@code context="dev"}. Without this
 *       attribute the seed would run in ALL environments, including production.</li>
 *   <li>With {@code spring.liquibase.contexts=test} (pinned by {@link AbstractIntegrationTest}),
 *       the 5 deterministic-UUID seed users do NOT appear in the test database. This catches
 *       both test-profile-override regressions and context-attribute regressions in one assert.</li>
 * </ol>
 *
 * <p>Not a smoke test of the seed itself — that's exercised manually by Eric via
 * {@code ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev} per Spec 1.8 success criteria.
 */
class DevSeedContextIsolationTest extends AbstractIntegrationTest {

    private static final UUID[] SEED_UUIDS = {
        UUID.fromString("00000000-0000-0000-0000-000000000001"),
        UUID.fromString("00000000-0000-0000-0000-000000000002"),
        UUID.fromString("00000000-0000-0000-0000-000000000003"),
        UUID.fromString("00000000-0000-0000-0000-000000000004"),
        UUID.fromString("00000000-0000-0000-0000-000000000005"),
    };

    @Autowired
    private UserRepository userRepository;

    @Test
    void seedUsersAreAbsentInTestContext() {
        // With spring.liquibase.contexts=test pinned by the base class, the dev-seed
        // changeset (context="dev") must be skipped. Consequently none of the 5 seed
        // UUIDs should exist in the users table.
        for (UUID seedId : SEED_UUIDS) {
            assertThat(userRepository.findById(seedId))
                .as("Seed UUID %s must NOT be present in test context — dev-seed leaked.", seedId)
                .isEmpty();
        }
    }

    @Test
    void devSeedXmlDeclaresDevContext() throws Exception {
        ClassPathResource resource = new ClassPathResource("db/changelog/contexts/dev-seed.xml");
        assertThat(resource.exists())
            .as("contexts/dev-seed.xml must exist at the expected classpath location")
            .isTrue();

        DocumentBuilder builder = DocumentBuilderFactory.newInstance().newDocumentBuilder();
        Document doc = builder.parse(resource.getInputStream());

        NodeList changesets = doc.getElementsByTagName("changeSet");
        assertThat(changesets.getLength())
            .as("contexts/dev-seed.xml should contain at least one <changeSet>")
            .isGreaterThanOrEqualTo(1);

        for (int i = 0; i < changesets.getLength(); i++) {
            Element cs = (Element) changesets.item(i);
            assertThat(cs.getAttribute("context"))
                .as("Every changeSet in contexts/dev-seed.xml MUST declare context='dev'")
                .isEqualTo("dev");
        }
    }

    @Test
    void masterXmlIncludesDevSeed() throws Exception {
        ClassPathResource master = new ClassPathResource("db/changelog/master.xml");
        assertThat(master.exists()).isTrue();

        DocumentBuilder builder = DocumentBuilderFactory.newInstance().newDocumentBuilder();
        Document doc = builder.parse(master.getInputStream());

        NodeList includes = doc.getElementsByTagName("include");
        boolean devSeedWired = false;
        for (int i = 0; i < includes.getLength(); i++) {
            Element inc = (Element) includes.item(i);
            if ("db/changelog/contexts/dev-seed.xml".equals(inc.getAttribute("file"))) {
                devSeedWired = true;
                break;
            }
        }
        assertThat(devSeedWired)
            .as("master.xml must include db/changelog/contexts/dev-seed.xml")
            .isTrue();
    }
}
