package com.worshiproom.proxy.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@DisplayName("RateLimitFilter integration")
class RateLimitIntegrationTest {

    @Autowired private MockMvc mockMvc;

    @Test
    @DisplayName("exhausting the bucket returns 429 with ProxyError body and Retry-After header")
    void exhaustedBucketReturnsProxyErrorShape() throws Exception {
        RequestPostProcessor withIp = withRemoteAddr("10.99.0.1");

        for (int i = 0; i < 50; i++) {
            mockMvc.perform(post("/api/v1/proxy/anything").with(withIp));
        }

        var response = mockMvc.perform(post("/api/v1/proxy/anything").with(withIp))
            .andExpect(status().isTooManyRequests())
            .andExpect(header().string("Retry-After", matchesPattern("^\\d+$")))
            .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
            .andExpect(jsonPath("$.message").value(not("")))
            .andExpect(jsonPath("$.requestId").value(not("")))
            .andExpect(jsonPath("$.timestamp").value(not("")))
            .andReturn().getResponse();

        long retryAfter = Long.parseLong(response.getHeader("Retry-After"));
        assertThat(retryAfter).isGreaterThanOrEqualTo(1L);
    }

    private static RequestPostProcessor withRemoteAddr(String ip) {
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }
}
