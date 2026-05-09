package com.worshiproom.post;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "posts")
public class Post {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Convert(converter = PostTypeConverter.class)
    @Column(name = "post_type", nullable = false, length = 20)
    private PostType postType;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "category", length = 20)
    private String category;

    @Column(name = "is_anonymous", nullable = false)
    private boolean isAnonymous;

    @Column(name = "challenge_id", length = 50)
    private String challengeId;

    @Column(name = "qotd_id", length = 50)
    private String qotdId;

    @Column(name = "scripture_reference", length = 100)
    private String scriptureReference;

    @Column(name = "scripture_text", columnDefinition = "TEXT")
    private String scriptureText;

    @Convert(converter = PostVisibilityConverter.class)
    @Column(name = "visibility", nullable = false, length = 20)
    private PostVisibility visibility;

    @Column(name = "is_answered", nullable = false)
    private boolean isAnswered;

    @Column(name = "answered_text", columnDefinition = "TEXT")
    private String answeredText;

    @Column(name = "answered_at")
    private OffsetDateTime answeredAt;

    @Convert(converter = ModerationStatusConverter.class)
    @Column(name = "moderation_status", nullable = false, length = 20)
    private ModerationStatus moderationStatus;

    @Column(name = "crisis_flag", nullable = false)
    private boolean crisisFlag;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @Column(name = "praying_count", nullable = false)
    private int prayingCount;

    @Column(name = "candle_count", nullable = false)
    private int candleCount;

    @Column(name = "comment_count", nullable = false)
    private int commentCount;

    @Column(name = "bookmark_count", nullable = false)
    private int bookmarkCount;

    @Column(name = "report_count", nullable = false)
    private int reportCount;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "last_activity_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime lastActivityAt;

    @Column(name = "question_resolved_comment_id")
    private UUID questionResolvedCommentId;

    // Spec 4.6b — image attachment for testimony / question posts.
    // image_url stores the LOGICAL storage key base ("posts/{postId}"); presigned-GET
    // URLs are built at PostMapper serialization time (never persisted). Both columns
    // remain null when the post has no image.
    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "image_alt_text", length = 500)
    private String imageAltText;

    protected Post() {}

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public PostType getPostType() { return postType; }
    public String getContent() { return content; }
    public String getCategory() { return category; }
    public boolean isAnonymous() { return isAnonymous; }
    public String getChallengeId() { return challengeId; }
    public String getQotdId() { return qotdId; }
    public String getScriptureReference() { return scriptureReference; }
    public String getScriptureText() { return scriptureText; }
    public PostVisibility getVisibility() { return visibility; }
    public boolean isAnswered() { return isAnswered; }
    public String getAnsweredText() { return answeredText; }
    public OffsetDateTime getAnsweredAt() { return answeredAt; }
    public ModerationStatus getModerationStatus() { return moderationStatus; }
    public boolean isCrisisFlag() { return crisisFlag; }
    public boolean isDeleted() { return isDeleted; }
    public OffsetDateTime getDeletedAt() { return deletedAt; }
    public int getPrayingCount() { return prayingCount; }
    public int getCandleCount() { return candleCount; }
    public int getCommentCount() { return commentCount; }
    public int getBookmarkCount() { return bookmarkCount; }
    public int getReportCount() { return reportCount; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public OffsetDateTime getLastActivityAt() { return lastActivityAt; }
    public UUID getQuestionResolvedCommentId() { return questionResolvedCommentId; }
    public String getImageUrl() { return imageUrl; }
    public String getImageAltText() { return imageAltText; }

    public void setAnsweredAt(OffsetDateTime answeredAt) { this.answeredAt = answeredAt; }
    public void setAnsweredText(String answeredText) { this.answeredText = answeredText; }
    public void setAnswered(boolean answered) { this.isAnswered = answered; }
    public void setAnonymous(boolean anonymous) { this.isAnonymous = anonymous; }
    public void setBookmarkCount(int bookmarkCount) { this.bookmarkCount = bookmarkCount; }
    public void setCandleCount(int candleCount) { this.candleCount = candleCount; }
    public void setCategory(String category) { this.category = category; }
    public void setChallengeId(String challengeId) { this.challengeId = challengeId; }
    public void setCommentCount(int commentCount) { this.commentCount = commentCount; }
    public void setContent(String content) { this.content = content; }
    public void setCrisisFlag(boolean crisisFlag) { this.crisisFlag = crisisFlag; }
    public void setDeleted(boolean deleted) { this.isDeleted = deleted; }
    public void setDeletedAt(OffsetDateTime deletedAt) { this.deletedAt = deletedAt; }
    public void setId(UUID id) { this.id = id; }
    public void setModerationStatus(ModerationStatus status) { this.moderationStatus = status; }
    public void setPostType(PostType postType) { this.postType = postType; }
    public void setPrayingCount(int prayingCount) { this.prayingCount = prayingCount; }
    public void setQotdId(String qotdId) { this.qotdId = qotdId; }
    public void setReportCount(int reportCount) { this.reportCount = reportCount; }
    public void setScriptureReference(String scriptureReference) { this.scriptureReference = scriptureReference; }
    public void setScriptureText(String scriptureText) { this.scriptureText = scriptureText; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public void setVisibility(PostVisibility visibility) { this.visibility = visibility; }
    public void setQuestionResolvedCommentId(UUID questionResolvedCommentId) {
        this.questionResolvedCommentId = questionResolvedCommentId;
    }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public void setImageAltText(String imageAltText) { this.imageAltText = imageAltText; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Post other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
