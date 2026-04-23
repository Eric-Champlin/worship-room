package com.worshiproom.proxy.bible;

import com.worshiproom.proxy.common.ProxyException;
import org.springframework.http.HttpStatus;

/**
 * Thrown when DBP returns HTTP 404 for a fileset, chapter, or timestamps
 * lookup. Mapped to HTTP 404 with code NOT_FOUND by ProxyExceptionHandler —
 * deliberately distinct from UpstreamException (502) so the frontend can
 * distinguish "this chapter has no audio" from "DBP is unreachable."
 *
 * See _specs/ai-proxy-fcbh.md § Architecture Decision #5 for rationale.
 */
public class FcbhNotFoundException extends ProxyException {
    public FcbhNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, "NOT_FOUND", message);
    }
}
