package com.worshiproom.post.engagement;

import com.worshiproom.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Schema-invariant assertions for Spec 3.7. The schema was shipped by Spec 3.1
 * (changesets 014 and 016); this test catches drift if a future spec ever
 * weakens or removes any of the invariants Spec 3.7's write endpoints rely on.
 *
 * <p>NO new Liquibase changeset is added by Spec 3.7. The brief's D7 schema
 * migration was determined OBSOLETE during recon (R1/R2/R3) — the schema
 * already matches the desired end state.
 */
class EngagementSchemaInvariantTest extends AbstractIntegrationTest {

    @Autowired private JdbcTemplate jdbc;

    @Test
    void postReactions_reactionType_isNotNullVarchar30() {
        var row = jdbc.queryForMap(
                "SELECT data_type, character_maximum_length, is_nullable, column_default " +
                "FROM information_schema.columns " +
                "WHERE table_name = 'post_reactions' AND column_name = 'reaction_type'");
        assertThat(row.get("data_type")).isEqualTo("character varying");
        assertThat(((Number) row.get("character_maximum_length")).intValue()).isEqualTo(30);
        assertThat(row.get("is_nullable")).isEqualTo("NO");
        assertThat(row.get("column_default")).asString().contains("'praying'");
    }

    @Test
    void postReactions_compositePrimaryKey_isPostIdUserIdReactionType() {
        List<String> pkColumns = jdbc.queryForList(
                "SELECT a.attname AS column_name " +
                "FROM pg_index i " +
                "JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) " +
                "WHERE i.indrelid = 'post_reactions'::regclass AND i.indisprimary " +
                "ORDER BY array_position(i.indkey, a.attnum)",
                String.class);
        assertThat(pkColumns).containsExactly("post_id", "user_id", "reaction_type");
    }

    @Test
    void postReactions_checkConstraint_restrictsToPrayingCandlePraisingAndCelebrate() {
        // pg_get_constraintdef returns the constraint clause for inspection.
        // Spec 6.6 — widened to include 'praising' (changeset 2026-05-14-001).
        // Spec 6.6b — widened to include 'celebrate' (changeset 2026-05-14-003).
        String checkClause = jdbc.queryForObject(
                "SELECT pg_get_constraintdef(c.oid) " +
                "FROM pg_constraint c " +
                "WHERE c.conname = 'post_reactions_reaction_type_check'",
                String.class);
        assertThat(checkClause)
                .contains("'praying'")
                .contains("'candle'")
                .contains("'praising'")
                .contains("'celebrate'");
    }

    @Test
    void posts_candleCount_isIntNotNullDefault0() {
        var row = jdbc.queryForMap(
                "SELECT data_type, is_nullable, column_default " +
                "FROM information_schema.columns " +
                "WHERE table_name = 'posts' AND column_name = 'candle_count'");
        assertThat(row.get("data_type")).isEqualTo("integer");
        assertThat(row.get("is_nullable")).isEqualTo("NO");
        assertThat(row.get("column_default")).asString().contains("0");
    }

    @Test
    void posts_praisingCount_isIntNotNullDefault0() {
        // Spec 6.6 — denormalized counter mirroring praying_count and candle_count
        // (changeset 2026-05-14-002).
        var row = jdbc.queryForMap(
                "SELECT data_type, is_nullable, column_default " +
                "FROM information_schema.columns " +
                "WHERE table_name = 'posts' AND column_name = 'praising_count'");
        assertThat(row.get("data_type")).isEqualTo("integer");
        assertThat(row.get("is_nullable")).isEqualTo("NO");
        assertThat(row.get("column_default")).asString().contains("0");
    }

    @Test
    void posts_celebrateCount_isIntNotNullDefault0() {
        // Spec 6.6b — denormalized counter mirroring praising_count
        // (changeset 2026-05-14-004).
        var row = jdbc.queryForMap(
                "SELECT data_type, is_nullable, column_default " +
                "FROM information_schema.columns " +
                "WHERE table_name = 'posts' AND column_name = 'celebrate_count'");
        assertThat(row.get("data_type")).isEqualTo("integer");
        assertThat(row.get("is_nullable")).isEqualTo("NO");
        assertThat(row.get("column_default")).asString().contains("0");
    }

    @Test
    void postBookmarks_compositePrimaryKey_isPostIdUserId() {
        List<String> pkColumns = jdbc.queryForList(
                "SELECT a.attname AS column_name " +
                "FROM pg_index i " +
                "JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) " +
                "WHERE i.indrelid = 'post_bookmarks'::regclass AND i.indisprimary " +
                "ORDER BY array_position(i.indkey, a.attnum)",
                String.class);
        assertThat(pkColumns).containsExactly("post_id", "user_id");
    }
}
