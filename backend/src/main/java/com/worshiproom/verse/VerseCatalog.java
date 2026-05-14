package com.worshiproom.verse;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Loads + caches the curated verse set from
 * {@code backend/src/main/resources/verses/verse-finds-you.json}.
 *
 * <p>On parse failure, returns an EMPTY catalog so the surfacing pipeline returns
 * {@code verse: null, reason: 'no_match'} (Gate-G-SILENT-FAILURE / D-SilentFailure)
 * rather than crashing.
 */
@Component
public class VerseCatalog {

    private static final Logger log = LoggerFactory.getLogger(VerseCatalog.class);
    private static final String RESOURCE_PATH = "verses/verse-finds-you.json";

    private List<CuratedVerse> entries = List.of();
    private Map<String, List<String>> categoryTagMapping = Map.of();
    private Set<String> knownTags = Set.of();

    @PostConstruct
    void load() {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.configure(JsonParser.Feature.ALLOW_COMMENTS, true);
            mapper.configure(JsonParser.Feature.ALLOW_TRAILING_COMMA, true);
            mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
            CatalogFile parsed = mapper.readValue(
                new ClassPathResource(RESOURCE_PATH).getInputStream(),
                CatalogFile.class
            );
            this.entries = parsed.entries() == null ? List.of() : List.copyOf(parsed.entries());
            this.categoryTagMapping = parsed.categoryTagMapping() == null
                ? Map.of()
                : Map.copyOf(parsed.categoryTagMapping());
            this.knownTags = parsed.knownTags() == null
                ? Set.of()
                : Set.copyOf(parsed.knownTags());
            log.info("verseCatalogLoaded entries={} categories={} knownTags={}",
                entries.size(), categoryTagMapping.size(), knownTags.size());
        } catch (Exception e) {
            // Catch BOTH IOException (file missing, IO error) AND RuntimeException subclasses
            // like JsonParseException (malformed JSON, extra comma, unbalanced quotes). Per
            // Gate-G-SILENT-FAILURE and T17 (JSON parse failure → no_match, no 500), the
            // catalog wrapper MUST never let a parse failure escape @PostConstruct — that
            // would crash Spring context startup. An empty catalog is the safe degraded state.
            log.error("verseCatalogParseFailure path={} message={}", RESOURCE_PATH, e.getMessage());
            // Silent failure: empty catalog → pipeline returns no_match
        }
    }

    public List<CuratedVerse> entries() { return entries; }
    public Map<String, List<String>> categoryTagMapping() { return categoryTagMapping; }
    public Set<String> knownTags() { return knownTags; }

    private record CatalogFile(
        @JsonProperty("category_tag_mapping") Map<String, List<String>> categoryTagMapping,
        @JsonProperty("known_tags") List<String> knownTags,
        List<CuratedVerse> entries
    ) {}
}
