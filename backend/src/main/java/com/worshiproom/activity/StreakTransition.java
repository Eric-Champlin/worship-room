package com.worshiproom.activity;

/**
 * The four state transitions of the streak update state machine.
 *
 * <p>Spec 2.3 § Architectural Decision 5. Returned as part of
 * {@link com.worshiproom.activity.dto.StreakResult#transition()}.
 * Faithful port of the four branches in the frontend's
 * {@code updateStreak} (see {@code frontend/src/services/faith-points-storage.ts}).
 */
public enum StreakTransition {
  /** {@code lastActiveDate} was {@code null}; first-ever activity. */
  FIRST_EVER,

  /** {@code lastActiveDate} equals today; no change. */
  SAME_DAY,

  /** {@code lastActiveDate} equals today minus 1 day; streak grows by 1. */
  INCREMENT,

  /** {@code lastActiveDate} is older than yesterday; streak resets to 1. */
  RESET
}
