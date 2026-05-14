package com.worshiproom.verse;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "verse_surfacing_log")
public class VerseSurfacingLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "verse_id", nullable = false, length = 64)
    private String verseId;

    // surfaced_at is populated by the DB DEFAULT NOW(); insertable=false ensures
    // Hibernate does not write a value during INSERT. After save() the L1-cache
    // entity has null here until refreshed; service code does NOT return this
    // value to clients (cooldown_until is computed independently from
    // OffsetDateTime.now().plus(24h)). The Step 15 integration test asserts
    // non-null after fetch-back as a regression guard.
    @Column(name = "surfaced_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime surfacedAt;

    @Column(name = "trigger_type", nullable = false, length = 20)
    private String triggerType;

    protected VerseSurfacingLog() {}

    public VerseSurfacingLog(UUID userId, String verseId, String triggerType) {
        this.userId = userId;
        this.verseId = verseId;
        this.triggerType = triggerType;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getVerseId() { return verseId; }
    public OffsetDateTime getSurfacedAt() { return surfacedAt; }
    public String getTriggerType() { return triggerType; }
}
