# Audio Assets

This directory contains audio files for Worship Room's music feature.

## Directory Structure

- `ambient/` — Ambient sound loops (MP3 192kbps, loopable)
- `scripture/` — TTS scripture readings (MP3 192kbps)
- `stories/` — TTS bedtime stories (MP3 192kbps)

## Required Files for Development

Place any royalty-free MP3 files in these directories for testing. Examples:

### ambient/
- `rain.mp3` — Rain/water sounds
- `forest.mp3` — Forest/nature ambience
- `ocean.mp3` — Ocean waves

### scripture/
- `psalm-23.mp3` — Psalm 23 TTS reading

### stories/
- `garden-of-gethsemane.mp3` — Bedtime story TTS

## Sourcing

- Ambient sounds: Use royalty-free sources (freesound.org, pixabay.com/sound-effects)
- Scripture/stories: Generated via TTS (browser Speech Synthesis for MVP, OpenAI TTS for production)

## Important

MP3 files are gitignored (too large for version control). Only this README is tracked.
