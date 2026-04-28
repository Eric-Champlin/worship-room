package com.worshiproom.safety;

/** Discriminator for {@link CrisisDetectedEvent} — which content surface tripped the detector. */
public enum ContentType {
    POST,
    COMMENT
}
