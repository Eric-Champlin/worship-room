package com.worshiproom.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@Configuration
public class PasswordConfig {

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        // Spring Security default strength = 10. ~60ms hash time on modern
        // hardware. Acceptable for MVP per 02-security.md.
        return new BCryptPasswordEncoder();
    }
}
