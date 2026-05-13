package com.worshiproom.activity;

import com.worshiproom.activity.constants.PointValues;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Spec 6.2 drift detection — asserts that the backend {@code PointValues.POINTS}
 * entry for {@link ActivityType#QUICK_LIFT} agrees with the frontend
 * {@code ACTIVITY_POINTS.quickLift} value in
 * {@code frontend/src/constants/dashboard/activity-points.ts}.
 *
 * <p>The activity-engine drift covered by {@link DriftDetectionTest} verifies
 * count-based behavior parity across the badge pipeline, but it does not
 * directly compare per-activity point values across the two files. A one-sided
 * point-value change (e.g., bumping Quick Lift to 25 only on the backend) would
 * slip through. This test closes that gap.
 *
 * <p>Pattern mirrors {@code QotdDriftDetectionTest} (Spec 3.9) which reads the
 * shared fixture file from the backend module's working directory. Here we read
 * the frontend constants file directly because the point value is a single
 * integer — a shared JSON fixture would be more ceremony than the contract
 * needs.
 */
class QuickLiftPointsDriftTest {

    private static final Path ACTIVITY_POINTS_TS =
            Path.of("..", "frontend", "src", "constants", "dashboard", "activity-points.ts");

    private static final Pattern QUICK_LIFT_LINE =
            Pattern.compile("quickLift:\\s*(\\d+)");

    @Test
    void quickLiftPointsMatchFrontend() throws IOException {
        assertThat(ACTIVITY_POINTS_TS)
                .as("Drift test cannot find frontend activity-points.ts — was the file moved?")
                .exists();

        String contents = Files.readString(ACTIVITY_POINTS_TS);
        Matcher matcher = QUICK_LIFT_LINE.matcher(contents);

        assertThat(matcher.find())
                .as("No `quickLift: <number>` entry found in %s — frontend may have dropped the key",
                        ACTIVITY_POINTS_TS)
                .isTrue();

        int frontendValue = Integer.parseInt(matcher.group(1));
        Integer backendValue = PointValues.POINTS.get(ActivityType.QUICK_LIFT);

        assertThat(backendValue)
                .as("Quick Lift point-value drift: backend PointValues.POINTS.get(QUICK_LIFT) "
                        + "and frontend ACTIVITY_POINTS.quickLift disagree. Update both or neither.")
                .isEqualTo(frontendValue);
    }
}
