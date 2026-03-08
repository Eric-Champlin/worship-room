import { AUDIO_CONFIG } from '@/constants/audio'

interface SoundEntry {
  audioElement: HTMLAudioElement
  sourceNode: MediaElementAudioSourceNode
  gainNode: GainNode
}

export class AudioEngineService {
  private audioContext: AudioContext | null = null
  private masterGainNode: GainNode | null = null
  private soundSources = new Map<string, SoundEntry>()
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

  addSound(soundId: string, url: string, volume: number): HTMLAudioElement {
    // Guard: don't re-add existing sound
    if (this.soundSources.has(soundId)) {
      const existing = this.soundSources.get(soundId)!
      this.setSoundVolume(soundId, volume)
      return existing.audioElement
    }

    const ctx = this.ensureContext()
    const audioElement = new Audio(url)
    audioElement.crossOrigin = 'anonymous'
    audioElement.loop = true

    const sourceNode = ctx.createMediaElementSource(audioElement)
    const gainNode = ctx.createGain()

    // Start at 0 and fade in
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(
      volume,
      ctx.currentTime + AUDIO_CONFIG.SOUND_FADE_IN_MS / 1000,
    )

    sourceNode.connect(gainNode)
    gainNode.connect(this.masterGainNode!)

    this.soundSources.set(soundId, { audioElement, sourceNode, gainNode })
    audioElement.play().catch(() => {
      // Autoplay policy or network error — non-fatal
    })

    return audioElement
  }

  removeSound(soundId: string): void {
    const entry = this.soundSources.get(soundId)
    if (!entry) return

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
      entry.audioElement.pause()
      entry.audioElement.src = ''
      entry.audioElement.removeAttribute('src')
      entry.sourceNode.disconnect()
      entry.gainNode.disconnect()
      this.soundSources.delete(soundId)
    }, AUDIO_CONFIG.SOUND_FADE_OUT_MS)
  }

  setSoundVolume(soundId: string, volume: number): void {
    const entry = this.soundSources.get(soundId)
    if (!entry || !this.audioContext) return

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
    // balance 0 = all voice, 1 = all ambient
    // Foreground gain = 1 - balance, ambient sounds stay at their individual volumes
    if (!this.foregroundGainNode || !this.audioContext) return

    this.foregroundGainNode.gain.cancelScheduledValues(this.audioContext.currentTime)
    this.foregroundGainNode.gain.setValueAtTime(this.foregroundGainNode.gain.value, this.audioContext.currentTime)
    this.foregroundGainNode.gain.linearRampToValueAtTime(
      1 - balance,
      this.audioContext.currentTime + AUDIO_CONFIG.VOLUME_RAMP_MS / 1000,
    )
  }

  pauseAll(): void {
    for (const entry of this.soundSources.values()) {
      entry.audioElement.pause()
    }
    this.foregroundElement?.pause()
  }

  resumeAll(): void {
    this.ensureContext()
    for (const entry of this.soundSources.values()) {
      entry.audioElement.play().catch(() => {})
    }
    if (this.foregroundElement && this.foregroundElement.src) {
      this.foregroundElement.play().catch(() => {})
    }
  }

  stopAll(): void {
    // Fade out all sounds and clean up
    for (const [soundId] of this.soundSources) {
      this.removeSound(soundId)
    }

    // Stop foreground
    if (this.foregroundElement) {
      this.foregroundElement.pause()
      this.foregroundElement.src = ''
      this.foregroundElement.removeAttribute('src')
    }

    // Suspend audio context
    this.audioContext?.suspend()
  }

  getSoundCount(): number {
    return this.soundSources.size
  }

  getForegroundElement(): HTMLAudioElement | null {
    return this.foregroundElement
  }
}
