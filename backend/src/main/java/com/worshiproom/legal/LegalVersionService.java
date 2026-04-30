package com.worshiproom.legal;

import org.springframework.stereotype.Service;

/**
 * Canonical source of truth for the three current legal-document versions.
 *
 * <p>Versions are encoded as ISO-8601 dates. To bump a version, you update
 * BOTH the markdown source at {@code content/{terms-of-service,privacy-policy,
 * community-guidelines}.md} AND the corresponding constant here AND the JSX
 * page at {@code frontend/src/pages/{TermsOfServicePage,PrivacyPolicyPage}.tsx}.
 * The coordination cost is acceptable because legal-doc updates are rare.
 *
 * <p>Constants are deliberately public — frontend never hardcodes versions; it
 * fetches via {@code GET /api/v1/legal/versions} which reads from these.
 *
 * <p>Per Spec 1.10f Watch-for #2: version validation uses string equality, NOT
 * lexicographic comparison. Submitting a version older than current OR newer
 * than current both reject with VERSION_MISMATCH.
 */
@Service
public class LegalVersionService {

    public static final String TERMS_VERSION = "2026-04-29";
    public static final String PRIVACY_VERSION = "2026-04-29";
    public static final String COMMUNITY_GUIDELINES_VERSION = "2026-04-29";

    /**
     * @return true iff submitted version exactly equals the current canonical version.
     *         Rejects null, mismatches, and any non-equal string.
     */
    public boolean isTermsVersionCurrent(String submitted) {
        return TERMS_VERSION.equals(submitted);
    }

    public boolean isPrivacyVersionCurrent(String submitted) {
        return PRIVACY_VERSION.equals(submitted);
    }

    public String currentTermsVersion() { return TERMS_VERSION; }
    public String currentPrivacyVersion() { return PRIVACY_VERSION; }
    public String currentCommunityGuidelinesVersion() { return COMMUNITY_GUIDELINES_VERSION; }
}
