# Spec 0.1 — Backend Foundation Learning Document

- **ID:** `round3-phase00-spec01-backend-foundation-learning`
- **Phase:** 0 (Backend Foundation Learning)
- **Type:** Teaching document — NOT a Claude Code execution spec
- **Audience:** Eric (you)
- **Status:** Reading document. CC should not attempt to execute this spec. If CC opens this file, CC should close it and wait for a real spec.

> **How to read this.** Top to bottom, once. Don't try to memorize. The goal is pattern recognition — when CC generates a Java file in Phase 1 and you see `@RestController` at the top, you should be able to think "oh, that's the controller annotation, it maps HTTP routes to methods" instead of "what is this." If a section feels obvious, skim it. If a section feels foreign, sit with it. Expect this to take about two hours.
>
> **What this document does NOT do.** It doesn't make you a backend engineer. It doesn't cover everything that can go wrong with Spring Boot in production. It doesn't replace the Spring docs. It gives you *enough* mental model to review CC's work, push back on architectural choices you disagree with, and debug when CC gets confused.

---

## 1. Why we're doing this

You've been writing frontend code on Worship Room for months. Everything lives in React components, hooks, and localStorage. It works — the app is shippable, the Round 2 redesign is beautiful, and Eric-on-his-laptop has a good experience with it.

But Eric-on-his-laptop and Eric-on-his-phone are two different people as far as the app knows. You tap "praying" on a prayer card on the laptop, open the app on your phone, and the state isn't there. Friends you added on the laptop don't exist on the phone. Your streak on one device has no idea about your streak on the other. This is because *localStorage is per-device, per-browser*. Not per-user. There is no "user" in the backend sense — there is a fake user object in memory.

That's the big reason. There are smaller reasons too:

**The reaction bug.** Right now, even on a single device, tapping "praying" on the feed and then navigating to the prayer detail page shows a *different* reaction state. Each page instantiates `usePrayerReactions` independently, each one calls `useState(getMockReactions())`, and they never talk to each other. This is the BB-45 anti-pattern you documented. It's a broken experience for the one user (you) on the one device (your laptop) — it has nothing to do with multi-device. We're fixing this in Phase 0.5 *before* any backend work, via a reactive store with `useSyncExternalStore`. That fix buys us cross-page consistency. The backend in Phase 3 buys us cross-*device* consistency.

**The services layer is already a clean swap point.** The Prayer Wall recon found this and it's the reason we can do a backend migration without rewriting the UI. The 22 Prayer Wall components read from hooks (`usePrayerReactions`, `useAuth`, `usePrayerCategories`, etc.) which read from mock-data modules. If the hooks swap their internal implementation from `getMockReactions()` to `fetch('/api/v1/reactions')`, the components don't notice. That's the whole game in Phase 3 — swap the guts, leave the surface alone.

**Dual-write is our safety net.** We're not yanking localStorage out and hoping the backend works. For the Forums Wave, every write goes to *both* localStorage and the backend. localStorage stays the source of truth for reads. The backend gets populated as a shadow copy. If the backend hiccups, nothing breaks — you keep using the app, the shadow copy gets behind, and when the backend comes back we reconcile. If the backend *doesn't* hiccup (the happy path), we slowly migrate reads one feature at a time in later waves. The blast radius of a backend bug is limited to "the shadow copy is stale for a bit." That's it.

So: the Forums Wave exists because Worship Room needs to be multi-device to be real, the reaction bug needs fixing regardless, the services layer makes the swap cheap, and dual-write keeps the risk bounded. That's the framing.

---

## 2. What's already in the backend folder

Before we talk about Spring Boot in the abstract, let's walk through what's actually in the repo.

```
backend/
├── pom.xml
├── Dockerfile
├── mvnw
├── mvnw.cmd
├── .mvn/
└── src/
    └── main/
        ├── java/com/example/worshiproom/
        │   ├── WorshipRoomApplication.java
        │   ├── config/
        │   │   └── CorsConfig.java
        │   └── controller/
        │       └── ApiController.java
        └── resources/
            └── application.properties
```

Let's go through these one at a time.

**`pom.xml`** — this is Maven's equivalent of `package.json`. It lists dependencies, plugins, build configuration, and the project coordinates (group ID, artifact ID, version). The existing file declares Spring Boot 3.5.11 as the parent, Java 21 as the source/target, and pulls in `spring-boot-starter-web`. That's it — no JPA yet, no security yet, no Liquibase yet. Phase 1 adds those. The group ID is currently `com.example.worshiproom`; Phase 1 renames it to `com.worshiproom` for production identity. That rename is not cosmetic — it changes the package path of every Java file in the project.

**`Dockerfile`** — builds a production image. Multi-stage: stage 1 builds the jar with Maven inside the container, stage 2 copies the jar into a small JRE image. You won't touch this in the early phases; it's set up correctly.

**`mvnw` and `mvnw.cmd` and `.mvn/`** — the Maven Wrapper. Same idea as Gradle Wrapper, which you've used before: checks in a small script and a `.properties` file that tells Maven which version to download on first run. Everyone on the project runs the same Maven version without installing it globally. You run `./mvnw <goal>` instead of `mvn <goal>`. The wrapper handles the rest.

