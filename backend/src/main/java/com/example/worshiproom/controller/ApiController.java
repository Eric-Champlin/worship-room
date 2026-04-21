package com.example.worshiproom.controller;

import com.example.worshiproom.config.ProxyConfig;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class ApiController {

    private final ProxyConfig config;

    public ApiController(ProxyConfig config) {
        this.config = config;
    }

    @GetMapping("/api/health")
    public Map<String, Object> healthLegacy() {
        return buildHealth();
    }

    @GetMapping("/api/v1/health")
    public Map<String, Object> health() {
        return buildHealth();
    }

    @GetMapping("/api/hello")
    public Map<String, String> hello() {
        return Map.of("message", "Hello");
    }

    private Map<String, Object> buildHealth() {
        var providers = new LinkedHashMap<String, Object>();
        providers.put("gemini", Map.of("configured", config.getGemini().isConfigured()));
        providers.put("googleMaps", Map.of("configured", config.getGoogleMaps().isConfigured()));
        providers.put("fcbh", Map.of("configured", config.getFcbh().isConfigured()));

        var result = new LinkedHashMap<String, Object>();
        result.put("status", "ok");
        result.put("providers", providers);
        return result;
    }
}
