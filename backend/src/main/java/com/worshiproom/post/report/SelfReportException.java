package com.worshiproom.post.report;

import org.springframework.http.HttpStatus;

/**
 * 400 returned when a user attempts to report their own post or comment.
 * Defense in depth: the UI hides the Report button on own content, but the
 * service refuses defensively in case the UI gate is bypassed (Spec 3.8 D11
 * + Watch-For #1).
 */
public class SelfReportException extends ReportException {

    public SelfReportException() {
        super(HttpStatus.BAD_REQUEST, "SELF_REPORT", "You can't report your own content.");
    }
}
