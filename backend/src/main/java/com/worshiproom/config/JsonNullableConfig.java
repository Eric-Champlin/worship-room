package com.worshiproom.config;

import com.fasterxml.jackson.databind.Module;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Registers {@link JsonNullableModule} with the global ObjectMapper so
 * {@code JsonNullable<T>} fields in PATCH request DTOs deserialize correctly.
 *
 * Without this, a PATCH body's omitted fields and explicit-null fields would
 * both deserialize to {@code JsonNullable.undefined()}, defeating the
 * partial-update semantics (omitted ≠ null) required by Spec 1.6.
 */
@Configuration
public class JsonNullableConfig {

    @Bean
    public Module jsonNullableModule() {
        return new JsonNullableModule();
    }
}
