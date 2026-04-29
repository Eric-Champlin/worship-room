package com.worshiproom.storage;

import java.time.Instant;

/**
 * Lightweight metadata returned by {@link ObjectStorageAdapter#list} — does NOT include the
 * payload bytes. Use {@link ObjectStorageAdapter#get} to retrieve content.
 */
public record StoredObjectSummary(String key, long sizeBytes, Instant lastModified) {}
