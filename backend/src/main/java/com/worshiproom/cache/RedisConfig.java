package com.worshiproom.cache;

import io.lettuce.core.RedisURI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * Lettuce-backed Redis connection factory (Spec 5.6).
 *
 * <p>Resolution precedence (D6):
 * <ol>
 *   <li>If {@code spring.data.redis.url} is set (any non-empty value), parse as
 *       Upstash-compatible URI {@code redis[s]://[user][:password]@host[:port][/db]}
 *       via Lettuce's RedisURI.</li>
 *   <li>Otherwise fall back to {@code spring.data.redis.host/port/password} triplet
 *       (defaults: localhost / 6379 / empty).</li>
 * </ol>
 *
 * <p>Same connection factory across dev / prod / test profiles — profile-specific
 * behavior lives in CacheConfig and RateLimiterConfig, not here.
 */
@Configuration
public class RedisConfig {

    @Bean
    public RedisConnectionFactory redisConnectionFactory(
            @Value("${spring.data.redis.url:}") String url,
            @Value("${spring.data.redis.host:localhost}") String host,
            @Value("${spring.data.redis.port:6379}") int port,
            @Value("${spring.data.redis.password:}") String password) {

        RedisStandaloneConfiguration standalone;
        LettuceClientConfiguration.LettuceClientConfigurationBuilder clientBuilder =
            LettuceClientConfiguration.builder();

        if (url != null && !url.isBlank()) {
            RedisURI parsed = RedisURI.create(url);
            standalone = new RedisStandaloneConfiguration(parsed.getHost(), parsed.getPort());
            if (parsed.getPassword() != null) {
                standalone.setPassword(String.valueOf(parsed.getPassword()));
            }
            standalone.setDatabase(parsed.getDatabase());
            if (parsed.isSsl()) {
                clientBuilder.useSsl();
            }
        } else {
            standalone = new RedisStandaloneConfiguration(host, port);
            if (password != null && !password.isBlank()) {
                standalone.setPassword(password);
            }
        }

        return new LettuceConnectionFactory(standalone, clientBuilder.build());
    }

    @Bean
    public RedisTemplate<String, String> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, String> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new StringRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }
}
