package com.worshiproom.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StorageKeyValidatorTest {

    @Test
    void acceptsValidKeys() {
        assertThatCode(() -> StorageKeyValidator.validate("post-images/abc/123/thumb.jpg"))
                .doesNotThrowAnyException();
        assertThatCode(() -> StorageKeyValidator.validate("backups/pg_dump/2026-04-29.sql.gz"))
                .doesNotThrowAnyException();
        assertThatCode(() -> StorageKeyValidator.validate("foo.txt"))
                .doesNotThrowAnyException();
        assertThatCode(() -> StorageKeyValidator.validate("a"))
                .doesNotThrowAnyException();
    }

    @ParameterizedTest
    @NullAndEmptySource
    void rejectsNullOrEmpty(String key) {
        assertThatThrownBy(() -> StorageKeyValidator.validate(key))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("null or empty");
    }

    @ParameterizedTest
    @ValueSource(strings = {"..", "foo/../bar", "../etc/passwd", "foo..bar"})
    void rejectsPathTraversal(String key) {
        assertThatThrownBy(() -> StorageKeyValidator.validate(key))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/foo", "foo/", "/foo/"})
    void rejectsLeadingOrTrailingSlash(String key) {
        assertThatThrownBy(() -> StorageKeyValidator.validate(key))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("'/'");
    }

    @Test
    void rejectsDoubleSlash() {
        assertThatThrownBy(() -> StorageKeyValidator.validate("foo//bar"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("'//'");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Foo.txt",      // uppercase
            "foo bar",      // space
            "foo?bar",      // query
            "foo\\bar",     // backslash
            "foo:bar",      // colon
            "foo@bar",      // at
            "foo#bar"       // hash
    })
    void rejectsIllegalCharacters(String key) {
        assertThatThrownBy(() -> StorageKeyValidator.validate(key))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("illegal characters");
    }

    @Test
    void prefix_acceptsTrailingSlash() {
        // Trailing slash on a prefix is the conventional "directory" marker for object stores.
        // The validate() (key) rule rejects it; validatePrefix() (prefix) permits it.
        assertThatCode(() -> StorageKeyValidator.validatePrefix("post-images/"))
                .doesNotThrowAnyException();
        assertThatCode(() -> StorageKeyValidator.validatePrefix("post-images/abc/"))
                .doesNotThrowAnyException();
        assertThatCode(() -> StorageKeyValidator.validatePrefix("post-images"))
                .doesNotThrowAnyException();
    }

    @Test
    void prefix_stillRejectsLeadingSlashAndTraversal() {
        assertThatThrownBy(() -> StorageKeyValidator.validatePrefix("/foo/"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> StorageKeyValidator.validatePrefix("../foo/"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> StorageKeyValidator.validatePrefix(""))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsExcessiveLength() {
        // 257 chars — one over the limit.
        String tooLong = "a".repeat(257);
        assertThatThrownBy(() -> StorageKeyValidator.validate(tooLong))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("256");

        // Boundary: exactly 256 chars passes.
        String boundary = "a".repeat(256);
        assertThatCode(() -> StorageKeyValidator.validate(boundary))
                .doesNotThrowAnyException();
    }
}
