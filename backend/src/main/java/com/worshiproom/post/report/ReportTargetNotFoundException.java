package com.worshiproom.post.report;

import org.springframework.http.HttpStatus;

/**
 * 404 returned when the post or comment targeted by a report does not
 * exist. Phrased as "no longer available" rather than "not found" — anti-
 * pressure copy: blameless framing for the user, since the target may have
 * been moderated away between the user opening the dialog and submitting.
 */
public class ReportTargetNotFoundException extends ReportException {

    public ReportTargetNotFoundException() {
        super(HttpStatus.NOT_FOUND, "NOT_FOUND", "This content is no longer available.");
    }
}
