// Spec 6.2 — wind chime played on Quick Lift completion. Web Audio API,
// synthesized two-oscillator sine waves (C5=523.25 Hz, G5=783.99 Hz) staggered
// 100 ms apart with a 50 ms attack and 1.5 s exponential decay. Gated behind
// the same `wr_sound_effects_enabled` localStorage flag and
// `prefers-reduced-motion` query as the rest of the sound-effects palette.
// Kept in its own module (not added to lib/sound-effects.ts) because the
// chime is feature-specific to Quick Lift, not part of the standard palette.

let cachedContext: AudioContext | null = null;

function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return localStorage.getItem('wr_sound_effects_enabled') !== 'false';
  } catch {
    return false;
  }
}

export function playWindChime(): void {
  if (!isSoundEnabled()) return;
  try {
    if (cachedContext === null) {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      cachedContext = new Ctor();
    }
    const ctx = cachedContext;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const now = ctx.currentTime;
    const notes: Array<{ freq: number; delay: number }> = [
      { freq: 523.25, delay: 0 },
      { freq: 783.99, delay: 0.1 },
    ];
    for (const { freq, delay } of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 1.6);
    }
  } catch {
    // Audio context not allowed yet, or browser without Web Audio — no-op silently.
  }
}