**`WorshipRoomApplication.java`** — the main class. This is the entry point:

```java
@SpringBootApplication
public class WorshipRoomApplication {
    public static void main(String[] args) {
        SpringApplication.run(WorshipRoomApplication.class, args);
    }
}
```

Two things are happening. `@SpringBootApplication` is a meta-annotation that turns on auto-configuration (Spring looks at the classpath, sees `spring-boot-starter-web`, and automatically configures an embedded Tomcat server plus the MVC machinery). `SpringApplication.run(...)` is the bootstrapper — it scans the classpath for your components, wires them up, starts the server, and blocks. When you run `./mvnw spring-boot:run`, *this method is what runs*.

**`config/CorsConfig.java`** — tells Spring to allow requests from `http://localhost:5173` (Vite's dev server) to reach the backend. Without this, the browser would block every fetch call the frontend makes during development with a CORS error. We'll talk about CORS properly in section 12.

**`controller/ApiController.java`** — has two endpoints: `GET /api/health` (returns `{"status": "ok"}`) and `GET /api/hello` (returns `{"message": "Hello from Spring Boot"}`). These exist to prove the frontend can talk to the backend. Nothing else. We'll dissect this file line-by-line in section 5.

**`application.properties`** — Spring's config file. Minimal right now: server port, application name. Phase 1 adds database connection, JPA settings, Liquibase config, JWT secret reference, and profile-specific files (`application-dev.properties` for development, `application-test.properties` for tests, `application-prod.properties` for production).

**What about Maven vs Gradle?**

You've used Gradle via the wrapper on Ramsey projects. Maven is the older, more verbose tool — XML-based configuration, convention-over-configuration taken very far, lifecycle phases baked in (`validate`, `compile`, `test`, `package`, `install`, `deploy`). Gradle is Groovy/Kotlin DSL, more flexible, fancier incremental build. For a Spring Boot API with straightforward dependencies, Maven is fine. The reason *we* are using Maven is simple: it is what is already in the repo and CLAUDE.md says so. You don't need to have opinions about it.

The Maven commands you'll actually run:

- `./mvnw clean` — delete the `target/` directory (compiled output)
- `./mvnw compile` — compile the source (rare, usually run automatically by later phases)
- `./mvnw test` — run the unit tests
- `./mvnw verify` — run unit + integration tests
- `./mvnw spring-boot:run` — start the server locally (this is the one you'll live in)
- `./mvnw package` — build the jar

When in doubt, `./mvnw verify` runs everything and tells you if anything is broken.

---

## 3. Installing the toolchain

**Docker Desktop** — you already have it from the BB-26 work. Sanity check: open a terminal and run `docker --version`. If you see something like `Docker version 24.x.x, build ...`, you're fine. If not, reinstall from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) — Apple Silicon build for your M-series Mac. After install, open Docker Desktop once to accept the license and let it start the Docker daemon. The daemon needs to be running whenever you're working on the backend — the top menu bar whale icon should be solid, not an outline.

**JDK 21 (Temurin)** — Java runtime. Temurin is the Eclipse-maintained OpenJDK build, which is what we want. Install via Homebrew:

```bash
brew tap homebrew/cask-versions
brew install --cask temurin@21
```

Verify:

```bash
java -version
```

Expected output:

```
openjdk version "21.0.x" ...
OpenJDK Runtime Environment Temurin-21.0.x ...
```

If `java -version` reports Java 17 or 11 or anything other than 21, you likely have multiple JDKs and the wrong one is first on your PATH. Fix with:

```bash
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 21)' >> ~/.zshrc
source ~/.zshrc
java -version
```

If that still doesn't work, run `/usr/libexec/java_home -V` (capital V) to see every JDK macOS knows about and make sure 21 is in the list.

**Confirm `./mvnw spring-boot:run` works.**

```bash
cd ~/worship-room/backend
./mvnw spring-boot:run
```

First run downloads Maven itself (the wrapper pulls it) and every dependency — this takes a few minutes. You'll see a wall of "Downloading from central: ..." lines. After that, you should see Spring Boot's banner (the ASCII art) followed by a startup log ending in something like:

```
Tomcat started on port(s): 8080 (http) with context path ''
Started WorshipRoomApplication in 2.3 seconds
```

The backend is now running on `http://localhost:8080`. Open a second terminal and curl the health endpoint:

```bash
curl http://localhost:8080/api/health
```

Expected: `{"status":"ok"}`. If you get that, everything is working. `Ctrl-C` in the first terminal to stop the server.

**Troubleshooting the most common problems:**

*"Port 8080 already in use."* Something else is using that port. Find it with `lsof -i :8080`, kill it with `kill <pid>`, or change the port in `application.properties` (`server.port=8081`).

*"Unsupported class file major version 65."* This error means a tool is trying to run Java 21 bytecode on an older JVM. Almost always a JDK version mismatch. Recheck `java -version` and `JAVA_HOME`.

*"Cannot connect to the Docker daemon."* Docker Desktop isn't running. Open the app from Applications.

*Apple Silicon Rosetta weirdness.* If you end up with x86_64 Java instead of arm64, nothing will work well. `java -XshowSettings:properties -version 2>&1 | grep os.arch` — expected `aarch64`. If it says `x86_64`, reinstall Temurin and make sure Homebrew is the arm64 build (`/opt/homebrew`, not `/usr/local`).

---

## 4. The daily development loop

Here's what a working day looks like once the Forums Wave is underway. This is practical — print it and tape it next to your monitor if you want.

**Morning, starting fresh:**

```bash
# Terminal 1 — start Postgres in Docker (runs in background)
cd ~/worship-room
docker compose up -d postgres

# Terminal 2 — start the backend (foreground, shows logs)
cd ~/worship-room/backend
./mvnw spring-boot:run

# Terminal 3 — start the frontend (foreground, shows Vite output)
cd ~/worship-room/frontend
pnpm dev
```

That's three terminals. Postgres is detached (`-d`) so it just runs silently in the background. The backend and frontend each stay in the foreground so you can see logs, compile errors, and hot-reload output. I recommend iTerm split panes or tmux — whatever you use to keep three terminals visible at once without `alt-tab`ing.

**Frontend hot reload** — Vite watches `frontend/src/**` and hot-reloads in the browser on every save. You know this already.

**Backend hot reload** — `spring-boot-devtools` is on the classpath. When you save a `.java` file and your IDE recompiles (IntelliJ does this automatically; VS Code's Java extension does it on save if you've configured it), devtools detects the change and restarts the Spring context in about one to two seconds. It's not *Vite* fast, but it's fast enough. You don't have to re-run `./mvnw spring-boot:run`.

**Ending the day:**

```bash
# In the frontend terminal: Ctrl-C
# In the backend terminal:  Ctrl-C
# Stop Postgres:
docker compose stop postgres
```

`docker compose stop` pauses the container but keeps the volume (your data). Starting back up with `docker compose up -d postgres` tomorrow gets you back to exactly where you were.

**Wiping the database for a clean slate:**

```bash
docker compose down -v
```

The `-v` is the important part — it deletes the named volumes. Without `-v`, `down` just stops the container and keeps the data. *With* `-v`, next time you `up`, Liquibase re-runs all changesets from scratch against an empty database. Use this when you've been mucking around with seed data or migrations and want a known state.

**One more thing.** If something feels stuck (tests are failing mysteriously, the backend won't start, Liquibase is complaining about an inconsistent state) the first move is almost always `docker compose down -v && docker compose up -d postgres` and try again. A stale database causes the most "what is happening" moments.

---

## 5. Spring Boot concepts, by example

Let's dissect `ApiController.java` — the file that already exists in the skeleton. Every annotation in the Forums Wave shows up here or is one step away from something here.

```java
package com.example.worshiproom.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class ApiController {

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @GetMapping("/hello")
    public Map<String, String> hello() {
        return Map.of("message", "Hello from Spring Boot");
    }
}
```

Going annotation by annotation:

**`@RestController`** — tells Spring two things at once. First, this class is a bean (Spring creates one instance and manages its lifecycle). Second, every method's return value should be serialized to JSON and written to the HTTP response body. Without `@RestController`, Spring would try to render return values as view templates (like Thymeleaf) — which we don't want. `@RestController` is the right choice for JSON APIs and it's what every controller in the Forums Wave will use.

**`@RequestMapping("/api")`** at the class level — every route in this class is prefixed with `/api`. So `@GetMapping("/health")` inside the class becomes `GET /api/health`, not just `GET /health`. Phase 1 changes this to `/api/v1` for versioning.

**`@GetMapping("/health")`** on a method — this method handles `GET /api/health`. There are siblings: `@PostMapping`, `@PutMapping`, `@PatchMapping`, `@DeleteMapping`. Each one binds a method to an HTTP verb + path combination.

Now, annotations you'll see in Phase 1 but not in this file yet:

**`@PostMapping`** — handles POST. In Phase 3, something like:

```java
@PostMapping("/posts")
public ResponseEntity<PostResponse> createPost(
    @RequestBody @Valid CreatePostRequest request,
    @AuthenticationPrincipal UserPrincipal currentUser
) { ... }
```

**`@RequestBody`** — "take the JSON request body, deserialize it into this Java object, and pass it as the parameter." Jackson (which Spring Boot uses by default) handles the JSON-to-Java conversion. You don't write any parsing code.

**`@PathVariable`** — grabs a piece of the URL path. For `GET /api/v1/posts/{postId}`:

```java
@GetMapping("/posts/{postId}")
public PostResponse getPost(@PathVariable UUID postId) { ... }
```

`{postId}` in the URL becomes the `postId` parameter. Type conversion is automatic — Spring parses the UUID string and hands you a real `UUID` object.

**`@RequestParam`** — grabs a query-string parameter. For `GET /api/v1/posts?category=health&page=1`:

```java
public PostsResponse listPosts(
    @RequestParam(required = false) String category,
    @RequestParam(defaultValue = "1") int page
) { ... }
```

**`@Autowired`** and constructor injection — Spring's dependency injection mechanism. In older code you'd see:

```java
@Autowired
private PostService postService;
```

But the modern convention (and what we'll use in the Forums Wave) is constructor injection, no annotation needed on the constructor:

```java
@RestController
public class PostController {
    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }
}
```

Spring sees the constructor, sees it needs a `PostService`, finds the `PostService` bean, passes it in. No magic setter fields. This is testable — in a unit test you just construct the controller with a mock.

**`@Service`, `@Repository`, `@Component`, `@Configuration`** — all four are variations of "this class is a bean, Spring should manage it."

- `@Service` goes on the business logic classes (`PostService`, `ActivityService`)
- `@Repository` goes on the data access classes (not that we'll write many — Spring Data JPA generates these for us, see section 6)
- `@Configuration` goes on classes that define beans via `@Bean` methods (like `CorsConfig.java`)
- `@Component` is the generic catch-all — when none of the above fit.

Functionally they're close to identical; the different names exist so it's easy to tell at a glance what layer a class belongs to.

**`@Bean`** — goes on a method inside a `@Configuration` class. The method's return value becomes a Spring-managed bean:

```java
@Configuration
public class CorsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**").allowedOrigins("http://localhost:5173");
            }
        };
    }
}
```

Use `@Bean` when you need to construct something yourself (especially if it's a class you don't own and can't annotate) or when the construction logic is non-trivial.

**The key mental model.** Spring Boot is opinionated. These annotations are how you signal your intent to the framework. The framework does the heavy lifting — wiring objects, translating HTTP, serializing JSON, starting Tomcat. You don't need to understand the framework internals to use it correctly. You need to know which annotation does what.

---

## 6. JPA and Hibernate — what to use and what to avoid

This section has a teaching point I want you to actually internalize, because it is the number-one way Spring Boot projects go wrong: **Hibernate's lazy loading and bidirectional relationship mappings are a footgun.** We're going to avoid them.

**What is JPA.** Java Persistence API — a specification for object-relational mapping. You annotate a Java class with `@Entity` and JPA can load/save it to a relational database without you writing SQL. **Hibernate** is the implementation of JPA that Spring Boot uses by default. **Spring Data JPA** is a layer on top of Hibernate that lets you write repository interfaces (no implementation class) and have Spring generate the implementation at runtime.

Here's a minimal entity:

```java
@Entity
@Table(name = "posts")
public class Post {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // getters, setters, JPA-required no-arg constructor ...
}
```

And a repository:

```java
public interface PostRepository extends JpaRepository<Post, UUID> {
    List<Post> findByUserId(UUID userId);
}
```

That's it. No implementation. Spring Data JPA parses the method name `findByUserId`, generates a query, runs it. You can also write explicit queries with `@Query`. You get `save`, `findById`, `findAll`, `deleteById`, and a bunch more for free by extending `JpaRepository`.

**Now the footgun.** The JPA way of modeling a Post-with-Comments relationship looks like this:

```java
@Entity
public class Post {
    @Id private UUID id;
    // ...

    @OneToMany(mappedBy = "post", fetch = FetchType.LAZY)
    private List<Comment> comments;
}

@Entity
public class Comment {
    @Id private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User author;
    // ...
}
```

Feels natural. A Post has Comments. A Comment belongs to a Post. Beautiful object graph. Except here's what happens when you do:

```java
List<Post> posts = postRepository.findAll(); // 1 query — "SELECT * FROM posts"
for (Post post : posts) {
    System.out.println(post.getComments().size()); // 1 more query per post!
}
```

**This is the N+1 query problem.** One query to fetch 20 posts. Twenty more queries to fetch each post's comments individually. Twenty-one queries to render a feed page. In production with real traffic and a real database, this tanks performance. You won't notice it in dev — everything fits in memory, no latency — and then staging falls over.

It gets worse. Add an author relationship:

```java
for (Post post : posts) {
    System.out.println(post.getAuthor().getDisplayName()); // another query per post
    System.out.println(post.getComments().size());          // another query per post
}
```

Now it's 1 + 20 + 20 = 41 queries. For 20 posts.

**What we do instead.**

For anything non-trivial, we write explicit queries with `JOIN FETCH`:

```java
public interface PostRepository extends JpaRepository<Post, UUID> {
    @Query("SELECT p FROM Post p " +
           "LEFT JOIN FETCH p.author " +
           "LEFT JOIN FETCH p.comments " +
           "WHERE p.createdAt > :since")
    List<Post> findRecentWithAuthorAndComments(@Param("since") Instant since);
}
```

One query. Done. This loads the posts, their authors, and their comments in a single SQL statement. No N+1.

**We also avoid bidirectional `@OneToMany` / `@ManyToOne` pairings unless they earn their place.** The `Post.comments` field in the example above is bidirectional: Post has `List<Comment>`, Comment has `Post post`. Bidirectional relationships are harder to reason about, harder to keep in sync (if you add a Comment to `post.comments`, did you also set `comment.post = post`?), and harder to serialize to JSON (infinite loops are easy).

Our convention: **store foreign keys as plain UUID columns on entities, not as object references, unless there's a specific reason.** So:

```java
@Entity
public class Comment {
    @Id private UUID id;

    @Column(name = "post_id", nullable = false)
    private UUID postId;          // plain UUID, not Post

    @Column(name = "user_id", nullable = false)
    private UUID userId;          // plain UUID, not User

    @Column(nullable = false)
    private String body;
    // ...
}
```

When a service needs the full Post+Comments tree, it uses a repository query that joins on the foreign key explicitly. This is more verbose than a fully-mapped object graph, but it's *predictable*. Every query is visible. Every fetch is intentional. Nothing loads behind your back.

**The heuristic:** when CC generates an entity with `@OneToMany` or `@ManyToOne`, ask "does this earn its keep, or is the foreign-key-as-UUID version simpler?" Nine times out of ten, UUID is simpler and we take that path.

**Other things you're allowed to forget for now:** `@OneToOne`, JPA entity inheritance strategies (`@Inheritance`, `@DiscriminatorColumn`), JPA callbacks (`@PrePersist`, `@PostLoad`), detached entity state, the `EntityManager` API. Spring Data JPA's repositories cover everything we need for the Forums Wave.

---

## 7. Liquibase

You've used Liquibase at Ramsey. This section is a short map from what you already know to how we've set it up here.

**What you already know (from work):** Liquibase manages database schema changes as a series of changesets. Each changeset has an ID and an author. Liquibase keeps a `DATABASECHANGELOG` table tracking which changesets have been applied. Running Liquibase applies any changesets that haven't been applied yet, in order. Once a changeset is applied to a real environment, you never edit it — you write a new changeset that amends the schema.

**How it's set up here.**

Changesets live in `backend/src/main/resources/db/changelog/`. The master file is `db/changelog/db.changelog-master.yaml` — it's just a list of includes:

```yaml
databaseChangeLog:
  - include:
      file: db/changelog/changes/001-create-users-table.yaml
  - include:
      file: db/changelog/changes/002-create-posts-table.yaml
  # ... etc
```

Individual changesets live in `db/changelog/changes/`. Naming convention: `NNN-short-description.yaml`, zero-padded three-digit number, lowercase-kebab-case description.

A typical changeset:

```yaml
databaseChangeLog:
  - changeSet:
      id: 001-create-users-table
      author: eric
      changes:
        - createTable:
            tableName: users
            columns:
              - column:
                  name: id
                  type: UUID
                  constraints:
                    primaryKey: true
                    nullable: false
              - column:
                  name: email
                  type: VARCHAR(255)
                  constraints:
                    nullable: false
                    unique: true
              - column:
                  name: created_at
                  type: TIMESTAMP WITH TIME ZONE
                  constraints:
                    nullable: false
      rollback:
        - dropTable:
            tableName: users
```

**Contexts.** Liquibase contexts let you conditionally apply changesets. Our three contexts:

- `dev` — applied in local development (includes seed data like the 60 QOTD questions)
- `test` — applied in Testcontainers during integration tests (includes minimal test fixtures)
- `prod` — applied in production (no seed data, no fixtures)

Structural changesets (create table, add column) have no context — they apply everywhere. Seed-data changesets are tagged with a context:

```yaml
- changeSet:
    id: 020-seed-qotd-questions
    author: eric
    contexts: dev,test
    changes:
      # ... insert statements
```

The context is controlled by `spring.liquibase.contexts` in each profile's `application-*.properties`.

**The one rule you must not forget:** once a changeset has run anywhere real (staging, production, teammate's machine), never edit it. If you try, Liquibase will detect the checksum change and refuse to start the app. Instead, write a new changeset: `042-add-index-to-posts-user-id.yaml` that does the new thing. This is the same discipline you have at Ramsey.

**One gotcha specific to this project:** we run Liquibase at app startup (`spring.liquibase.enabled=true` + automatic execution on Spring Boot start). This means every time you start the backend, Liquibase checks for pending changesets and applies them before the Spring context finishes booting. If a changeset is malformed, the backend fails to start and the error shows up in the backend log — not in a separate migration log. Read the whole stack trace; the Liquibase errors are pretty clear once you know where to look.

---

## 8. Spring Security + JWT token flow

Auth is the part that feels most magic when you haven't seen it before, so let's walk it step by step. No hand-waving; every step has a concrete code location.

**The flow when a user logs in:**

1. Frontend calls `POST /api/v1/auth/login` with `{ "email": "eric@example.com", "password": "hunter2hunter2" }`
2. Backend's `AuthController.login(...)` receives the request, calls `AuthService.login(email, password)`
3. `AuthService` loads the `User` by email via `UserRepository.findByEmail(...)`
4. If no user found, `AuthService` returns a generic "invalid credentials" error (see "anti-enumeration" below)
5. If user found, `AuthService` calls `passwordEncoder.matches(password, user.getPasswordHash())` — this is `BCryptPasswordEncoder`, it re-hashes the input with the stored salt and compares
6. If password doesn't match, return the same generic error
7. If everything checks out, `JwtService.generateToken(user)` builds a JWT — header, payload with `sub=user.id`, `iat=now`, `exp=now+1h`, signed with `JWT_SECRET` (HS256)
8. Backend returns `{ "data": { "token": "eyJhbGc...", "user": { ... } } }`
9. Frontend stores the token in React state via `AuthContext` (NOT localStorage — localStorage tokens are vulnerable to XSS, and our HTTP-only cookie strategy is deferred to Phase 10)

**The flow on every subsequent request:**

1. Frontend adds header `Authorization: Bearer eyJhbGc...` to every API call
2. Backend's `JwtAuthenticationFilter` (registered in `SecurityConfig`) runs on every request before the controller
3. Filter pulls the token from the header, validates the signature with `JWT_SECRET`, validates `exp > now`
4. If valid, filter extracts the `sub` claim (the user ID), loads the `UserPrincipal`, puts it in Spring Security's `SecurityContext`
5. If invalid (bad signature, expired, missing), filter returns 401 and the request never reaches the controller
6. Controller methods annotated with `@AuthenticationPrincipal UserPrincipal currentUser` receive the authenticated user automatically

**What that looks like in a controller:**

```java
@PostMapping("/posts")
public ResponseEntity<PostResponse> createPost(
    @RequestBody @Valid CreatePostRequest request,
    @AuthenticationPrincipal UserPrincipal currentUser
) {
    Post post = postService.create(request, currentUser.getId());
    return ResponseEntity.status(HttpStatus.CREATED).body(PostResponse.from(post));
}
```

The `currentUser` parameter is populated by Spring Security, via the filter, via the JWT, via the `Authorization` header. No magic — just plumbing.

**Password rules (Forums Wave):**

- BCrypt hashing with cost factor 12 (standard; ~200ms per hash, which is slow enough to make offline attacks expensive)
- 12-character minimum password length on the frontend *and* the backend (never trust the client)
- No password complexity rules beyond length — research consistently shows length beats complexity and doesn't frustrate users
- Anti-enumeration on registration: if the email is taken, the API returns the same "check your email for a confirmation link" response it would return for a new signup. The actual confirmation email is only sent if the account is new. This prevents "is eric@example.com registered here" attacks.

**Login rate limiting:** 5 failed attempts per IP per 15 minutes, then soft-lock for 15 minutes. Implementation uses Redis counters (see `.claude/rules/02-security.md`). This prevents brute force even with bad passwords.

**Token expiry:** 1 hour. Short, so a leaked token has a short window of damage. Refresh tokens are deferred to a later phase — for now, the frontend just prompts re-login when a token expires.

**Where `JWT_SECRET` comes from:** environment variable. Never in git. See section 11 on Spring profiles.

**The frontend side (what changes in `AuthContext.tsx`):**

The `useAuth()` hook keeps its return shape. What changes:

- `login(name)` becomes `login(email, password)`
- Instead of setting a fake user object, it calls `POST /api/v1/auth/login`, receives `{ token, user }`, stores them in React state
- Every API call (through `apiClient`) adds the `Authorization` header automatically
- `logout()` clears the token from state and calls `POST /api/v1/auth/logout` (which is a server-side no-op for JWT but exists for observability)

**The 121 consumers** of `useAuth()` almost all read just `user.name` and `user.id`. They don't care about tokens. They don't care that authentication changed from "set a local name" to "sign a JWT." They keep working. Only about 5-10 call sites need updates: the AuthModal (new fields for email/password), the dev login button (needs real test credentials), the welcome wizard (registration instead of just name entry), and a handful of other specific touchpoints.

**One critical subtle thing:** Spring Security works via *servlet filters*, which run *before* the controller. If authentication fails at the filter level, the controller method never executes. That means you can't add "if not authenticated, return 401" logic inside the controller — by the time you're in the controller, the user is authenticated. The filter handles rejection. Spring config (`SecurityConfig.java`) controls which routes require auth and which are public (`/api/v1/auth/login`, `/api/v1/auth/register`, `/api/health`, etc).

---

## 9. OpenAPI as a contract

Quick version, because this is more workflow than teaching.

**What OpenAPI is.** A JSON/YAML format for describing HTTP APIs — endpoints, parameters, request bodies, response shapes, error formats. An OpenAPI spec is machine-readable, which means tools can generate code from it.

**Why we're using it.** Two reasons. First, it's documentation that can't drift from reality — we generate TypeScript types from the spec, so if the spec is wrong, the frontend doesn't compile. Second, it catches contract bugs at build time instead of runtime. If the backend renames a field and the frontend wasn't updated, the TypeScript compile fails on the frontend before any HTTP request is made.

**How it's set up.** `springdoc-openapi` is on the backend classpath. It generates an OpenAPI JSON spec automatically from the controllers, DTOs, and validation annotations. The spec is served at `/v3/api-docs` when the backend runs.

On the frontend, we have a script `pnpm types:generate` that:

1. Hits `http://localhost:8080/v3/api-docs`
2. Runs `openapi-typescript` against the returned spec
3. Writes `frontend/src/generated/api-types.ts`

**The daily workflow:**

1. Backend change: add a field to a request DTO, add an endpoint, change a response shape
2. Backend runs — the OpenAPI spec regenerates automatically on startup
3. Frontend: run `pnpm types:generate`
4. TypeScript compile catches anywhere the old types were used
5. Fix the usages; everything stays in sync

**Why hand-written types would be worse.** Hand-written types drift. Someone adds a field on the backend, forgets to update the frontend type, the field is available at runtime but TypeScript doesn't know about it, the feature half-works, and nobody notices until production. Generated types remove the gap.

**The rule:** never hand-write types for backend API shapes. Always generate. `frontend/src/generated/` is treated as untouchable — you don't edit it, you regenerate it.

---

## 10. Testcontainers

Here's the thing that surprises people: our integration tests spin up a real PostgreSQL inside a Docker container for each test run.

**Why.** H2 and other in-memory databases are nice and fast, but they lie. H2 doesn't behave identically to PostgreSQL. Specifically: H2 handles `UUID` columns differently, handles `JSONB` differently (it has no JSONB at all), handles text search differently, handles concurrent transactions differently. If you test against H2 and deploy to PostgreSQL, you find out about the differences in production. That's bad.

Testcontainers solves this by starting an actual PostgreSQL container during the test run, applying Liquibase against it, running the tests, then tearing it down. Slower than H2 (a few seconds of container startup) but the tests exercise exactly the database PostgreSQL runs in production.

**What the test looks like:**

```java
@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("worshiproom_test")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void registerPgProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
}
```

Every integration test extends this base class. The container starts once per JVM (static field), gets reused across test classes, and shuts down at the end. Liquibase runs on the real PostgreSQL schema at boot.

A concrete test:

```java
class PostServiceIntegrationTest extends AbstractIntegrationTest {
    @Autowired PostService postService;
    @Autowired PostRepository postRepository;

    @Test
    void createPost_persistsAndReturnsDto() {
        CreatePostRequest request = new CreatePostRequest("My first post", "health");
        UUID userId = UUID.randomUUID();

        PostResponse response = postService.create(request, userId);

        assertThat(response.id()).isNotNull();
        Post persisted = postRepository.findById(response.id()).orElseThrow();
        assertThat(persisted.getUserId()).isEqualTo(userId);
    }
}
```

**Requirements for running tests:** Docker Desktop must be running. That's it. Testcontainers talks to the Docker daemon to start/stop containers. If Docker isn't running, you'll see "Could not find a valid Docker environment" — start Docker and re-run.

**Cost:** Initial pull of the `postgres:16-alpine` image takes a minute on first run. After that, each test run is a few seconds of container startup overhead. Worth it for the fidelity.

---

## 11. The Spring profiles system

Spring profiles let you configure different environments without writing conditional code. You have one `application.properties` for shared config, then `application-dev.properties`, `application-test.properties`, `application-prod.properties` for environment-specific overrides.

**How it works:**

1. On startup, Spring reads `application.properties` first — these are defaults.
2. Spring then reads the profile-specific file for the active profile. Values here override the defaults.
3. Environment variables override everything above, using a naming convention: `SPRING_DATASOURCE_URL` overrides `spring.datasource.url`.

**How to set the active profile:**

- `SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run` — environment variable
- `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` — Maven flag
- `@ActiveProfiles("test")` — test annotation (for integration tests)

**What goes in which file:**

`application.properties` (shared):
```
spring.application.name=worshiproom-backend
server.port=8080
spring.jpa.hibernate.ddl-auto=validate
spring.liquibase.enabled=true
```

`application-dev.properties`:
```
spring.datasource.url=jdbc:postgresql://localhost:5432/worshiproom_dev
spring.datasource.username=worshiproom
spring.datasource.password=worshiproom
spring.liquibase.contexts=dev
logging.level.com.worshiproom=DEBUG
```

`application-test.properties`:
```
# most values come from Testcontainers at runtime via @DynamicPropertySource
spring.liquibase.contexts=test
```

`application-prod.properties`:
```
spring.datasource.url=${DATABASE_URL}
spring.datasource.username=${DATABASE_USER}
spring.datasource.password=${DATABASE_PASSWORD}
spring.liquibase.contexts=prod
logging.level.root=INFO
```

Notice the `${...}` placeholders in `application-prod.properties` — those are resolved from environment variables at runtime. In production, the `DATABASE_URL` env var is set by the host (Fly.io, Railway, wherever we deploy) and Spring picks it up. The secret never appears in the file.

**Where secrets go.** NEVER in git. Three acceptable places:

1. Environment variables on the host (production)
2. A local `.env` file that is `.gitignore`'d (local development, if you want persistent overrides)
3. A secrets manager (fancier, not needed for the Forums Wave)

The `JWT_SECRET` is the most sensitive — a leak there lets an attacker mint valid tokens. It lives in the host's environment variables in production and in your local `.env` file in development (or just in your shell via `export`).

---

## 12. CORS, or: why your frontend can't talk to your backend on the first try

When a browser running on `http://localhost:5173` makes a `fetch('http://localhost:8080/api/health')` call, the browser asks the backend: "is it OK for port 5173 to make this request?" That's CORS — Cross-Origin Resource Sharing.

If the backend doesn't include an `Access-Control-Allow-Origin` header in its response, the browser blocks the response from reaching the JavaScript code. You see it as a fetch rejection, or the classic "blocked by CORS policy" error in the console.

Same origin (same protocol + host + port) doesn't need CORS. But `localhost:5173` and `localhost:8080` are different origins (different ports). So we need CORS.

**The existing `CorsConfig.java` already handles this for localhost:5173.** It looks like:

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:5173")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
```

**What you'll change when you add a production frontend origin.** Phase 1 extends this to read allowed origins from config:

```java
@Value("${app.cors.allowed-origins}")
private String allowedOrigins;
```

And in `application-prod.properties`:

```
app.cors.allowed-origins=https://worshiproom.app
```

(or whichever domain we deploy to). Never `*` in production — that allows any origin to call the API.

**One gotcha.** Browsers send an OPTIONS "preflight" request before the actual request, to check CORS. The preflight must succeed or the real request never fires. Spring handles preflights automatically via the filter chain, but if Spring Security is misconfigured you can accidentally block OPTIONS requests (they hit the JWT filter, have no token, get rejected). Phase 1's `SecurityConfig` explicitly permits OPTIONS requests to any path:

```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
    // ... other rules
)
```

If you ever see "CORS error" when you know the config is right, check for this — it's usually an auth filter eating the preflight.

---

## 13. What you're allowed to forget

The Spring / JPA / Hibernate / Maven ecosystem is enormous. Online tutorials routinely describe features we won't use on this project. Here's the list of concepts you're allowed to skip when reading blog posts, Stack Overflow answers, or Spring Boot documentation:

**XML-based bean configuration.** Old Spring used XML files (`applicationContext.xml`) to wire beans. We use annotations and Java config. If you see `<bean class="...">` in a tutorial, close the tab.

**Spring MVC view templates (Thymeleaf, JSP, FreeMarker).** These render server-side HTML. We're an API — we return JSON. Every mention of Thymeleaf, `Model`, or `ModelAndView` is for a different kind of app.

**JPA entity inheritance strategies** (`@Inheritance`, `@DiscriminatorColumn`, `SINGLE_TABLE`/`JOINED`/`TABLE_PER_CLASS`). We use a `post_type` column on a single `posts` table (Architectural Decision 5). That's discriminator-in-the-data, not discriminator-via-JPA-inheritance. Skip the inheritance machinery.

**Maven multi-module projects.** Our backend is one module. If you see `<modules>` in a `pom.xml` tutorial, that's a different shape of project.

**Spring AOP.** Aspect-Oriented Programming — powerful, occasionally useful, mostly overkill for our needs. The Forums Wave uses one aspect-like thing: Spring Security's filter chain, which is already configured. We don't write our own aspects.

**Spring Cloud, Spring Cloud Config, service discovery, circuit breakers, Zuul, Eureka.** This is microservices territory. We're a monolith on purpose. If a tutorial mentions Eureka or Ribbon, wrong vocabulary.

**EntityManager direct usage.** Spring Data JPA repositories cover our needs. If you see `@PersistenceContext EntityManager em;` followed by raw JPQL, that's a lower-level API we're not using.

**JPA callbacks** (`@PrePersist`, `@PostLoad`, `@PreUpdate`). We do these transformations explicitly in service methods. Callbacks hide logic and surprise people later. Skip them.

**Detached entity state, cascading, orphan removal.** These matter for fully-mapped bidirectional object graphs. We don't have those (section 6). Skip.

**Hibernate second-level cache, query cache.** Premature optimization for our workload. If we need caching, we'll add Redis explicitly at the service layer, not inside Hibernate.

**Spring Webflux, reactive streams, `Mono`/`Flux`.** Async/reactive programming. Our backend is synchronous (servlet-based, blocking I/O with a thread pool). If you see `Mono<Post>` in a return type, that's Webflux — wrong stack for us.

**JPA projections, DTO projections, interface projections, `@NamedQueries`.** Nice features, but we write explicit DTOs and explicit `@Query` methods. Simpler mental model.

**Maven's `install` vs `deploy` distinction.** We don't publish the backend as a library. We build a jar and run it. Skip.

**The Spring Expression Language (SpEL).** Used in some annotations for dynamic values. We use plain `@Value("${...}")` for config, which doesn't need SpEL. If you see `#{...}` syntax, skip — you don't need it for this project.

---

## Closing thought

This document exists because the single biggest failure mode for the Forums Wave is you feeling lost when CC generates Java files and losing trust in the process. If you've read this far, you now have:

- A concrete mental model of the backend skeleton and daily workflow
- Enough Spring Boot vocabulary to recognize what's happening in any generated file
- Explicit knowledge of the JPA pitfall we're avoiding (N+1 via lazy loading) and the convention we're using instead (plain UUID foreign keys + explicit JOIN FETCH)
- A map from your existing Liquibase knowledge to our setup
- The full JWT flow, from login to every subsequent request
- The OpenAPI workflow (generate, don't hand-write)
- Why Testcontainers and why it's worth the startup cost
- Where profiles live, where secrets live, and how the three layer together
- CORS enough to debug "why won't my frontend talk to my backend"
- A list of Spring concepts to ignore so online tutorials don't mislead you

If any section felt thin or confusing, ask in chat before Phase 1 starts. Better to clarify now than mid-spec when CC is generating twenty Java files and you're trying to review them.

Phase 0.5 (the reaction quick win) is the next thing to ship — it's frontend-only and independent of this backend work. You can do Phase 0.5 in parallel with digesting this doc. Then Phase 1 audits and extends the backend skeleton, which is where all of this becomes real.

Ready when you are.
