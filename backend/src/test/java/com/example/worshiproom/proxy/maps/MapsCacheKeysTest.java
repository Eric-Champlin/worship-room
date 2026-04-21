package com.example.worshiproom.proxy.maps;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("MapsCacheKeys")
class MapsCacheKeysTest {

    @Test
    @DisplayName("searchKey normalizes keyword case")
    void searchKey_normalizesKeywordCase() {
        String a = MapsCacheKeys.searchKey(35.75, -86.93, 10, "CHURCH", null);
        String b = MapsCacheKeys.searchKey(35.75, -86.93, 10, "church", null);
        assertThat(a).isEqualTo(b);
    }

    @Test
    @DisplayName("searchKey normalizes keyword whitespace")
    void searchKey_normalizesKeywordWhitespace() {
        String a = MapsCacheKeys.searchKey(35.75, -86.93, 10, "  church  ", null);
        String b = MapsCacheKeys.searchKey(35.75, -86.93, 10, "church", null);
        assertThat(a).isEqualTo(b);
    }

    @Test
    @DisplayName("searchKey includes pageToken when present")
    void searchKey_includesPageTokenWhenPresent() {
        String tok1 = MapsCacheKeys.searchKey(35.75, -86.93, 10, "church", "abc");
        String tok2 = MapsCacheKeys.searchKey(35.75, -86.93, 10, "church", "xyz");
        assertThat(tok1).isNotEqualTo(tok2);
    }

    @Test
    @DisplayName("searchKey treats null and empty pageToken identically (first page)")
    void searchKey_omitsPageTokenWhenNullOrEmpty() {
        String nullTok = MapsCacheKeys.searchKey(35.75, -86.93, 10, "church", null);
        String emptyTok = MapsCacheKeys.searchKey(35.75, -86.93, 10, "church", "");
        assertThat(nullTok).isEqualTo(emptyTok);
    }

    @Test
    @DisplayName("geocodeKey normalizes query case and whitespace")
    void geocodeKey_normalizesQueryCaseAndWhitespace() {
        String a = MapsCacheKeys.geocodeKey("Spring Hill, TN");
        String b = MapsCacheKeys.geocodeKey("  spring hill, tn  ");
        assertThat(a).isEqualTo(b);
    }

    @Test
    @DisplayName("photoKey returns name unchanged")
    void photoKey_returnsNameUnchanged() {
        String name = "places/ChIJabc123/photos/AbC456";
        assertThat(MapsCacheKeys.photoKey(name)).isEqualTo(name);
    }
}
