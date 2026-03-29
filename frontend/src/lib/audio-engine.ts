import { AUDIO_CONFIG } from '@/constants/audio'

interface SoundEntry {
  sourceNode: AudioBufferSourceNode
  gainNode: GainNode
  loopTimerId: ReturnType<typeof setTimeout> | null
  cleanupTimerId: ReturnType<typeof setTimeout> | null
  volume: number
}

export class AudioEngineService {
  private audioContext: AudioContext | null = null
  private masterGainNode: GainNode | null = null
  private soundSources = new Map<string, SoundEntry>()
  private bufferCache = new Map<string, AudioBuffer>()
  private foregroundElement: HTMLAudioElement | null = null
  private foregroundSourceNode: MediaElementAudioSourceNode | null = null
  private foregroundGainNode: GainNode | null = null

  ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
      this.masterGainNode = this.audioContext.createGain()
      this.masterGainNode.gain.value = AUDIO_CONFIG.DEFAULT_MASTER_VOLUME
      this.masterGainNode.connect(this.audioContext.destination)
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }

    return this.audioContext
  }

  /**
   * Fetch, decode, cache, and start playing a sound with crossfade looping.
   * Resolves on success; rejects if fetch/decode fails.
   */
  async addSound(soundId: string, url: string, volume: number): Promise<void> {
    // Guard: don't re-add existing sound
    if (this.soundSources.has(soundId)) {
      this.setSoundVolume(soundId, volume)
      return
    }

    const ctx = this.ensureContext()

    // Fetch and decode (or use cache)
    let buffer = this.bufferCache.get(soundId)
    if (!buffer) {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      buffer = await ctx.decodeAudioData(arrayBuffer)
      this.bufferCache.set(soundId, buffer)
    }

    // Create source and gain nodes
    const sourceNode = ctx.createBufferSource()
    sourceNode.buffer = buffer
    const gainNode = ctx.createGain()

    // Fade in from 0 to target volume
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(
      volume,
      ctx.currentTime + AUDIO_CONFIG.SOUND_FADE_IN_MS / 1000,
    )

    sourceNode.connect(gainNode)
    gainNode.connect(this.masterGainNode!)
    sourceNode.start(0)

    const entry: SoundEntry = {
      sourceNode,
      gainNode,
      loopTimerId: null,
      cleanupTimerId: null,
      volume,
    }
    this.soundSources.set(soundId, entry)

    // Schedule crossfade loop
    this.scheduleCrossfade(soundId, buffer)
  }

  /**
   * Schedule the next crossfade loop iteration.
   * Creates a new source that fades in while the current source fades out,
   * producing a seamless loop with no audible gap.
   */
  private scheduleCrossfade(soundId: string, buffer: AudioBuffer): void {
    const entry = this.soundSources.get(soundId)
    if (!entry) return

    const overlapSec = AUDIO_CONFIG.CROSSFADE_OVERLAP_MS / 1000
    const delayMs = (buffer.duration - overlapSec) * 1000

    // Don't schedule if buffer is shorter than the overlap
    if (delayMs <= 0) {
      entry.sourceNode.loop = true
      return
    }

    entry.loopTimerId = setTimeout(() => {
      const currentEntry = this.soundSources.get(soundId)
      if (!currentEntry || !this.audioContext) return

      const ctx = this.audioContext
      const now = ctx.currentTime

      // Create new source from cached buffer
      const newSource = ctx.createBufferSource()
      newSource.buffer = buffer
      const newGain = ctx.createGain()

      // New source fades in over the overlap window
      newGain.gain.setValueAtTime(0, now)
      newGain.gain.linearRampToValueAtTime(currentEntry.volume, now + overlapSec)

      newSource.connect(newGain)
      newGain.connect(this.masterGainNode!)
      newSource.start(0)

      // Old source fades out over the overlap window
      currentEntry.gainNode.gain.cancelScheduledValues(now)
      currentEntry.gainNode.gain.setValueAtTime(currentEntry.gainNode.gain.value, now)
      currentEntry.gainNode.gain.linearRampToValueAtTime(0, now + overlapSec)

      // After overlap, stop and disconnect old source
      const cleanupTimerId = setTimeout(() => {
        try {
          currentEntry.sourceNode.stop()
        } catch (_e) {
          // Already stopped
        }
        currentEntry.sourceNode.disconnect()
        currentEntry.gainNode.disconnect()
      }, AUDIO_CONFIG.CROSSFADE_OVERLAP_MS)

      // Update entry to new source/gain
      const updatedEntry: SoundEntry = {
        sourceNode: newSource,
        gainNode: newGain,
        loopTimerId: null,
        cleanupTimerId,
        volume: currentEntry.volume,
      }
      this.soundSources.set(soundId, updatedEntry)

      // Schedule the next crossfade
      this.scheduleCrossfade(soundId, buffer)
    }, delayMs)
  }

  removeSound(soundId: string): void {
    const entry = this.soundSources.get(soundId)
    if (!entry) return

    // Cancel any pending crossfade and cleanup timers
    if (entry.loopTimerId !== null) {
      clearTimeout(entry.loopTimerId)
    }
    if (entry.cleanupTimerId !== null) {
      clearTimeout(entry.cleanupTimerId)
    }

    const ctx = this.audioContext
    if (ctx) {
      entry.gainNode.gain.cancelScheduledValues(ctx.currentTime)
      entry.gainNode.gain.setValueAtTime(entry.gainNode.gain.value, ctx.currentTime)
      entry.gainNode.gain.linearRampToValueAtTime(
        0,
        ctx.currentTime + AUDIO_CONFIG.SOUND_FADE_OUT_MS / 1000,
      )
    }

    // Clean up after fade completes
    setTimeout(() => {
      try {
        entry.sourceNode.stop()
      } catch (_e) {
        // Already stopped
      }
      entry.sourceNode.disconnect()
      entry.gainNode.disconnect()
      this.soundSources.delete(soundId)
    }, AUDIO_CONFIG.SOUND_FADE_OUT_MS)
  }

  setSoundVolume(soundId: string, volume: number): void {
    const entry = this.soundSources.get(soundId)
    if (!entry || !this.audioContext) return

    entry.volume = volume

    entry.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime)
    entry.gainNode.gain.setValueAtTime(entry.gainNode.gain.value, this.audioContext.currentTime)
    entry.gainNode.gain.linearRampToValueAtTime(
      volume,
      this.audioContext.currentTime + AUDIO_CONFIG.VOLUME_RAMP_MS / 1000,
    )
  }

  setMasterVolume(volume: number): void {
    if (!this.masterGainNode || !this.audioContext) return

    this.masterGainNode.gain.cancelScheduledValues(this.audioContext.currentTime)
    this.masterGainNode.gain.setValueAtTime(this.masterGainNode.gain.value, this.audioContext.currentTime)
    this.masterGainNode.gain.linearRampToValueAtTime(
      volume,
      this.audioContext.currentTime + AUDIO_CONFIG.VOLUME_RAMP_MS / 1000,
    )
  }

  playForeground(url: string): HTMLAudioElement {
    const ctx = this.ensureContext()

    // Reuse or create foreground element
    if (!this.foregroundElement) {
      this.foregroundElement = new Audio()
      this.foregroundElement.crossOrigin = 'anonymous'
      this.foregroundSourceNode = ctx.createMediaElementSource(this.foregroundElement)
      this.foregroundGainNode = ctx.createGain()
      this.foregroundSourceNode.connect(this.foregroundGainNode)
      this.foregroundGainNode.connect(this.masterGainNode!)
    }

    this.foregroundElement.src = url
    this.foregroundElement.loop = false
    this.foregroundElement.play().catch(() => {
      // Autoplay policy or network error — non-fatal
    })

    return this.foregroundElement
  }

  seekForeground(time: number): void {
    if (this.foregroundElement) {
      this.foregroundElement.currentTime = time
    }
  }

  setForegroundBalance(balance: number): void {
    if (!this.foregroundGainNode || !this.audioContext) return

    this.foregroundGainNode.gain.cancelScheduledValues(this.audioContext.currentTime)
    this.foregroundGainNode.gain.setValueAtTime(this.foregroundGainNode.gain.value, this.audioContext.currentTime)
    this.foregroundGainNode.gain.linearRampToValueAtTime(
      1 - balance,
      this.audioContext.currentTime + AUDIO_CONFIG.VOLUME_RAMP_MS / 1000,
    )
  }

  pauseAll(): void {
    // Suspend context — pauses all AudioBufferSourceNodes
    this.audioContext?.suspend()
    this.foregroundElement?.pause()
  }

  resumeAll(): void {
    this.ensureContext()
    if (this.foregroundElement && this.foregroundElement.src) {
      this.foregroundElement.play().catch(() => {})
    }
  }

  stopAll(): void {
    // Stop and clean up all ambient sounds
    for (const [soundId, entry] of this.soundSources) {
      if (entry.loopTimerId !== null) {
        clearTimeout(entry.loopTimerId)
      }
      if (entry.cleanupTimerId !== null) {
        clearTimeout(entry.cleanupTimerId)
      }
      try {
        entry.sourceNode.stop()
      } catch (_e) {
        // Already stopped
      }
      entry.sourceNode.disconnect()
      entry.gainNode.disconnect()
      this.soundSources.delete(soundId)
    }

    // Stop foreground
    if (this.foregroundElement) {
      this.foregroundElement.pause()
      this.foregroundElement.src = ''
      this.foregroundElement.removeAttribute('src')
    }

    // Suspend audio context (do NOT clear bufferCache — reuse on re-add)
    this.audioContext?.suspend()
  }

  getSoundCount(): number {
    return this.soundSources.size
  }

  getForegroundElement(): HTMLAudioElement | null {
    return this.foregroundElement
  }

  /** Smoothly ramp the foreground gain to 0 over the given duration. */
  crossfadeOutForeground(durationMs: number): void {
    if (!this.foregroundGainNode || !this.audioContext) return
    const ctx = this.audioContext
    const gain = this.foregroundGainNode
    gain.gain.cancelScheduledValues(ctx.currentTime)
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + durationMs / 1000)
  }

  /** Check if a sound's audio data is already cached (no fetch needed). */
  isBufferCached(soundId: string): boolean {
    return this.bufferCache.has(soundId)
  }

  /**
   * Schedule smart fade: foreground fades over first 60% of duration,
   * ambient starts fading at 40% and finishes at 100%.
   * If only one lane is active, simple linear fade over full duration.
   */
  scheduleSleepFade(fadeDurationSec: number, hasForeground: boolean, hasAmbient: boolean): void {
    if (!this.audioContext) return
    const ctx = this.audioContext
    const now = ctx.currentTime

    if (hasForeground && hasAmbient) {
      // Smart fade: foreground 0→60%, ambient 40%→100%
      if (this.foregroundGainNode) {
        const fg = this.foregroundGainNode.gain
        fg.cancelScheduledValues(now)
        fg.setValueAtTime(fg.value, now)
        fg.linearRampToValueAtTime(0, now + fadeDurationSec * 0.6)
      }
      for (const entry of this.soundSources.values()) {
        const g = entry.gainNode.gain
        g.cancelScheduledValues(now)
        g.setValueAtTime(g.value, now)
        // Hold current value until 40%, then fade to 0 by 100%
        g.setValueAtTime(g.value, now + fadeDurationSec * 0.4)
        g.linearRampToValueAtTime(0, now + fadeDurationSec)
      }
    } else if (hasForeground) {
      // Foreground only: linear fade
      if (this.foregroundGainNode) {
        const fg = this.foregroundGainNode.gain
        fg.cancelScheduledValues(now)
        fg.setValueAtTime(fg.value, now)
        fg.linearRampToValueAtTime(0, now + fadeDurationSec)
      }
    } else if (hasAmbient) {
      // Ambient only: linear fade
      for (const entry of this.soundSources.values()) {
        const g = entry.gainNode.gain
        g.cancelScheduledValues(now)
        g.setValueAtTime(g.value, now)
        g.linearRampToValueAtTime(0, now + fadeDurationSec)
      }
    }
  }

  /**
   * Cancel all scheduled fade ramps and freeze gain values at current levels.
   * Returns the current gain values for foreground and all ambient sounds.
   */
  freezeFades(): { foregroundGain: number; ambientGains: Map<string, number> } {
    const ambientGains = new Map<string, number>()
    if (!this.audioContext) return { foregroundGain: 0, ambientGains }

    const ctx = this.audioContext
    const now = ctx.currentTime
    let foregroundGain = 0

    if (this.foregroundGainNode) {
      const fg = this.foregroundGainNode.gain
      foregroundGain = fg.value
      fg.cancelScheduledValues(now)
      fg.setValueAtTime(foregroundGain, now)
    }

    for (const [soundId, entry] of this.soundSources) {
      const g = entry.gainNode.gain
      const currentVal = g.value
      ambientGains.set(soundId, currentVal)
      g.cancelScheduledValues(now)
      g.setValueAtTime(currentVal, now)
    }

    return { foregroundGain, ambientGains }
  }

  /**
   * Resume fades from current gain levels. Reschedules ramps from
   * current values to 0 over the remaining fade time.
   */
  resumeSleepFade(
    remainingFadeMs: number,
    fadeProgress: number,
    hasForeground: boolean,
    hasAmbient: boolean,
  ): void {
    if (!this.audioContext) return
    const ctx = this.audioContext
    const now = ctx.currentTime
    const remainingSec = remainingFadeMs / 1000

    if (hasForeground && hasAmbient) {
      // Smart fade resume: figure out where each lane is in its schedule
      if (this.foregroundGainNode) {
        const fg = this.foregroundGainNode.gain
        fg.cancelScheduledValues(now)
        fg.setValueAtTime(fg.value, now)
        if (fadeProgress < 0.6) {
          // Foreground still fading — ramp to 0 over remaining portion
          const fgRemainingSec = (0.6 - fadeProgress) * (remainingSec / (1 - fadeProgress))
          fg.linearRampToValueAtTime(0, now + Math.max(0.1, fgRemainingSec))
        }
        // If fadeProgress >= 0.6, foreground is already at 0
      }
      for (const entry of this.soundSources.values()) {
        const g = entry.gainNode.gain
        g.cancelScheduledValues(now)
        g.setValueAtTime(g.value, now)
        if (fadeProgress < 0.4) {
          // Ambient hasn't started fading yet — hold, then ramp
          const holdSec = (0.4 - fadeProgress) * (remainingSec / (1 - fadeProgress))
          g.setValueAtTime(g.value, now + holdSec)
          g.linearRampToValueAtTime(0, now + remainingSec)
        } else {
          // Ambient is mid-fade — ramp to 0 over remaining time
          g.linearRampToValueAtTime(0, now + remainingSec)
        }
      }
    } else {
      // Single lane: linear fade over remaining time
      if (hasForeground && this.foregroundGainNode) {
        const fg = this.foregroundGainNode.gain
        fg.cancelScheduledValues(now)
        fg.setValueAtTime(fg.value, now)
        fg.linearRampToValueAtTime(0, now + remainingSec)
      }
      if (hasAmbient) {
        for (const entry of this.soundSources.values()) {
          const g = entry.gainNode.gain
          g.cancelScheduledValues(now)
          g.setValueAtTime(g.value, now)
          g.linearRampToValueAtTime(0, now + remainingSec)
        }
      }
    }
  }

  /**
   * Ramp all ambient GainNodes to their configured (stored) volume
   * over the given duration. Used when foreground ends naturally.
   */
  breatheUpAmbient(durationMs: number): void {
    if (!this.audioContext) return
    const ctx = this.audioContext
    const now = ctx.currentTime

    for (const entry of this.soundSources.values()) {
      const g = entry.gainNode.gain
      g.cancelScheduledValues(now)
      g.setValueAtTime(g.value, now)
      g.linearRampToValueAtTime(entry.volume, now + durationMs / 1000)
    }
  }
}
