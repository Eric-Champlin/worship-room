package com.worshiproom.post;

import com.worshiproom.config.ProxyConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// {@code ProxyConfig} is imported to match the canonical proxy-slice-test convention
// (see {@code GeminiControllerTest}, {@code MapsControllerTest}, {@code FcbhControllerTest}).
// {@code @WebMvcTest} only loads {@code @Controller}/{@code @RestControllerAdvice} beans by
// default; importing the global {@code @ConfigurationProperties} class prevents
// "Failed to bind properties under 'proxy'" at slice startup when {@code application.properties}
// is read but {@code ProxyConfig} is otherwise outside the slice. {@code PostExceptionHandler}
// maps {@link QotdUnavailableException} → 404 in the empty-pool test.
@WebMvcTest(value = QotdController.class, excludeAutoConfiguration = SecurityAutoConfiguration.class)
@Import({PostExceptionHandler.class, ProxyConfig.class})
class QotdControllerTest {

    @Autowired private MockMvc mvc;
    @MockBean private QotdService service;

    @Test
    void getTodaysQuestion_returns200WithDtoShape() throws Exception {
        QotdQuestion fake = TestQotdFactory.build("qotd-42",
                "What Bible verse has comforted you most recently?",
                "encouraging",
                "Think about a moment in the last week when scripture met you.");
        when(service.findTodaysQuestion()).thenReturn(fake);

        mvc.perform(get("/api/v1/qotd/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value("qotd-42"))
                .andExpect(jsonPath("$.data.text").value("What Bible verse has comforted you most recently?"))
                .andExpect(jsonPath("$.data.theme").value("encouraging"))
                .andExpect(jsonPath("$.data.hint").value("Think about a moment in the last week when scripture met you."))
                // Confirm internal fields are NOT serialized.
                .andExpect(jsonPath("$.data.displayOrder").doesNotExist())
                .andExpect(jsonPath("$.data.isActive").doesNotExist())
                .andExpect(jsonPath("$.data.createdAt").doesNotExist())
                .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    void getTodaysQuestion_emptyPoolReturns404QotdUnavailable() throws Exception {
        when(service.findTodaysQuestion()).thenThrow(new QotdUnavailableException());

        mvc.perform(get("/api/v1/qotd/today"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("QOTD_UNAVAILABLE"))
                .andExpect(jsonPath("$.message").value("No question is available right now."));
    }
}
