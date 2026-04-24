package com.worshiproom;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

// Exclude UserDetailsServiceAutoConfiguration — Spring Boot's default in-memory
// user provider exists for HTTP Basic auth which we've disabled in SecurityConfig.
// Without this exclusion, Spring Boot prints a random "generated security password"
// at startup that is never used but leaks into stdout / log aggregators.
// See Spec 1.4 Step 2 verification guardrail.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class WorshipRoomApplication {

    public static void main(String[] args) {
        SpringApplication.run(WorshipRoomApplication.class, args);
    }

}
