package com.worshiproom.post.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Spec 6.5 — unit tests for {@link IntercessorEntry}, the load-bearing
 * Gate-G-ANONYMOUS-PRIVACY type. Two layers of enforcement verified:
 *
 * <ol>
 *   <li>Factory-method invariants reject malformed combinations at
 *       construction (named/null-userId, anonymous/non-null-userId).</li>
 *   <li>Jackson serialization omits the {@code userId} key entirely when
 *       {@code isAnonymous=true} — the field is ABSENT from JSON, not
 *       nullable. Asserted via {@code JsonNode.has("userId")}.</li>
 * </ol>
 */
class IntercessorEntryTest {

    private static final OffsetDateTime AT = OffsetDateTime.of(2026, 5, 13, 12, 0, 0, 0, ZoneOffset.UTC);
    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void named_rejectsNullUserId() {
        assertThatThrownBy(() -> IntercessorEntry.named(null, "Sarah", AT))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("named entry requires non-null userId");
    }

    @Test
    void named_rejectsBlankDisplayName() {
        assertThatThrownBy(() -> IntercessorEntry.named(UUID.randomUUID(), "  ", AT))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void anonymous_hasNullUserIdAndAnonymousDisplayName() {
        IntercessorEntry entry = IntercessorEntry.anonymous(AT);
        assertThat(entry.userId()).isNull();
        assertThat(entry.isAnonymous()).isTrue();
        assertThat(entry.displayName()).isEqualTo("Anonymous");
    }

    @Test
    void of_anonymousWithNonNullUserId_throws() {
        assertThatThrownBy(() -> IntercessorEntry.of(UUID.randomUUID(), "Anonymous", true, AT))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Gate-G-ANONYMOUS-PRIVACY");
    }

    @Test
    void of_namedWithNullUserId_throws() {
        assertThatThrownBy(() -> IntercessorEntry.of(null, "Sarah", false, AT))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void jsonSerialization_anonymousEntry_omitsUserIdKey() throws Exception {
        IntercessorEntry entry = IntercessorEntry.anonymous(AT);
        String json = mapper.writeValueAsString(entry);
        JsonNode node = mapper.readTree(json);

        // Gate-G-ANONYMOUS-PRIVACY (HARD): the key MUST be absent — not nullable.
        assertThat(node.has("userId")).isFalse();
        assertThat(node.get("isAnonymous").asBoolean()).isTrue();
        assertThat(node.get("displayName").asText()).isEqualTo("Anonymous");
    }

    @Test
    void jsonSerialization_namedEntry_includesUserIdKey() throws Exception {
        UUID id = UUID.randomUUID();
        IntercessorEntry entry = IntercessorEntry.named(id, "Sarah", AT);
        String json = mapper.writeValueAsString(entry);
        JsonNode node = mapper.readTree(json);

        assertThat(node.has("userId")).isTrue();
        assertThat(node.get("userId").asText()).isEqualTo(id.toString());
        assertThat(node.get("isAnonymous").asBoolean()).isFalse();
        assertThat(node.get("displayName").asText()).isEqualTo("Sarah");
    }
}
