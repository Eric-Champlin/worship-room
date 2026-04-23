package com.worshiproom.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;

/**
 * Non-reversible SHA-256 helper for logging email identifiers.
 *
 * Per 07-logging-monitoring.md raw emails MUST NEVER appear in application logs.
 * This helper produces a greppable {@code email_} prefix + 16 hex chars that lets
 * operators correlate events across log lines for the same address without being
 * able to reverse the hash.
 *
 * Normalization (lowercase + trim) is applied defensively so callers that pass
 * a not-yet-normalized address still land on the same identifier as callers
 * that pre-normalize. "Foo@Bar.com" and "foo@bar.com " both hash to the same
 * value.
 */
public final class EmailHasher {

    private EmailHasher() {}

    public static String hash(String email) {
        if (email == null) return "email_null";
        String normalized = email.toLowerCase(Locale.ROOT).trim();
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(normalized.getBytes(StandardCharsets.UTF_8));
            return "email_" + HexFormat.of().formatHex(digest).substring(0, 16);
        } catch (NoSuchAlgorithmException e) {
            return "email_unhashed";
        }
    }
}
