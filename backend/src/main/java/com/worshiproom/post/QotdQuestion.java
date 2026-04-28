package com.worshiproom.post;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.Objects;

/**
 * JPA entity for the {@code qotd_questions} table (created in Spec 3.1 changeset
 * {@code 2026-04-27-019-create-qotd-questions-table.xml}).
 *
 * <p>Read-only minimal scope for Spec 3.5: the only Spec-3.5 use case is
 * {@code QotdQuestionRepository.existsById(qotdId)} during {@code PostService.createPost}
 * referential integrity validation (per Divergence 8). Future Spec 3.9 admin endpoints
 * will extend this entity with setters and lifecycle methods.
 *
 * <p>The id column is VARCHAR(50) (NOT a UUID) so existing frontend ids
 * ("qotd-1" through "qotd-72") survive the migration.
 */
@Entity
@Table(name = "qotd_questions")
public class QotdQuestion {

    @Id
    @Column(name = "id", nullable = false, updatable = false, length = 50)
    private String id;

    @Column(name = "text", nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(name = "theme", nullable = false, length = 30)
    private String theme;

    @Column(name = "hint", columnDefinition = "TEXT")
    private String hint;

    @Column(name = "display_order", nullable = false, unique = true)
    private int displayOrder;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected QotdQuestion() {}

    public String getId() { return id; }
    public String getText() { return text; }
    public String getTheme() { return theme; }
    public String getHint() { return hint; }
    public int getDisplayOrder() { return displayOrder; }
    public boolean isActive() { return isActive; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof QotdQuestion other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() { return Objects.hashCode(id); }
}
