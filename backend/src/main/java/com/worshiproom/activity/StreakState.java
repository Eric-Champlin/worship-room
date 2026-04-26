package com.worshiproom.activity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Per-user streak state — current streak, longest streak, last active date,
 * and grace/grief-pause columns.
 *
 * <p>Maps to the {@code streak_state} table created by Spec 2.1's Liquibase
 * changeset {@code 2026-04-25-005-create-streak-state-table.xml}. The named
 * CHECK constraints {@code streak_state_current_streak_nonneg_check},
 * {@code streak_state_longest_streak_nonneg_check}, and
 * {@code streak_state_grace_days_used_nonneg_check} enforce non-negativity at
 * the DB level; {@link Min} mirrors them at the application layer.
 *
 * <p>The {@code user_id} primary key is also a foreign key to {@code users.id}
 * with {@code ON DELETE CASCADE}. Value comes from the caller (Spec 2.6
 * controller), not from {@code UUID.randomUUID()} — there is no
 * {@code @PrePersist} hook on this entity.
 *
 * <p>Style mirrors {@link FaithPoints}: manual getters/setters, no Lombok,
 * equals/hashCode by primary key.
 *
 * <p>Scaffolding only for Spec 2.3 — {@link StreakService} does not consume
 * this entity. Spec 2.6 will inject {@link StreakRepository} and use this
 * entity for persistence. The grace and grief-pause columns are mapped
 * faithfully but unused by Spec 2.3 per Divergences 1 and 2.
 */
@Entity
@Table(name = "streak_state")
public class StreakState {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Min(0)
    @Column(name = "current_streak", nullable = false)
    private int currentStreak = 0;

    @Min(0)
    @Column(name = "longest_streak", nullable = false)
    private int longestStreak = 0;

    @Column(name = "last_active_date")
    private LocalDate lastActiveDate;

    @Min(0)
    @Column(name = "grace_days_used", nullable = false)
    private int graceDaysUsed = 0;

    @Column(name = "grace_week_start")
    private LocalDate graceWeekStart;

    @Column(name = "grief_pause_until")
    private LocalDate griefPauseUntil;

    @Column(name = "grief_pause_used_at")
    private OffsetDateTime griefPauseUsedAt;

    protected StreakState() {}

    public StreakState(UUID userId) {
        this.userId = userId;
    }

    public UUID getUserId() { return userId; }
    public int getCurrentStreak() { return currentStreak; }
    public int getLongestStreak() { return longestStreak; }
    public LocalDate getLastActiveDate() { return lastActiveDate; }
    public int getGraceDaysUsed() { return graceDaysUsed; }
    public LocalDate getGraceWeekStart() { return graceWeekStart; }
    public LocalDate getGriefPauseUntil() { return griefPauseUntil; }
    public OffsetDateTime getGriefPauseUsedAt() { return griefPauseUsedAt; }

    public void setCurrentStreak(int currentStreak) { this.currentStreak = currentStreak; }
    public void setLongestStreak(int longestStreak) { this.longestStreak = longestStreak; }
    public void setLastActiveDate(LocalDate lastActiveDate) { this.lastActiveDate = lastActiveDate; }
    public void setGraceDaysUsed(int graceDaysUsed) { this.graceDaysUsed = graceDaysUsed; }
    public void setGraceWeekStart(LocalDate graceWeekStart) { this.graceWeekStart = graceWeekStart; }
    public void setGriefPauseUntil(LocalDate griefPauseUntil) { this.griefPauseUntil = griefPauseUntil; }
    public void setGriefPauseUsedAt(OffsetDateTime griefPauseUsedAt) { this.griefPauseUsedAt = griefPauseUsedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof StreakState other)) return false;
        return userId != null && userId.equals(other.userId);
    }

    @Override
    public int hashCode() { return userId != null ? userId.hashCode() : 0; }

    @Override
    public String toString() {
        return "StreakState{userId=" + userId
             + ", currentStreak=" + currentStreak
             + ", longestStreak=" + longestStreak
             + ", lastActiveDate=" + lastActiveDate + "}";
    }
}
