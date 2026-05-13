package com.worshiproom.safety;

import java.util.List;

/**
 * Hardcoded crisis-resource content. Mirrors
 * {@code frontend/src/constants/crisis-resources.ts CRISIS_RESOURCES} VERBATIM —
 * any divergence is a content-management bug caught by CrisisResourcesParityTest.
 *
 * <p>Per 01-ai-safety.md "Crisis Resources (Hardcoded Constants)" section, these
 * are constants, NOT a config table. Changes go through a dedicated spec that
 * updates BOTH this file and the frontend file in the same commit.
 */
public final class CrisisResources {

    private CrisisResources() {}

    public static final String INTRO_MESSAGE =
            "It sounds like you're going through something heavy. " +
            "You're not alone — please reach out tonight.";

    public static final List<CrisisResource> RESOURCES = List.of(
            new CrisisResource(
                    "988 Suicide & Crisis Lifeline",
                    "988",
                    null,
                    "https://988lifeline.org",
                    "https://988lifeline.org/chat/"  // Spec 6.4 — surfaces in prayer-wall/CrisisResourcesBanner.tsx
            ),
            new CrisisResource(
                    "Crisis Text Line",
                    null,
                    "Text HOME to 741741",
                    "https://www.crisistextline.org",
                    null
            ),
            new CrisisResource(
                    "SAMHSA National Helpline",
                    "1-800-662-4357",
                    null,
                    "https://www.samhsa.gov/find-help/national-helpline",
                    null
            )
    );

    public static CrisisResourcesBlock buildBlock() {
        return new CrisisResourcesBlock(INTRO_MESSAGE, RESOURCES);
    }
}
