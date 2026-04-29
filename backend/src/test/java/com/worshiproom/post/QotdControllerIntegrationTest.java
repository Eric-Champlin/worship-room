package com.worshiproom.post;

import com.worshiproom.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// worshiproom.qotd.cache.max-size relies on the application.properties default (2);
// no per-test override is needed. Cache-cap wiring is covered by QotdServiceTest.
@AutoConfigureMockMvc
class QotdControllerIntegrationTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void getTodaysQuestion_anonymousAccessAllowed() throws Exception {
        // No Authorization header — should pass via OPTIONAL_AUTH_PATTERNS.
        mvc.perform(get("/api/v1/qotd/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").exists())
                .andExpect(jsonPath("$.data.text").exists())
                .andExpect(jsonPath("$.data.theme").exists());
    }

    @Test
    void seedQotdQuestionsProductionChangeset_insertsAll72Rows() {
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM qotd_questions", Long.class);
        assertThat(count).isEqualTo(72L);

        // Verify all 72 ids are present.
        Long matchedIds = jdbc.queryForObject(
                "SELECT COUNT(*) FROM qotd_questions WHERE id LIKE 'qotd-%'", Long.class);
        assertThat(matchedIds).isEqualTo(72L);

        // Spot-check first and last expected ids.
        assertThat(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM qotd_questions WHERE id = 'qotd-1')", Boolean.class))
                .isTrue();
        assertThat(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM qotd_questions WHERE id = 'qotd-72')", Boolean.class))
                .isTrue();
    }
}
