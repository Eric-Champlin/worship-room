package com.example.worshiproom.controller;

import com.example.worshiproom.config.ProxyConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(SpringExtension.class)
@WebMvcTest(controllers = ApiController.class)
@TestPropertySource(properties = {
    "proxy.gemini.api-key=present",
    "proxy.google-maps.api-key=",
    "proxy.fcbh.api-key="
})
@DisplayName("ApiController")
class ApiControllerTest {

    @Autowired private MockMvc mockMvc;

    // @WebMvcTest narrows the context to web slice and excludes @Configuration
    // classes like ProxyConfig. @EnableConfigurationProperties registers it so
    // property binding fills in gemini.api-key from @TestPropertySource above,
    // and ProxyConfig's own @Bean methods (IpResolver, WebClient) fire,
    // satisfying the @Component filters that @WebMvcTest auto-registers.
    @TestConfiguration
    @EnableConfigurationProperties(ProxyConfig.class)
    static class TestConfig {
    }

    @Test
    @DisplayName("GET /api/v1/health returns 200 and provider statuses")
    void healthReturnsProviderStatuses() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ok"))
            .andExpect(jsonPath("$.providers.gemini").value(true))
            .andExpect(jsonPath("$.providers.googleMaps").value(false))
            .andExpect(jsonPath("$.providers.fcbh").value(false));
    }

    @Test
    @DisplayName("GET /api/health (legacy alias) returns same shape")
    void legacyHealthReturnsSameShape() throws Exception {
        mockMvc.perform(get("/api/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ok"));
    }
}
