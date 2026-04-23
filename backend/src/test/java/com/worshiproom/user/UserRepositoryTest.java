package com.worshiproom.user;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace;

@DataJpaTest
@AutoConfigureTestDatabase(replace = Replace.NONE)
@Testcontainers
class UserRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("worshiproom_test")
        .withUsername("test")
        .withPassword("test")
        .waitingFor(Wait.forListeningPort());

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private UserRepository userRepository;

    @Test
    void saveAndFindById() {
        User user = new User("alice@example.com", "$2a$10$hashedhashedhashed",
            "Alice", "Smith", "America/New_York");
        User saved = userRepository.save(user);
        assertThat(saved.getId()).isNotNull();

        Optional<User> loaded = userRepository.findById(saved.getId());
        assertThat(loaded).isPresent();
        assertThat(loaded.get().getEmail()).isEqualTo("alice@example.com");
        assertThat(loaded.get().getTimezone()).isEqualTo("America/New_York");
    }

    @Test
    void findByEmailIgnoreCase_exactMatch() {
        userRepository.save(new User("bob@example.com", "$2a$10$x", "Bob", "Jones", "UTC"));
        assertThat(userRepository.findByEmailIgnoreCase("bob@example.com")).isPresent();
    }

    @Test
    void findByEmailIgnoreCase_caseInsensitive() {
        userRepository.save(new User("carol@example.com", "$2a$10$x", "Carol", "Lee", "UTC"));
        assertThat(userRepository.findByEmailIgnoreCase("CAROL@Example.COM")).isPresent();
        assertThat(userRepository.findByEmailIgnoreCase("Carol@Example.Com")).isPresent();
    }

    @Test
    void findByEmailIgnoreCase_notFound() {
        assertThat(userRepository.findByEmailIgnoreCase("nobody@example.com")).isEmpty();
    }

    @Test
    void existsByEmailIgnoreCase_true() {
        userRepository.save(new User("dave@example.com", "$2a$10$x", "Dave", "Kim", "UTC"));
        assertThat(userRepository.existsByEmailIgnoreCase("DAVE@example.com")).isTrue();
    }

    @Test
    void existsByEmailIgnoreCase_false() {
        assertThat(userRepository.existsByEmailIgnoreCase("nobody@example.com")).isFalse();
    }

    @Test
    void displayNamePreferenceRoundTripsViaConverter() {
        User u = new User("eve@example.com", "$2a$10$x", "Eve", "Park", "UTC");
        u.setDisplayNamePreference(DisplayNamePreference.FIRST_LAST_INITIAL);
        User saved = userRepository.saveAndFlush(u);
        userRepository.findById(saved.getId()).ifPresent(loaded ->
            assertThat(loaded.getDisplayNamePreference()).isEqualTo(DisplayNamePreference.FIRST_LAST_INITIAL));
    }

    @Test
    void timezoneDefaultsToUTCWhenOmitted() {
        User u = new User("frank@example.com", "$2a$10$x", "Frank", "Ng", null);
        User saved = userRepository.save(u);
        assertThat(saved.getTimezone()).isEqualTo("UTC");
    }
}
