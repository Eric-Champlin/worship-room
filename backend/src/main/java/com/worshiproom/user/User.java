package com.worshiproom.user;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Convert(converter = DisplayNamePreferenceConverter.class)
    @Column(name = "display_name_preference", nullable = false, length = 20)
    private DisplayNamePreference displayNamePreference = DisplayNamePreference.FIRST_ONLY;

    @Column(name = "custom_display_name", length = 100)
    private String customDisplayName;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Column(name = "favorite_verse_reference", length = 50)
    private String favoriteVerseReference;

    @Column(name = "favorite_verse_text", columnDefinition = "TEXT")
    private String favoriteVerseText;

    @Column(name = "is_admin", nullable = false)
    private boolean isAdmin = false;

    @Column(name = "is_banned", nullable = false)
    private boolean isBanned = false;

    @Column(name = "is_email_verified", nullable = false)
    private boolean isEmailVerified = false;

    @Column(name = "joined_at", nullable = false)
    private OffsetDateTime joinedAt;

    @Column(name = "last_active_at")
    private OffsetDateTime lastActiveAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @Column(name = "timezone", nullable = false, length = 50)
    private String timezone = "UTC";

    protected User() {}

    public User(String email, String passwordHash, String firstName, String lastName, String timezone) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.firstName = firstName;
        this.lastName = lastName;
        this.timezone = timezone != null ? timezone : "UTC";
    }

    @PrePersist
    void prePersist() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (this.createdAt == null) this.createdAt = now;
        if (this.updatedAt == null) this.updatedAt = now;
        if (this.joinedAt == null) this.joinedAt = now;
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public DisplayNamePreference getDisplayNamePreference() { return displayNamePreference; }
    public String getCustomDisplayName() { return customDisplayName; }
    public String getAvatarUrl() { return avatarUrl; }
    public String getBio() { return bio; }
    public String getFavoriteVerseReference() { return favoriteVerseReference; }
    public String getFavoriteVerseText() { return favoriteVerseText; }
    public boolean isAdmin() { return isAdmin; }
    public boolean isBanned() { return isBanned; }
    public boolean isEmailVerified() { return isEmailVerified; }
    public OffsetDateTime getJoinedAt() { return joinedAt; }
    public OffsetDateTime getLastActiveAt() { return lastActiveAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public boolean isDeleted() { return isDeleted; }
    public OffsetDateTime getDeletedAt() { return deletedAt; }
    public String getTimezone() { return timezone; }

    public void setEmail(String email) { this.email = email; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public void setDisplayNamePreference(DisplayNamePreference p) { this.displayNamePreference = p; }
    public void setCustomDisplayName(String customDisplayName) { this.customDisplayName = customDisplayName; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public void setBio(String bio) { this.bio = bio; }
    public void setFavoriteVerseReference(String v) { this.favoriteVerseReference = v; }
    public void setFavoriteVerseText(String v) { this.favoriteVerseText = v; }
    public void setAdmin(boolean admin) { this.isAdmin = admin; }
    public void setBanned(boolean banned) { this.isBanned = banned; }
    public void setEmailVerified(boolean v) { this.isEmailVerified = v; }
    public void setLastActiveAt(OffsetDateTime t) { this.lastActiveAt = t; }
    public void setUpdatedAt(OffsetDateTime t) { this.updatedAt = t; }
    public void setDeleted(boolean deleted) { this.isDeleted = deleted; }
    public void setDeletedAt(OffsetDateTime t) { this.deletedAt = t; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    @Override
    public String toString() {
        return "User{id=" + id + ", email=<redacted>}";
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() { return id != null ? id.hashCode() : 0; }
}
