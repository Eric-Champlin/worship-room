package com.worshiproom.safety;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Asserts backend CrisisResources stays in sync with the frontend source of truth
 * at {@code frontend/src/constants/crisis-resources.ts}.
 *
 * <p>Resolution strategy: walk up from the test working directory until we find
 * a sibling {@code frontend/} folder. The test runs from the {@code backend/}
 * working directory in CI; in local IDE runs it walks up two levels max.
 *
 * <p>If the frontend file moves OR is renamed, this test fails fast with a
 * clear message. The parity check uses substring matching (each resource's
 * name + phone/text appears in the frontend file).
 */
class CrisisResourcesParityTest {

    @Test
    void allResourceNamesAppearInFrontendSource() throws Exception {
        Path frontendFile = locateFrontendFile();
        String content = Files.readString(frontendFile);

        for (CrisisResource resource : CrisisResources.RESOURCES) {
            assertThat(content)
                    .as("Frontend crisis-resources.ts must contain backend resource name '%s'", resource.name())
                    .contains(resource.name());

            if (resource.phone() != null) {
                assertThat(content)
                        .as("Frontend must contain backend phone '%s'", resource.phone())
                        .contains(resource.phone());
            }
            if (resource.text() != null) {
                assertThat(content)
                        .as("Frontend must contain backend text '%s'", resource.text())
                        .contains(resource.text());
            }
            // Spec 6.4 — chat URL parity. Only 988 entry carries a chat URL in v1.
            if (resource.chatUrl() != null) {
                assertThat(content)
                        .as("Frontend must contain backend chatUrl '%s'", resource.chatUrl())
                        .contains(resource.chatUrl());
            }
        }
    }

    @Test
    void suicidePreventionEntry_hasChatUrl_perSpec64() {
        // Spec 6.4 — the 988 Lifeline must carry a non-null chat URL so the
        // prayer-wall/CrisisResourcesBanner can link to https://988lifeline.org/chat/.
        CrisisResource ninetyEight = CrisisResources.RESOURCES.get(0);
        assertThat(ninetyEight.name()).isEqualTo("988 Suicide & Crisis Lifeline");
        assertThat(ninetyEight.chatUrl()).isEqualTo("https://988lifeline.org/chat/");
    }

    @Test
    void introMessage_isNonEmpty() {
        assertThat(CrisisResources.INTRO_MESSAGE).isNotBlank();
        assertThat(CrisisResources.INTRO_MESSAGE).contains("not alone");
    }

    private static Path locateFrontendFile() {
        Path cwd = Paths.get("").toAbsolutePath();
        for (int i = 0; i < 4; i++) {
            Path candidate = cwd.resolve("frontend/src/constants/crisis-resources.ts");
            if (Files.exists(candidate)) {
                return candidate;
            }
            cwd = cwd.getParent();
            if (cwd == null) break;
        }
        throw new IllegalStateException(
                "Could not locate frontend/src/constants/crisis-resources.ts from cwd " +
                Paths.get("").toAbsolutePath() + ". CrisisResourcesParityTest requires the " +
                "frontend folder to be reachable for parity checking.");
    }
}
