export type SoundEffectId = 'chime' | 'ascending' | 'harp' | 'bell' | 'whisper' | 'sparkle'

export const SOUND_VOLUMES: Record<SoundEffectId, number> = {
  chime: 0.3,
  ascending: 0.3,
  harp: 0.3,
  bell: 0.3,
  whisper: 0.15,
  sparkle: 0.1,
}

// Cached white noise buffer for whisper (noise generation is expensive)
let noiseBuffer: AudioBuffer | null = null

function getOrCreateNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer
  const sampleRate = ctx.sampleRate
  const length = sampleRate * 1.5 // 1.5 seconds
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  noiseBuffer = buffer
  return buffer
}

function playChimeSound(ctx: AudioContext, volume: number): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = 528
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.1) // attack 100ms
  gain.gain.setValueAtTime(volume, ctx.currentTime + 0.5) // sustain to 500ms
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5) // decay 1s
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 1.5)
}

function playAscendingSound(ctx: AudioContext, volume: number): void {
  const frequencies = [396, 528, 660]
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const startTime = ctx.currentTime + i * 0.15 // 150ms apart
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.1) // attack 100ms
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.7) // decay 600ms
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(startTime)
    osc.stop(startTime + 0.7)
  })
}

function playHarpSound(ctx: AudioContext, volume: number): void {
  const frequencies = [440, 441] // chorus effect
  frequencies.forEach((freq) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.005) // attack 5ms
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.305) // decay 300ms
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.305)
  })
}

function playBellSound(ctx: AudioContext, volume: number): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = 784
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01) // attack 10ms
  gain.gain.setValueAtTime(volume, ctx.currentTime + 0.21) // sustain 200ms
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.71) // decay 1.5s
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 1.71)
}

function playWhisperSound(ctx: AudioContext, volume: number): void {
  const buffer = getOrCreateNoiseBuffer(ctx)
  const source = ctx.createBufferSource()
  const filter = ctx.createBiquadFilter()
  const gain = ctx.createGain()

  source.buffer = buffer
  filter.type = 'bandpass'
  filter.frequency.value = 800
  filter.Q.value = 2

  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.2) // attack 200ms
  gain.gain.setValueAtTime(volume, ctx.currentTime + 1.0) // sustain 800ms
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5) // decay 500ms

  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  source.start(ctx.currentTime)
  source.stop(ctx.currentTime + 1.5)
}

function playSparkleSound(ctx: AudioContext, volume: number): void {
  const frequencies = [1047, 1319] // simultaneous
  frequencies.forEach((freq) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.005) // attack 5ms
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.105) // decay 100ms
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.105)
  })
}

const SOUND_PLAYERS: Record<SoundEffectId, (ctx: AudioContext, volume: number) => void> = {
  chime: playChimeSound,
  ascending: playAscendingSound,
  harp: playHarpSound,
  bell: playBellSound,
  whisper: playWhisperSound,
  sparkle: playSparkleSound,
}

export function playSound(ctx: AudioContext, soundId: SoundEffectId): void {
  try {
    const volume = SOUND_VOLUMES[soundId]
    const player = SOUND_PLAYERS[soundId]
    if (player) {
      player(ctx, volume)
    }
  } catch (_e) {
    // Fail silently — sound effects are enhancement only
  }
}

// Exported for testing
export function _resetNoiseBufferCache(): void {
  noiseBuffer = null
}
